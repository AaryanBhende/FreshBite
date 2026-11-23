import pool from '../config/db.js';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const CAFE_LOCATION = { lat: 15.4800, lng: 73.8080 };
const toRadians = (degrees) => degrees * Math.PI / 180;

function calculateDeliveryFee(coordinates) {
  if (typeof coordinates !== 'string') return null;
  const [lat, lng] = coordinates.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const deltaLat = toRadians(lat - CAFE_LOCATION.lat);
  const deltaLng = toRadians(lng - CAFE_LOCATION.lng);
  const rawA = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(CAFE_LOCATION.lat)) * Math.cos(toRadians(lat)) * Math.sin(deltaLng / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((30 + Math.max(0, distanceKm - 3) * 5).toFixed(2));
}

// GET a page of complete order groups with customer, driver, and failure metadata
export const getOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const [[countRow]] = await pool.query(`
      SELECT COUNT(DISTINCT order_id) AS total,
        COUNT(DISTINCT CASE WHEN delivery_status = 'failed' AND delivery_failure_read_at IS NULL THEN order_id END) AS unread_failure_count
      FROM orders
    `);
    const [orderGroups] = await pool.query(`
      SELECT order_id, MAX(created_at) AS latest_created_at
      FROM orders
      GROUP BY order_id
      ORDER BY latest_created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    const orderIds = orderGroups.map((group) => group.order_id);
    let rows = [];
    if (orderIds.length) {
      const placeholders = orderIds.map(() => '?').join(', ');
      const [orderRows] = await pool.query(`
      SELECT orders.*, users.name AS username, driver.name AS driver_name, \`tables\`.table_number, \`tables\`.zone AS table_zone
      FROM orders
      LEFT JOIN users ON orders.user_id = users.id
      LEFT JOIN users driver ON orders.driver_id = driver.id
      LEFT JOIN \`tables\` ON orders.table_id = \`tables\`.id
      WHERE orders.order_id IN (${placeholders})
      ORDER BY orders.created_at DESC
      `, orderIds);
      rows = orderRows.map(({ delivery_otp_hash, delivery_otp_expires_at, delivery_otp_attempts, ...safeRow }) => {
        if (safeRow.order_type === 'Dine In' && safeRow.kitchen_status === 'ready') {
          safeRow.completed = 1;
        }
        return safeRow;
      });
    }
    const total = Number(countRow?.total || 0);
    res.json({
      orders: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: offset + orderGroups.length < total },
      unreadFailureCount: Number(countRow?.unread_failure_count || 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markDeliveryFailureRead = async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE orders SET delivery_failure_read_at = CURRENT_TIMESTAMP WHERE order_id = ? AND delivery_status = 'failed' AND delivery_failure_read_at IS NULL",
      [req.params.orderId]
    );
    if (!result.affectedRows) {
      const [[order]] = await pool.query("SELECT order_id FROM orders WHERE order_id = ? AND delivery_status = 'failed' LIMIT 1", [req.params.orderId]);
      if (!order) return res.status(404).json({ error: 'Failed delivery not found.' });
    }
    res.json({ success: true, read: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const markDeliveryPickedUp = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT order_type, kitchen_status, delivery_status, completed FROM orders WHERE order_id = ? FOR UPDATE', [req.params.orderId]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Order not found.' }); }
    const order = rows[0];
    if (!['Delivery', 'Takeout'].includes(order.order_type)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Pickup confirmation is only available for delivery or takeout orders.' });
    }
    if (order.kitchen_status !== 'ready') {
      await connection.rollback();
      return res.status(409).json({ error: 'The kitchen must mark this order ready before pickup.' });
    }
    if (order.order_type === 'Takeout') {
      if (order.completed) {
        await connection.rollback();
        return res.json({ message: 'Takeout pickup was already confirmed.', status: 'completed' });
      }
      await connection.query('UPDATE orders SET completed = 1 WHERE order_id = ?', [req.params.orderId]);
      await connection.commit();
      return res.json({ message: 'Takeout pickup confirmed.', status: 'completed' });
    }
    if (order.delivery_status === 'picked_up') { await connection.rollback(); return res.json({ message: 'Pickup was already confirmed.', status: 'picked_up' }); }
    if (order.delivery_status !== 'accepted') { await connection.rollback(); return res.status(409).json({ error: 'The assigned driver must accept this delivery before pickup can be confirmed.' }); }
    await connection.query("UPDATE orders SET delivery_status = 'picked_up' WHERE order_id = ?", [req.params.orderId]);
    await connection.commit();
    res.json({ message: 'Driver pickup confirmed.', status: 'picked_up' });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: error.message }); }
  finally { connection.release(); }
};

