import pool from '../config/db.js';

export const getOrders = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createOrder = async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    try {
        for (const item of items) {
            const { id, order_id, title, category, price, quantity, notes, completed } = item;
            await pool.query(
                'INSERT INTO orders (id, order_id, title, category, price, quantity, notes, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, order_id, title, category, price, quantity, notes, completed ? 1 : 0]
            );
        }
        res.status(201).json({ message: 'Orders created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateOrder = async (req, res) => {
    const { id } = req.params;
    const { title, category, price, quantity, notes, completed, order_id } = req.body;
    try {
        await pool.query(
            'UPDATE orders SET order_id=?, title=?, category=?, price=?, quantity=?, notes=?, completed=? WHERE id=?',
            [order_id, title, category, price, quantity, notes, completed ? 1 : 0, id]
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