import pool from '../config/db.js';

export const getTables = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, table_number, zone, capacity FROM `tables` ORDER BY FIELD(zone, \'Indoor\', \'Patio\', \'Bar\'), id'
    );
    res.json({ tables: rows });
  } catch (error) {
    console.error('getTables error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTableAvailability = async (req, res) => {
  const { date, time_slot: timeSlot } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Query parameter date must use YYYY-MM-DD.' });
  }
  const duration = Number(req.query.duration_hours || 1);
  if (!timeSlot || !/^([01]\d|2[0-3]):00$/.test(timeSlot) || Number(timeSlot.slice(0, 2)) < 9 || Number(timeSlot.slice(0, 2)) > 21) {
    return res.status(400).json({ error: 'Query parameter time_slot must be an hourly start time from 09:00 to 21:00.' });
  }
  const startHour = Number(timeSlot.slice(0, 2));
  if (!Number.isInteger(duration) || duration < 1 || duration > 13 || startHour + duration > 22) {
    return res.status(400).json({ error: 'duration_hours must be a positive whole number that ends by 22:00.' });
  }
  const start = timeSlot;
  const end = `${String(startHour + duration).padStart(2, '0')}:00`;
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.table_number, t.zone, t.capacity,
              r.reservation_id, r.guest_name, r.reservation_time, r.reservation_end_time,
              CASE WHEN r.has_occupied = 1 THEN 'Occupied'
                   WHEN r.reservation_id IS NOT NULL THEN 'Booked' ELSE 'Free' END AS table_status
       FROM \`tables\` t
       LEFT JOIN (
         SELECT table_id, MAX(reservation_id) AS reservation_id, MAX(guest_name) AS guest_name,
                MAX(COALESCE(start_time, TIME(time_slot))) AS reservation_time,
                MAX(COALESCE(end_time, ADDTIME(TIME(time_slot), '01:00:00'))) AS reservation_end_time,
                MAX(status = 'Seated') AS has_occupied
         FROM (
           SELECT r.id AS reservation_id, r.table_id, r.guest_name, r.time_slot, r.start_time, r.end_time, r.status
           FROM reservations r WHERE r.table_id IS NOT NULL AND r.reservation_date = ?
             AND COALESCE(r.start_time, TIME(r.time_slot)) < TIME(?) AND COALESCE(r.end_time, ADDTIME(TIME(r.time_slot), '01:00:00')) > TIME(?)
             AND r.status IN ('Pending', 'Confirmed', 'Seated')
           UNION ALL
           SELECT r.id, rt.table_id, r.guest_name, r.time_slot, r.start_time, r.end_time, r.status
           FROM reservations r JOIN reservation_tables rt ON rt.reservation_id = r.id
           WHERE r.reservation_date = ? AND COALESCE(r.start_time, TIME(r.time_slot)) < TIME(?)
             AND COALESCE(r.end_time, ADDTIME(TIME(r.time_slot), '01:00:00')) > TIME(?) AND r.status IN ('Pending', 'Confirmed', 'Seated')
         ) assigned
         GROUP BY table_id
       ) r ON r.table_id = t.id
       ORDER BY FIELD(t.zone, 'Indoor', 'Patio', 'Bar'), t.id`,
      [date, end, start, date, end, start]
    );
    res.json({ date, time_slot: timeSlot, duration_hours: duration, start_time: start, end_time: end, tables: rows });
  } catch (error) {
    console.error('getTableAvailability error:', error);
    res.status(500).json({ error: error.message });
  }
};