export const getDriverOrders = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT o.order_id, o.order_type, o.address, o.coordinates, o.delivery_status, o.delivery_failure_reason, o.delivery_otp_expires_at,
      o.created_at, u.name AS customer_name, o.title, o.quantity, o.notes
      FROM orders o LEFT JOIN users u ON u.id = o.user_id
      WHERE o.driver_id = ? AND o.delivery_status IN ('assigned', 'accepted', 'picked_up', 'awaiting_otp') ORDER BY o.created_at`, [req.user.id]);
    const groups = new Map();
    rows.forEach(row => {
      if (!groups.has(row.order_id)) groups.set(row.order_id, { ...row, items: [] });
      groups.get(row.order_id).items.push({ title: row.title, quantity: row.quantity, notes: row.notes });
    });
    res.json([...groups.values()]);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const hashDeliveryOtp = (otp) => createHmac('sha256', process.env.DELIVERY_OTP_SECRET || process.env.JWT_SECRET || 'freshbite_secret_key_123').update(otp).digest();

export const generateDeliveryOtp = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT delivery_status FROM orders WHERE order_id = ? AND driver_id = ? FOR UPDATE', [req.params.orderId, req.user.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Assigned delivery not found.' }); }
    if (!['picked_up', 'awaiting_otp'].includes(rows[0].delivery_status)) {
      await connection.rollback();
      return res.status(409).json({ error: 'Confirm pickup before generating a delivery verification code.' });
    }
    const otp = String(randomInt(0, 10000)).padStart(4, '0');
    await connection.query("UPDATE orders SET delivery_status = 'awaiting_otp', delivery_otp_hash = ?, delivery_otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE), delivery_otp_attempts = 0 WHERE order_id = ? AND driver_id = ?", [hashDeliveryOtp(otp), req.params.orderId, req.user.id]);
    const [[expiry]] = await connection.query('SELECT delivery_otp_expires_at FROM orders WHERE order_id = ? LIMIT 1', [req.params.orderId]);
    await connection.commit();
    res.json({ message: 'Delivery verification code generated. Share it with the customer.', otp, expires_at: expiry.delivery_otp_expires_at });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: error.message }); }
  finally { connection.release(); }
};

export const verifyDeliveryOtp = async (req, res) => {
  const otp = String(req.body?.otp || '');
  if (!/^\d{4}$/.test(otp)) return res.status(400).json({ error: 'Enter the four-digit delivery verification code.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT delivery_otp_hash, delivery_otp_attempts, delivery_otp_expires_at > NOW() AS otp_is_valid FROM orders WHERE order_id = ? AND user_id = ? AND order_type = \'Delivery\' FOR UPDATE', [req.params.orderId, req.user.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Delivery order not found.' }); }
    const order = rows[0];
    if (!order.delivery_otp_hash) { await connection.rollback(); return res.status(409).json({ error: 'No active verification code. Ask your driver to generate or regenerate one.' }); }
    if (!order.otp_is_valid) { await connection.rollback(); return res.status(410).json({ error: 'This verification code has expired. Ask your driver to regenerate it.' }); }
    if (Number(order.delivery_otp_attempts) >= 5) { await connection.rollback(); return res.status(429).json({ error: 'Too many incorrect attempts. Ask your driver to generate a new code.' }); }
    const storedHash = Buffer.from(order.delivery_otp_hash);
    if (storedHash.length !== 32 || !timingSafeEqual(storedHash, hashDeliveryOtp(otp))) {
      const attempts = Number(order.delivery_otp_attempts) + 1;
      await connection.query('UPDATE orders SET delivery_otp_attempts = ?, delivery_otp_hash = IF(? >= 5, NULL, delivery_otp_hash), delivery_otp_expires_at = IF(? >= 5, NULL, delivery_otp_expires_at) WHERE order_id = ? AND user_id = ?', [attempts, attempts, attempts, req.params.orderId, req.user.id]);
      await connection.commit();
      return res.status(attempts >= 5 ? 429 : 400).json({ error: attempts >= 5 ? 'Too many incorrect attempts. Ask your driver to generate a new code.' : 'That verification code is incorrect.' });
    }
    await connection.query("UPDATE orders SET delivery_status = 'delivered', completed = 1, delivery_otp_hash = NULL, delivery_otp_expires_at = NULL, delivery_otp_attempts = 0 WHERE order_id = ? AND user_id = ?", [req.params.orderId, req.user.id]);
    await connection.commit();
    res.json({ message: 'Delivery confirmed. Thank you!', status: 'delivered' });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: error.message }); }
  finally { connection.release(); }
};

export const getDriverAnalytics = async (req, res) => {
  try {
    const driverId = req.user.id;
    const [[summaryRows], [daily], [weekly]] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT order_id) AS completed_deliveries,
        COALESCE(SUM(delivery_fee + tip_amount), 0) AS total_earnings,
        COALESCE(SUM(delivery_fee), 0) AS total_delivery_fees,
        COALESCE(SUM(tip_amount), 0) AS total_tips
        FROM orders WHERE driver_id = ? AND delivery_status = 'delivered'`, [driverId]),
      pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        COUNT(DISTINCT order_id) AS deliveries,
        COALESCE(SUM(delivery_fee + tip_amount), 0) AS earnings
        FROM orders WHERE driver_id = ? AND delivery_status = 'delivered'
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY DATE_FORMAT(created_at, '%Y-%m-%d')`, [driverId]),
      pool.query(`SELECT YEARWEEK(created_at, 3) AS week_key,
        DATE_FORMAT(MIN(DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY)), '%Y-%m-%d') AS week_start,
        COUNT(DISTINCT order_id) AS deliveries,
        COALESCE(SUM(delivery_fee + tip_amount), 0) AS earnings
        FROM orders WHERE driver_id = ? AND delivery_status = 'delivered'
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 WEEK)
        GROUP BY YEARWEEK(created_at, 3) ORDER BY week_key`, [driverId]),
    ]);
    const summary = summaryRows[0];
    const completedDeliveries = Number(summary.completed_deliveries) || 0;
    const totalTips = Number(summary.total_tips) || 0;
    res.json({
      total_completed_deliveries: completedDeliveries,
      total_earnings: Number(summary.total_earnings) || 0,
      total_delivery_fees: Number(summary.total_delivery_fees) || 0,
      total_tips: totalTips,
      average_tip: completedDeliveries ? totalTips / completedDeliveries : 0,
      daily: daily.map((row) => ({ date: row.date, deliveries: Number(row.deliveries), earnings: Number(row.earnings) })),
      weekly: weekly.map((row) => ({ week_start: row.week_start, deliveries: Number(row.deliveries), earnings: Number(row.earnings) })),
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const updateDriverDelivery = async (req, res) => {
  const { status, reason = '', details = '' } = req.body;
  const failureTags = ['Customer not available', 'Missing/destroyed one or more item', 'Wrong order'];
  if (!['accepted', 'failed'].includes(status)) return res.status(400).json({ error: 'Delivery completion requires customer OTP verification.' });
  if (status === 'failed' && !failureTags.includes(String(reason))) return res.status(400).json({ error: 'Select a valid delivery failure reason.' });
  if (typeof details !== 'string' || details.length > 2000) return res.status(400).json({ error: 'Failure details must be 2000 characters or fewer.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, delivery_status FROM orders WHERE order_id = ? AND driver_id = ? FOR UPDATE', [req.params.orderId, req.user.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Assigned delivery not found.' }); }
    const current = rows[0].delivery_status;
    if (status === 'accepted' && current !== 'assigned') { await connection.rollback(); return res.status(409).json({ error: 'This delivery is no longer awaiting acceptance.' }); }
    if (status === 'failed' && !['picked_up', 'awaiting_otp'].includes(current)) { await connection.rollback(); return res.status(409).json({ error: 'Admin pickup confirmation is required before reporting a delivery failure.' }); }
    await connection.query('UPDATE orders SET delivery_status = ?, delivery_failure_reason = ?, delivery_failure_details = ?, delivery_failure_read_at = NULL, delivery_otp_hash = NULL, delivery_otp_expires_at = NULL, delivery_otp_attempts = 0, completed = 0 WHERE order_id = ? AND driver_id = ?', [status, status === 'failed' ? String(reason) : null, status === 'failed' ? details.trim() || null : null, req.params.orderId, req.user.id]);
    await connection.commit();
    res.json({ message: 'Delivery status updated.', status });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: error.message }); }
  finally { connection.release(); }
};

// CREATE order(s) - Optimized for <200ms response time
export const createOrder = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body.items || [req.body]);
  const orderUserId = req.user?.id || null;
  const promotionCode = Array.isArray(req.body) ? '' : String(req.body.promo_code || req.body.promotion_code || '').trim().toUpperCase();
  const tipPercent = Array.isArray(req.body) ? 0 : Number(req.body.tip_percent || 0);

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items array cannot be empty.' });
  }
  if (![0, 10, 20].includes(tipPercent)) return res.status(400).json({ error: 'Tip must be 0%, 10%, or 20%.' });
  const isDeliveryOrder = String(items[0]?.order_type || '').toLowerCase() === 'delivery';
  const foodSubtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  if (!Number.isFinite(foodSubtotal) || foodSubtotal < 0) return res.status(400).json({ error: 'Order total is invalid.' });
  const deliveryFee = isDeliveryOrder ? calculateDeliveryFee(items[0]?.coordinates) : 0;
  if (isDeliveryOrder && deliveryFee == null) return res.status(400).json({ error: 'A valid delivery destination is required.' });
  const tipAmount = isDeliveryOrder ? Number((foodSubtotal * tipPercent / 100).toFixed(2)) : 0;
  if (!Array.isArray(req.body) && req.body.tip_amount != null &&
      (!Number.isFinite(Number(req.body.tip_amount)) || Math.abs(Number(req.body.tip_amount) - tipAmount) > 0.01)) {
    return res.status(400).json({ error: 'Tip amount does not match the selected tip percentage.' });
  }

  // 1. Acquire dedicated connection from pool
  const connection = await pool.getConnection();
  let appliedDiscount = 0;

  try {
    // 2. Begin transaction
    await connection.beginTransaction();

    const menuIds = [...new Set(items.map(item => item.menu_item_id || item.menuItemId).filter(Boolean))];
    const menuTitles = [...new Set(items.filter(item => !item.menu_item_id && !item.menuItemId).map(item => item.title).filter(Boolean))];
    if (menuIds.length || menuTitles.length) {
      const clauses = [];
      const params = [];
      if (menuIds.length) { clauses.push('id IN (?)'); params.push(menuIds); }
      if (menuTitles.length) { clauses.push('title IN (?)'); params.push(menuTitles); }
      const [unavailable] = await connection.query(`SELECT id FROM menu_items WHERE is_available = 0 AND (${clauses.join(' OR ')})`, params);
      if (unavailable.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'One or more items are currently sold out. Please update your order.' });
      }
    }

    // 3. Construct matrix for MySQL multi-row insert [ [col1, col2, ...], [col1, col2, ...] ]
    const values = items.map((item, index) => [
      item.id,
      item.order_id,
      orderUserId,
      item.title,
      item.category || 'None',
      item.price,
      item.quantity || 1,
      item.notes || '',
      item.completed ? 1 : 0,
      item.order_type || 'Dine In',
      item.address || null,
      item.coordinates || null,
      item.table_id || null,
      index === 0 ? deliveryFee : 0,
      index === 0 ? tipAmount : 0,
    ]);

    const selectedTableIds = [...new Set(items.map((item) => item.table_id).filter(Boolean).map(Number))];
    if (selectedTableIds.some((id) => !Number.isInteger(id) || id < 1)) {
      await connection.rollback();
      return res.status(400).json({ error: 'table_id must be a valid table ID.' });
    }
    if (selectedTableIds.length > 1) {
      await connection.rollback();
      return res.status(400).json({ error: 'All items in an order must use the same table.' });
    }
    if (selectedTableIds.length) {
      const [tables] = await connection.query(
        'SELECT id FROM `tables` WHERE id IN (?)',
        [selectedTableIds]
      );
      if (tables.length !== selectedTableIds.length) {
        await connection.rollback();
        return res.status(400).json({ error: 'Selected table does not exist.' });
      }
    }

    // 4. Execute single bulk-insert query (1 network round-trip ~10-30ms)
    const sql = `
      INSERT INTO orders 
      (id, order_id, user_id, title, category, price, quantity, notes, completed, order_type, address, coordinates, table_id, delivery_fee, tip_amount)
      VALUES ?
    `;

    await connection.query(sql, [values]);

    if (isDeliveryOrder) {
      // Lock driver rows in a stable order so simultaneous checkouts do not assign one driver twice.
      const [drivers] = await connection.query("SELECT id FROM users WHERE role = 'driver' ORDER BY id FOR UPDATE");
      let assignedDriverId = null;
      for (const driver of drivers) {
        const [activeOrders] = await connection.query(
          "SELECT id FROM orders WHERE driver_id = ? AND delivery_status IN ('assigned', 'accepted', 'picked_up', 'awaiting_otp') LIMIT 1 FOR UPDATE",
          [driver.id]
        );
        if (!activeOrders.length) { assignedDriverId = driver.id; break; }
      }
      if (!assignedDriverId) {
        await connection.rollback();
        return res.status(409).json({ error: 'No delivery drivers are currently available. Please try again shortly.' });
      }
      await connection.query(
        "UPDATE orders SET driver_id = ?, delivery_status = 'assigned' WHERE order_id = ?",
        [assignedDriverId, items[0].order_id]
      );
    }

    if (promotionCode) {
      const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
      const [promotions] = await connection.query(
        `SELECT id, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, times_used
         FROM promotions
         WHERE code = ? AND is_active = 1 AND is_deleted = 0
           AND (start_date IS NULL OR start_date <= CURRENT_DATE())
           AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE())
         FOR UPDATE`,
        [promotionCode]
      );
      const promotion = promotions[0];
      if (!promotion || subtotal < Number(promotion.min_order_amount) ||
          (promotion.usage_limit != null && Number(promotion.times_used) >= Number(promotion.usage_limit))) {
        await connection.rollback();
        return res.status(400).json({ error: 'Promotion is invalid, expired, unavailable, or the minimum order was not met.' });
      }
      const userId = orderUserId;
      if (userId) {
        const [uses] = await connection.query(
          'SELECT 1 FROM order_promotions WHERE promotion_id = ? AND user_id = ? LIMIT 1',
          [promotion.id, userId]
        );
        if (uses.length) {
          await connection.rollback();
          return res.status(400).json({ error: 'You have already used this promotion.' });
        }
      }
      const rawDiscount = promotion.discount_type === 'percentage'
        ? subtotal * Number(promotion.discount_value) / 100
        : Number(promotion.discount_value);
      const discount = Math.min(subtotal, rawDiscount,
        promotion.max_discount_amount == null ? subtotal : Number(promotion.max_discount_amount));
      appliedDiscount = Number(discount.toFixed(2));
      await connection.query(
        'INSERT INTO order_promotions (order_id, promotion_id, user_id, promotion_code, discount_amount) VALUES (?, ?, ?, ?, ?)',
        [items[0].order_id, promotion.id, userId, promotionCode, discount.toFixed(2)]
      );
      await connection.query('UPDATE promotions SET times_used = times_used + 1 WHERE id = ?', [promotion.id]);
    }

    // 5. Commit atomic transaction
    await connection.commit();

    // 6. Return response immediately to client (<50ms total execution time)
    res.status(201).json({
      success: true,
      message: 'Orders created successfully',
      order_id: items[0].order_id,
      delivery_fee: deliveryFee,
      tip_amount: tipAmount,
      total: Number((foodSubtotal - appliedDiscount + deliveryFee + tipAmount).toFixed(2)),
    });

    // 7. Non-blocking post-processing (emails, webhooks, or push notifications)
    setImmediate(() => {
      // Post-creation tasks execute asynchronously after response is sent
    });
  } catch (error) {
    // Rollback all inserts on failure
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    // Release connection back to pool
    connection.release();
  }
};

// UPDATE order by ID
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const {
    order_id,
    user_id,
    title,
    category,
    price,
    quantity,
    notes,
    completed,
    order_type,
    address,
    coordinates,
    table_id,
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT order_type, kitchen_status FROM orders WHERE id = ?', [id]);
    if (existing[0]?.order_type === 'Delivery') {
      return res.status(400).json({ error: 'Delivery orders must be assigned and completed through the driver workflow.' });
    }
    const computedCompleted = existing[0]?.order_type !== 'Delivery'
      ? (existing[0]?.kitchen_status === 'ready' ? 1 : 0)
      : (completed ? 1 : 0);
    await pool.query(
      `UPDATE orders 
       SET order_id=?, user_id=?, title=?, category=?, price=?, quantity=?, notes=?, completed=?, order_type=?, address=?, coordinates=?, table_id=?
       WHERE id=?`,
      [
        order_id,
        user_id || null,
        title,
        category || 'None',
        price,
        quantity,
        notes || '',
        computedCompleted,
        order_type || 'Dine In',
        address || null,
        coordinates || null,
        table_id || null,
        id,
      ]
    );
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE order by ID
export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM orders WHERE id=?', [id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/orders/user — returns the authenticated user's order history grouped by order_id
export const getUserOrders = async (req, res) => {
  // req.user.id is guaranteed by verifyToken middleware
  const userId = req.user.id;
  try {
    // Fetch all rows for this user, newest group first (idx_orders_created)
    const [rows] = await pool.query(
      `SELECT o.id, o.order_id, o.title, o.category, o.price, o.quantity, o.notes, o.completed, o.created_at, o.order_type, o.address, o.coordinates, o.table_id, o.kitchen_status,
              o.delivery_status, o.driver_id, o.delivery_failure_reason, o.is_cooked,
              t.table_number, t.zone AS table_zone
       FROM orders o
       LEFT JOIN \`tables\` t ON o.table_id = t.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // Group individual rows into order groups by order_id
    const groupMap = new Map();
    for (const row of rows) {
      if (!groupMap.has(row.order_id)) {
        groupMap.set(row.order_id, {
          order_id: row.order_id,
          order_type: row.order_type,
          address: row.address,
          table_id: row.table_id,
          table_number: row.table_number,
          table_zone: row.table_zone,
          created_at: row.created_at,
          completed: Boolean(row.completed),
          is_cooked: Boolean(row.is_cooked),
          kitchen_status: row.kitchen_status,
          items: [],
        });
      }
      const group = groupMap.get(row.order_id);
      group.delivery_status = row.delivery_status;
      group.driver_id = row.driver_id;
      group.driver_name = row.driver_name;
      group.delivery_failure_reason = row.delivery_failure_reason;
      // If ANY item is not completed, the whole group is pending
      if (!row.completed) group.completed = false;
      group.items.push({
        id: row.id,
        title: row.title,
        category: row.category,
        price: Number(row.price),
        quantity: row.quantity,
        notes: row.notes,
        completed: Boolean(row.completed),
        is_cooked: Boolean(row.is_cooked),
      });
    }

    const orders = Array.from(groupMap.values()).map((group) => {
      const ageMinutes = (Date.now() - new Date(group.created_at).getTime()) / 60000;
      if (group.order_type === 'Delivery') {
        group.stage = group.delivery_status === 'awaiting_otp' ? 'awaiting_delivery_otp'
          : group.delivery_status === 'picked_up' ? 'out_for_delivery'
            : group.delivery_status === 'delivered' ? 'completed'
              : group.delivery_status === 'failed' ? 'delivery_failed'
                : group.kitchen_status === 'ready' ? 'ready'
                  : group.kitchen_status === 'preparing' ? 'preparing' : 'placed';
      } else if (group.order_type === 'Takeout') {
        group.stage = group.completed ? 'completed'
          : group.kitchen_status === 'ready' ? 'ready'
            : group.kitchen_status === 'preparing' ? 'preparing'
              : ageMinutes >= 20 ? 'ready'
                : ageMinutes >= 5 ? 'preparing' : 'placed';
      } else if (group.order_type === 'Dine In' && (group.kitchen_status === 'ready' || group.completed)) {
        group.stage = 'completed';
        group.completed = true;
      } else if (group.order_type === 'Dine In' && group.items.some((item) => item.is_cooked)) {
        group.stage = 'meal_ready';
      } else if (group.kitchen_status === 'ready') {
        group.stage = 'ready';
      } else if (group.completed) {
        group.stage = 'completed';
      } else if (group.kitchen_status === 'preparing') {
        group.stage = 'preparing';
      } else if (ageMinutes >= 20) {
        group.stage = 'ready';
      } else if (ageMinutes >= 5) {
        group.stage = 'preparing';
      } else {
        group.stage = 'placed';
      }
      return group;
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/orders/status/:orderId — returns live status of an order group for the tracker
export const getOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.order_id, o.title, o.completed, o.is_cooked, o.created_at, o.order_type, o.coordinates, o.address, o.table_id, o.kitchen_status,
              o.delivery_status, o.driver_id, o.delivery_failure_reason,
              t.table_number, t.zone AS table_zone
       FROM orders o LEFT JOIN \`tables\` t ON o.table_id = t.id
       WHERE o.order_id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let allCompleted = rows.every((r) => Boolean(r.completed));
    if (rows[0].order_type === 'Dine In' && rows.some((r) => r.kitchen_status === 'ready')) {
      allCompleted = true;
    }
    const orderType = rows[0].order_type;
    const createdAt = rows[0].created_at;

    // Derive a deterministic status stage from creation time and completion flags
    const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;

    let stage;
    const deliveryStatus = rows[0].delivery_status;
    if (orderType === 'Delivery' && ['awaiting_otp', 'picked_up', 'delivered', 'failed'].includes(deliveryStatus)) {
      stage = deliveryStatus === 'awaiting_otp' ? 'awaiting_delivery_otp'
        : deliveryStatus === 'picked_up' ? 'out_for_delivery'
        : deliveryStatus === 'delivered' ? 'completed' : 'delivery_failed';
    } else if (orderType === 'Takeout') {
      if (allCompleted) {
        stage = 'completed';
      } else if (rows.some((r) => r.kitchen_status === 'ready')) {
        stage = 'ready';
      } else if (rows.some((r) => r.kitchen_status === 'preparing')) {
        stage = 'preparing';
      } else if (ageMinutes >= 20) {
        stage = 'ready';
      } else if (ageMinutes >= 5) {
        stage = 'preparing';
      } else {
        stage = 'placed';
      }
    } else if (orderType === 'Dine In' && rows.some((r) => r.kitchen_status === 'ready')) {
      stage = 'completed';
    } else if (orderType === 'Dine In' && rows.some((r) => r.is_cooked)) {
      stage = 'meal_ready';
    } else if (rows.some((r) => r.kitchen_status === 'ready')) {
      stage = 'ready';
    } else if (allCompleted && orderType !== 'Delivery') {
      stage = 'completed';
    } else if (rows.some((r) => r.kitchen_status === 'preparing')) {
      stage = 'preparing';
    } else if (orderType === 'Delivery') {
      stage = 'placed';
    } else if (ageMinutes >= 20) {
      stage = orderType === 'Delivery' ? 'out_for_delivery' : 'ready';
    } else if (ageMinutes >= 5) {
      stage = 'preparing';
    } else {
      stage = 'placed';
    }
 
    res.json({
      order_id: orderId,
      order_type: orderType,
      completed: allCompleted,
      delivery_status: deliveryStatus,
      delivery_failure_reason: rows[0].delivery_failure_reason,
      coordinates: rows[0].coordinates,
      address: rows[0].address,
      table_id: rows[0].table_id,
      table_number: rows[0].table_number,
      table_zone: rows[0].table_zone,  
      stage,
      created_at: createdAt,
      items: rows.map((r) => ({ id: r.id, title: r.title, completed: Boolean(r.completed), is_cooked: Boolean(r.is_cooked) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
