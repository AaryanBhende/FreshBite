import pool from '../config/db.js';

export const getOrders = async (req, res) => {
  try {
    // Select users.name (or users.username if your column is named username)
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

export const createOrder = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  try {
    for (const item of items) {
      const {
        id,
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
      } = item;
      const orderCategory = category || 'None';
      const orderType = order_type || 'Dine In';
      await pool.query(
        `INSERT INTO orders 
        (id,order_id,user_id,title,category,price,quantity,notes,completed,order_type,address,coordinates) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          order_id,
          user_id || null,
          title,
          orderCategory,
          price,
          quantity,
          notes,
          completed ? 1 : 0,
          orderType,
          address || null,
          coordinates || null,
        ]
      );
    }
    res.status(201).json({ message: 'Orders created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
      `UPDATE orders SET order_id=?,user_id=?,title=?,category=?,price=?,quantity=?,notes=?,completed=?,order_type=?,address=?,coordinates=? WHERE id=?`,
      [
        order_id,
        user_id,
        title,
        category,
        price,
        quantity,
        notes,
        completed ? 1 : 0,
        order_type,
        address,
        coordinates,
        id,
      ]
    );
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM orders WHERE id=?', [id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};