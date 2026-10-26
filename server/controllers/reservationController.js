import pool from '../config/db.js';

// One-hour reservation blocks, represented by their start time.
export const TIME_SLOTS = Array.from({ length: 13 }, (_, hour) => `${String(hour + 9).padStart(2, '0')}:00`);

/**
 * GET /api/reservations/availability?date=YYYY-MM-DD
 * Returns free table counts and availability status for all one-hour slots on a date.
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
    const [[tableCountRow]] = await pool.query('SELECT COUNT(*) AS total_tables FROM `tables`');
    const totalTables = Number(tableCountRow.total_tables);
    const [rows] = await pool.query(
      `SELECT DISTINCT table_id, time_slot
       FROM reservations
       WHERE reservation_date = ?
         AND table_id IS NOT NULL
         AND status IN ('Pending', 'Confirmed', 'Seated')`,
      [date]
    );

    const slots = TIME_SLOTS.map((slot) => {
      const start = Number(slot.slice(0, 2)) * 60;
      const end = start + 60;
      const reserved = new Set(rows.filter((row) => {
        const [hour, minute] = String(row.time_slot).split(':').map(Number);
        const reservationStart = hour * 60 + minute;
        return reservationStart < end && reservationStart + 60 > start;
      }).map((row) => Number(row.table_id))).size;
      const available = Math.max(0, totalTables - reserved);
      return {
        time_slot: slot,
        reserved,
        available,
        available_tables: available,
        total_tables: totalTables,
        capacity: totalTables,
        is_available: available > 0,
      };
    });

    res.json({
      date,
      capacity: totalTables,
      slots,
    });
  } catch (error) {
    console.error('getAvailability error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/reservations
 * Creates a reservation against one specific table and its capacity.
 */
