import pool from '../config/db.js';

// Total cafe capacity per 30-min time slot
export const CAFE_CAPACITY_LIMIT = 40;

// Valid operational 30-minute time slots (09:00 to 21:30)
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30'
];

/**
 * GET /api/reservations/availability?date=YYYY-MM-DD
 * Returns remaining seats and availability status for all 30-min time slots on a given date.
 */
export const getAvailability = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Query parameter date (YYYY-MM-DD) is required.' });
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  try {
    // Query sum of party sizes per slot for active statuses (Pending, Confirmed, Seated)
    const [rows] = await pool.query(
      `SELECT time_slot, COALESCE(SUM(party_size), 0) AS total_reserved
       FROM reservations
       WHERE reservation_date = ?
         AND status IN ('Pending', 'Confirmed', 'Seated')
       GROUP BY time_slot`,
      [date]
    );

    const slotMap = new Map();
    for (const row of rows) {
      slotMap.set(row.time_slot, Number(row.total_reserved));
    }

    const slots = TIME_SLOTS.map((slot) => {
      const reserved = slotMap.get(slot) || 0;
      const available = Math.max(0, CAFE_CAPACITY_LIMIT - reserved);
      return {
        time_slot: slot,
        reserved,
        available,
        capacity: CAFE_CAPACITY_LIMIT,
        is_available: available > 0,
      };
    });

    res.json({
      date,
      capacity: CAFE_CAPACITY_LIMIT,
      slots,
    });
  } catch (error) {
    console.error('getAvailability error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/reservations
 * Creates a new reservation after validating availability against cafe capacity constraint.
 */
export const createReservation = async (req, res) => {
  const {
    guest_name,
    guest_email,
    reservation_date,
    time_slot,
    party_size,
    seating_pref = 'No Preference',
    special_requests = '',
  } = req.body;

  // 1. Basic validation
  if (!guest_name || !guest_email || !reservation_date || !time_slot || !party_size) {
    return res.status(400).json({
      error: 'guest_name, guest_email, reservation_date, time_slot, and party_size are required.',
    });
  }

  const cleanName = String(guest_name).trim();
  const cleanEmail = String(guest_email).trim().toLowerCase();
  const numPartySize = parseInt(party_size, 10);

  if (isNaN(numPartySize) || numPartySize < 1 || numPartySize > 20) {
    return res.status(400).json({
      error: 'Party size must be between 1 and 20 guests.',
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservation_date)) {
    return res.status(400).json({ error: 'Invalid reservation_date format (YYYY-MM-DD).' });
  }

  if (!TIME_SLOTS.includes(time_slot)) {
    return res.status(400).json({
      error: `Invalid time slot. Allowed slots (30-min intervals) from 09:00 to 21:30.`,
    });
  }

  // Prevent past dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (reservation_date < todayStr) {
    return res.status(400).json({ error: 'Cannot book reservations in the past.' });
  }

  const validSeating = ['Indoor', 'Outdoor', 'Bar', 'No Preference'];
  const cleanSeating = validSeating.includes(seating_pref) ? seating_pref : 'No Preference';

  const userId = req.user ? req.user.id : null;

  // 2. Transaction with availability check locking the target slot
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Query sum of party sizes with FOR UPDATE to prevent race condition overbooking
    const [checkRows] = await connection.query(
      `SELECT COALESCE(SUM(party_size), 0) AS current_reserved
       FROM reservations
       WHERE reservation_date = ?
         AND time_slot = ?
         AND status IN ('Pending', 'Confirmed', 'Seated')
       FOR UPDATE`,
      [reservation_date, time_slot]
    );

    const currentReserved = Number(checkRows[0].current_reserved);
    const available = CAFE_CAPACITY_LIMIT - currentReserved;

    if (currentReserved + numPartySize > CAFE_CAPACITY_LIMIT) {
      await connection.rollback();
      return res.status(409).json({
        error: `Capacity exceeded for ${time_slot} on ${reservation_date}. Only ${available} seat(s) remaining (requested ${numPartySize}).`,
        available,
        requested: numPartySize,
      });
    }

    const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const status = 'Confirmed'; // Auto-confirmed when capacity check succeeds

    await connection.query(
      `INSERT INTO reservations 
       (id, user_id, guest_name, guest_email, reservation_date, time_slot, party_size, seating_pref, special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservationId,
        userId,
        cleanName,
        cleanEmail,
        reservation_date,
        time_slot,
        numPartySize,
        cleanSeating,
        special_requests ? String(special_requests).trim() : null,
        status,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Reservation booked successfully!',
      reservation: {
        id: reservationId,
        user_id: userId,
        guest_name: cleanName,
        guest_email: cleanEmail,
        reservation_date,
        time_slot,
        party_size: numPartySize,
        seating_pref: cleanSeating,
        special_requests,
        status,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('createReservation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/reservations/user
 * Returns list of reservations for the logged-in user.
 */
export const getUserReservations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM reservations
       WHERE user_id = ?
       ORDER BY reservation_date DESC, time_slot DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('getUserReservations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/reservations/admin (Admin only)
 * Filter by date (optional), status (optional), search text (guest_name or email).
 */
export const getAdminReservations = async (req, res) => {
  const { date, status, search } = req.query;

  try {
    let sql = `
      SELECT r.*, u.name AS account_name, u.email AS account_email
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND r.reservation_date = ?';
      params.push(date);
    }

    if (status && status !== 'All') {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ' AND (r.guest_name LIKE ? OR r.guest_email LIKE ? OR r.id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY r.reservation_date DESC, r.time_slot ASC, r.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('getAdminReservations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/reservations/admin/:id/status (Admin only)
 * Updates reservation status (Pending, Confirmed, Seated, Completed, Cancelled).
 */
export const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  try {
    const [result] = await pool.query(
      'UPDATE reservations SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    res.json({ success: true, message: `Reservation status updated to ${status}.` });
  } catch (error) {
    console.error('updateReservationStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/reservations/admin/walkin (Admin only)
 * Manually records a walk-in party directly as 'Seated' or 'Confirmed'.
 */
export const createWalkInReservation = async (req, res) => {
  const {
    guest_name = 'Walk-in Guest',
    guest_email = 'walkin@freshbite.cafe',
    reservation_date,
    time_slot,
    party_size,
    seating_pref = 'No Preference',
    special_requests = 'Walk-in party',
    status = 'Seated',
  } = req.body;

  if (!reservation_date || !time_slot || !party_size) {
    return res.status(400).json({
      error: 'reservation_date, time_slot, and party_size are required.',
    });
  }

  const numPartySize = parseInt(party_size, 10);
  if (isNaN(numPartySize) || numPartySize < 1) {
    return res.status(400).json({ error: 'Party size must be a positive number.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check capacity for walk-in too
    const [checkRows] = await connection.query(
      `SELECT COALESCE(SUM(party_size), 0) AS current_reserved
       FROM reservations
       WHERE reservation_date = ?
         AND time_slot = ?
         AND status IN ('Pending', 'Confirmed', 'Seated')
       FOR UPDATE`,
      [reservation_date, time_slot]
    );

    const currentReserved = Number(checkRows[0].current_reserved);
    const available = CAFE_CAPACITY_LIMIT - currentReserved;

    if (currentReserved + numPartySize > CAFE_CAPACITY_LIMIT) {
      await connection.rollback();
      return res.status(409).json({
        error: `Cafe at capacity for ${time_slot} on ${reservation_date}. Only ${available} seat(s) remaining (walk-in needs ${numPartySize}).`,
        available,
      });
    }

    const reservationId = `walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await connection.query(
      `INSERT INTO reservations 
       (id, user_id, guest_name, guest_email, reservation_date, time_slot, party_size, seating_pref, special_requests, status)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservationId,
        String(guest_name).trim(),
        String(guest_email).trim().toLowerCase(),
        reservation_date,
        time_slot,
        numPartySize,
        seating_pref,
        special_requests,
        status,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Walk-in party recorded successfully!',
      reservation_id: reservationId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('createWalkInReservation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
