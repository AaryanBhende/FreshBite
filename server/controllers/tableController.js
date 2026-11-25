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
  if (!timeSlot || !/^([01]\d|2[0-3]):00$/.test(timeSlot) || Number(timeSlot.slice(0, 2)) < 9 || Number(timeSlot.slice(0, 2)) > 21) {
    return res.status(400).json({ error: 'Query parameter time_slot must be an hourly start time from 09:00 to 21:00.' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.table_number, t.zone, t.capacity,
              r.reservation_id, r.guest_name, r.reservation_time,
              CASE WHEN r.has_occupied = 1 THEN 'Occupied'
                   WHEN r.reservation_id IS NOT NULL THEN 'Booked' ELSE 'Free' END AS table_status
       FROM \`tables\` t
       LEFT JOIN (
         SELECT table_id, MAX(reservation_id) AS reservation_id, MAX(guest_name) AS guest_name,
                MAX(time_slot) AS reservation_time,
                MAX(status = 'Seated') AS has_occupied
         FROM (
           SELECT r.id AS reservation_id, r.table_id, r.guest_name, r.time_slot, r.status
           FROM reservations r WHERE r.table_id IS NOT NULL AND r.reservation_date = ?
             AND TIME(r.time_slot) < ADDTIME(TIME(?), '01:00:00') AND ADDTIME(TIME(r.time_slot), '01:00:00') > TIME(?)
             AND r.status IN ('Pending', 'Confirmed', 'Seated')
           UNION ALL
           SELECT r.id, rt.table_id, r.guest_name, r.time_slot, r.status
           FROM reservations r JOIN reservation_tables rt ON rt.reservation_id = r.id
           WHERE r.reservation_date = ? AND TIME(r.time_slot) < ADDTIME(TIME(?), '01:00:00')
             AND ADDTIME(TIME(r.time_slot), '01:00:00') > TIME(?) AND r.status IN ('Pending', 'Confirmed', 'Seated')
         ) assigned
         GROUP BY table_id
       ) r ON r.table_id = t.id
       ORDER BY FIELD(t.zone, 'Indoor', 'Patio', 'Bar'), t.id`,
      [date, timeSlot, timeSlot, date, timeSlot, timeSlot]
    );
    res.json({ date, time_slot: timeSlot, tables: rows });
  } catch (error) {
    console.error('getTableAvailability error:', error);
    res.status(500).json({ error: error.message });
  }
};
