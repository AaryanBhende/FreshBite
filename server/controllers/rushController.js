import pool from '../config/db.js';

export const getRushStatus = async (_req, res) => {
  try {
    const [[{ rush_override: rushOverride }]] = await pool.query(
      "SELECT setting_value AS rush_override FROM app_settings WHERE setting_key = 'rush_override'"
    );
    const [[{ order_count: orderCount }]] = await pool.query(
      `SELECT COUNT(DISTINCT order_id) AS order_count FROM orders
       WHERE completed = 0 AND created_at >= NOW() - INTERVAL 60 MINUTE`
    );
    const count = Number(orderCount);
    const automatic = count < 5
      ? { level: 'Quiet', wait: '10–15 min' }
      : count <= 15
        ? { level: 'Moderate', wait: '20–30 min' }
        : { level: 'Busy/Peak', wait: '45+ min' };
    const override = rushOverride && rushOverride !== 'automatic' ? rushOverride : null;
    const manual = override ? { level: override, wait: override === 'Quiet' ? '10–15 min' : override === 'Moderate' ? '20–30 min' : '45+ min' } : null;
    res.json({ ... (manual || automatic), mode: manual ? 'manual' : 'automatic', orderCount: count, rushOverride: override });
  } catch (error) {
    res.status(500).json({ error: 'Could not load restaurant rush status.' });
  }
};

export const updateRushOverride = async (req, res) => {
  const allowed = ['automatic', 'Quiet', 'Moderate', 'Busy/Peak'];
  const override = req.body.rush_override;
  if (!allowed.includes(override)) return res.status(400).json({ error: 'Choose automatic, Quiet, Moderate, or Busy/Peak.' });
  try {
    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value) VALUES ('rush_override', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [override]
    );
    res.json({ success: true, rush_override: override });
  } catch (error) {
    res.status(500).json({ error: 'Could not update rush override.' });
  }
};
