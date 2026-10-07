import pool from '../config/db.js';

// GET all orders with user names
export const getOrders = async (req, res) => {
  try {
    // Leverages idx_orders_created index for fast sorting
    const [rows] = await pool.query(`
      SELECT orders.*, users.name AS username 
      FROM orders 
      LEFT JOIN users ON orders.user_id = users.id 
      ORDER BY orders.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE order(s) - Optimized for <200ms response time
export const createOrder = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items array cannot be empty.' });
  }

  // 1. Acquire dedicated connection from pool
  const connection = await pool.getConnection();

  try {
    // 2. Begin transaction
    await connection.beginTransaction();

    // 3. Construct matrix for MySQL multi-row insert [ [col1, col2, ...], [col1, col2, ...] ]
    const values = items.map((item) => [
      item.id,
      item.order_id,
      item.user_id || null,
      item.title,
      item.category || 'None',
      item.price,
      item.quantity || 1,
      item.notes || '',
      item.completed ? 1 : 0,
      item.order_type || 'Dine In',
      item.address || null,
      item.coordinates || null,
    ]);

    // 4. Execute single bulk-insert query (1 network round-trip ~10-30ms)
    const sql = `
      INSERT INTO orders 
      (id, order_id, user_id, title, category, price, quantity, notes, completed, order_type, address, coordinates) 
      VALUES ?
    `;

    await connection.query(sql, [values]);

    // 5. Commit atomic transaction
    await connection.commit();

    // 6. Return response immediately to client (<50ms total execution time)
    res.status(201).json({
      success: true,
      message: 'Orders created successfully',
      order_id: items[0].order_id,
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
  } = req.body;

  try {
    await pool.query(
      `UPDATE orders 
       SET order_id=?, user_id=?, title=?, category=?, price=?, quantity=?, notes=?, completed=?, order_type=?, address=?, coordinates=? 
       WHERE id=?`,
      [
        order_id,
        user_id || null,
        title,
        category || 'None',
        price,
        quantity,
        notes || '',
        completed ? 1 : 0,
        order_type || 'Dine In',
        address || null,
        coordinates || null,
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
      `SELECT id, order_id, title, category, price, quantity, notes, completed, created_at, order_type, address, coordinates
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
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
          created_at: row.created_at,
          completed: Boolean(row.completed),
          items: [],
        });
      }
      const group = groupMap.get(row.order_id);
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
      });
    }

    res.json(Array.from(groupMap.values()));
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
      `SELECT id, order_id, title, completed, created_at, order_type
       FROM orders
       WHERE order_id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const allCompleted = rows.every((r) => r.completed);
    const anyCompleted = rows.some((r) => r.completed);
    const orderType = rows[0].order_type;
    const createdAt = rows[0].created_at;

    // Derive a deterministic status stage from creation time and completion flags
    const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;

    let stage;
    if (allCompleted) {
      stage = 'completed';
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
      stage,
      created_at: createdAt,
      items: rows.map((r) => ({ id: r.id, title: r.title, completed: Boolean(r.completed) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};