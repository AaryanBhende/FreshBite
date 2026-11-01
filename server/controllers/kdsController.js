import pool from '../config/db.js';

const groupOrders = (rows) => {
  const orders = new Map();
  for (const row of rows) {
    if (!orders.has(row.order_id)) orders.set(row.order_id, {
      order_id: row.order_id, order_type: row.order_type, created_at: row.created_at,
      kitchen_status: row.kitchen_status, table_id: row.table_id, table_number: row.table_number,
      table_zone: row.table_zone, customer_name: row.customer_name, items: [],
    });
    orders.get(row.order_id).items.push({
      id: row.id, title: row.title, quantity: row.quantity, notes: row.notes,
      is_cooked: Boolean(row.is_cooked),
    });
  }
  return [...orders.values()];
};

const loadOrders = async (where, params) => {
  const [rows] = await pool.query(`SELECT o.id, o.order_id, o.order_type, o.created_at, o.kitchen_status,
    o.title, o.quantity, o.notes, o.is_cooked, o.table_id, t.table_number, t.zone AS table_zone,
    u.name AS customer_name
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN \`tables\` t ON t.id = o.table_id
    WHERE ${where} ORDER BY o.created_at ASC, o.order_id`, params);
  return groupOrders(rows);
};

export const getKitchenOrders = async (req, res) => {
  try {
    const type = req.query.type;
    if (type && !['Dine In', 'Delivery', 'Takeout'].includes(type))
      return res.status(400).json({ error: 'Invalid order type.' });
    const where = `o.kitchen_status IN ('pending','preparing') AND o.completed = 0${type ? ' AND o.order_type = ?' : ''}`;
    res.json({ orders: await loadOrders(where, type ? [type] : []) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getKitchenHistory = async (_req, res) => {
  try {
    res.json({ orders: await loadOrders("(o.kitchen_status = 'ready' OR o.completed = 1) AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) AND (o.delivery_status IS NULL OR o.delivery_status <> 'delivered')", []) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getKitchenDeliveredOrders = async (req, res) => {
  const requestedPage = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isInteger(requestedPage) || requestedPage < 1)
    return res.status(400).json({ error: 'Page must be a positive integer.' });
  const limit = 20;
  const offset = (requestedPage - 1) * limit;
  try {
    const [[countRow]] = await pool.query("SELECT COUNT(DISTINCT order_id) AS total FROM orders WHERE delivery_status = 'delivered'");
    const total = Number(countRow.total);
    const [pageRows] = await pool.query(`SELECT order_id
      FROM orders WHERE delivery_status = 'delivered'
      GROUP BY order_id ORDER BY MAX(created_at) ASC, order_id ASC
      LIMIT ? OFFSET ?`, [limit, offset]);
    const orderIds = pageRows.map(row => row.order_id);
    const [rows] = orderIds.length ? await pool.query(`SELECT o.id, o.order_id, o.order_type, o.created_at, o.kitchen_status,
      o.title, o.quantity, o.notes, o.is_cooked, o.table_id, t.table_number, t.zone AS table_zone,
      u.name AS customer_name
      FROM orders o LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN \`tables\` t ON t.id = o.table_id
      WHERE o.delivery_status = 'delivered' AND o.order_id IN (?)
      ORDER BY o.created_at ASC, o.order_id ASC`, [orderIds]) : [[]];
    res.json({ orders: groupOrders(rows), page: requestedPage, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const updateKitchenStatus = async (req, res) => {
  const { status } = req.body;
  if (!['preparing', 'ready'].includes(status)) return res.status(400).json({ error: 'Status must be preparing or ready.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, kitchen_status FROM orders WHERE order_id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Order not found.' }); }
    if (status === 'ready') {
      const [items] = await connection.query('SELECT order_type, is_cooked FROM orders WHERE order_id = ?', [req.params.id]);
      if (items[0]?.order_type === 'Dine In' && items.some(item => !item.is_cooked)) {
        await connection.rollback();
        return res.status(409).json({ error: 'Bump every dine-in item before marking the order ready.' });
      }
      if (items[0]?.order_type === 'Dine In') {
        await connection.query('UPDATE orders SET kitchen_status = ?, completed = 1 WHERE order_id = ?', [status, req.params.id]);
      } else {
        await connection.query('UPDATE orders SET kitchen_status = ? WHERE order_id = ?', [status, req.params.id]);
      }
    } else {
      await connection.query('UPDATE orders SET kitchen_status = ?, completed = 0 WHERE order_id = ?', [status, req.params.id]);
    }
    await connection.commit();
    res.json({ message: 'Kitchen status updated.', status });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: error.message }); }
  finally { connection.release(); }
};

export const bumpKitchenItem = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT o.id, o.order_type, o.kitchen_status FROM orders o WHERE o.id = ?', [req.params.itemId]);
    if (!rows.length) return res.status(404).json({ error: 'Order item not found.' });
    if (rows[0].order_type !== 'Dine In') return res.status(400).json({ error: 'Item bumping is available for dine-in orders only.' });
    if (rows[0].kitchen_status === 'ready') return res.status(409).json({ error: 'This order is already ready.' });
    await pool.query('UPDATE orders SET is_cooked = IF(is_cooked = 1, 0, 1) WHERE id = ?', [req.params.itemId]);
    const [[item]] = await pool.query('SELECT is_cooked FROM orders WHERE id = ?', [req.params.itemId]);
    res.json({ is_cooked: Boolean(item.is_cooked) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