export const createReservation = async (req, res) => {
  const {
    guest_name,
    guest_email,
    reservation_date,
    time_slot,
    party_size,
    special_requests = '',
    table_id,
  } = req.body;

  // 1. Basic validation
  if (!guest_name || !guest_email || !reservation_date || !time_slot || !party_size || !table_id) {
    return res.status(400).json({
      error: 'guest_name, guest_email, reservation_date, time_slot, party_size, and table_id are required.',
    });
  }

  const cleanName = String(guest_name).trim();
  const cleanEmail = String(guest_email).trim().toLowerCase();
  const numPartySize = Number(party_size);

  if (!Number.isInteger(numPartySize) || numPartySize < 1) {
    return res.status(400).json({
      error: 'Party size must be a positive whole number.',
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservation_date)) {
    return res.status(400).json({ error: 'Invalid reservation_date format (YYYY-MM-DD).' });
  }

  if (!TIME_SLOTS.includes(time_slot)) {
    return res.status(400).json({
      error: 'Invalid time slot. Choose an available one-hour slot.',
    });
  }

  // Prevent past dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (reservation_date < todayStr) {
    return res.status(400).json({ error: 'Cannot book reservations in the past.' });
  }

  const userId = req.user ? req.user.id : null;
  const tableId = table_id === undefined || table_id === null || table_id === '' ? null : Number(table_id);
  if (tableId !== null && (!Number.isInteger(tableId) || tableId < 1)) {
    return res.status(400).json({ error: 'table_id must be a valid table number.' });
  }

  // 2. Transaction with availability check locking the target slot
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (tableId !== null) {
      const [tableRows] = await connection.query(
        'SELECT id, zone, capacity FROM `tables` WHERE id = ? FOR UPDATE',
        [tableId]
      );
      if (!tableRows.length) {
        await connection.rollback();
        return res.status(400).json({ error: 'Selected table does not exist.' });
      }
      const table = tableRows[0];
      if (table.capacity < numPartySize) {
        await connection.rollback();
        return res.status(400).json({ error: `Selected table seats up to ${table.capacity} guests.` });
      }
      const [conflicts] = await connection.query(
        `SELECT id FROM reservations WHERE table_id = ? AND reservation_date = ?
         AND TIME(time_slot) < ADDTIME(TIME(?), '01:00:00')
         AND ADDTIME(TIME(time_slot), '01:00:00') > TIME(?)
         AND status IN ('Pending', 'Confirmed', 'Seated') FOR UPDATE`,
        [tableId, reservation_date, time_slot, time_slot]
      );
      if (conflicts.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'That table was just booked. Please choose another table.' });
      }
    }

    const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const status = 'Confirmed'; // Auto-confirmed after the chosen table is verified.

    await connection.query(
      `INSERT INTO reservations 
       (id, user_id, guest_name, guest_email, reservation_date, time_slot, party_size, seating_pref, special_requests, status, table_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservationId,
        userId,
        cleanName,
        cleanEmail,
        reservation_date,
        time_slot,
        numPartySize,
        'No Preference',
        special_requests ? String(special_requests).trim() : null,
        status,
        tableId,
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
        seating_pref: 'No Preference',
        special_requests,
        status,
        table_id: tableId,
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
 * PUT /api/reservations/:id/cancel
 * Allows an authenticated customer to cancel their own pending/confirmed reservation.
 */
export const cancelUserReservation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      'SELECT id, status FROM reservations WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (!['Pending', 'Confirmed'].includes(rows[0].status)) {
      return res.status(409).json({ error: 'Only pending or confirmed reservations can be cancelled.' });
    }

    const [updateResult] = await pool.query(
      'UPDATE reservations SET status = \'Cancelled\' WHERE id = ? AND user_id = ? AND status IN (\'Pending\', \'Confirmed\')',
      [id, userId]
    );
    if (updateResult.affectedRows === 0) {
      return res.status(409).json({ error: 'This reservation can no longer be cancelled.' });
    }
    const [reservationRows] = await pool.query(
      `SELECT r.*, t.table_number, t.zone AS table_zone
       FROM reservations r LEFT JOIN \`tables\` t ON r.table_id = t.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, userId]
    );
    res.json({ success: true, message: 'Reservation cancelled.', reservation: reservationRows[0] });
  } catch (error) {
    console.error('cancelUserReservation error:', error);
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
      SELECT r.*, t.table_number, t.zone AS table_zone, t.capacity AS table_capacity,
             u.name AS account_name, u.email AS account_email
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN \`tables\` t ON r.table_id = t.id
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

    const [rows] = await pool.query(
      `SELECT r.*, t.table_number, t.zone AS table_zone, t.capacity AS table_capacity
       FROM reservations r LEFT JOIN \`tables\` t ON r.table_id = t.id WHERE r.id = ?`,
      [id]
    );
    res.json({ success: true, message: `Reservation status updated to ${status}.`, reservation: rows[0] });
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
    table_id,
    special_requests = 'Walk-in party',
    status = 'Seated',
  } = req.body;

  if (!reservation_date || !time_slot || !party_size || !table_id) {
    return res.status(400).json({
      error: 'reservation_date, time_slot, party_size, and table_id are required.',
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(reservation_date))) {
    return res.status(400).json({ error: 'Invalid reservation_date format (YYYY-MM-DD).' });
  }

  const numPartySize = Number(party_size);
  if (!Number.isInteger(numPartySize) || numPartySize < 1) {
    return res.status(400).json({ error: 'Party size must be a positive number.' });
  }

  const tableId = Number(table_id);
  if (!Number.isInteger(tableId) || tableId < 1) {
    return res.status(400).json({ error: 'table_id must be a valid table number.' });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time_slot))) {
    return res.status(400).json({ error: 'Invalid walk-in time. Use a valid time in HH:mm format.' });
  }
  const [walkinHour, walkinMinute] = String(time_slot).split(':').map(Number);
  if (walkinHour < 9 || walkinHour > 21 || (walkinHour === 21 && walkinMinute > 0)) {
    return res.status(400).json({ error: 'Walk-in time must be between 09:00 and 21:00.' });
  }
  const todayStr = new Date().toISOString().split('T')[0];
  if (reservation_date < todayStr) {
    return res.status(400).json({ error: 'Cannot record a walk-in for a past date.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [tableRows] = await connection.query(
      'SELECT capacity FROM `tables` WHERE id = ? FOR UPDATE',
      [tableId]
    );
    if (!tableRows.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Selected table does not exist.' });
    }
    if (numPartySize > Number(tableRows[0].capacity)) {
      await connection.rollback();
      return res.status(400).json({ error: `Selected table seats up to ${tableRows[0].capacity} guests.` });
    }
    const [conflicts] = await connection.query(
      `SELECT id FROM reservations WHERE table_id = ? AND reservation_date = ?
       AND TIME(time_slot) < ADDTIME(TIME(?), '01:00:00')
       AND ADDTIME(TIME(time_slot), '01:00:00') > TIME(?)
       AND status IN ('Pending', 'Confirmed', 'Seated') FOR UPDATE`,
      [tableId, reservation_date, time_slot, time_slot]
    );
    if (conflicts.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'That table is already booked for this time slot.' });
    }

    const reservationId = `walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await connection.query(
      `INSERT INTO reservations 
       (id, user_id, guest_name, guest_email, reservation_date, time_slot, party_size, seating_pref, special_requests, status, table_id)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 'No Preference', ?, ?, ?)`,
      [
        reservationId,
        String(guest_name).trim(),
        String(guest_email).trim().toLowerCase(),
        reservation_date,
        time_slot,
        numPartySize,
        special_requests,
        status,
        tableId,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Walk-in party recorded successfully!',
      reservation_id: reservationId,
      table_id: tableId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('createWalkInReservation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
