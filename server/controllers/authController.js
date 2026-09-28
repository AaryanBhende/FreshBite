import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'freshbite_secret_key_123';

// 1. REGISTER (Regular Users Only)
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    // Check Duplicate Email
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email is already registered. Please log in instead.' });
    }

    // All registrations are strictly standard 'user'
    const assignedRole = 'user';
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    await pool.query(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name.trim(), cleanEmail, hashedPassword, assignedRole]
    );

    const token = jwt.sign(
      { id: userId, name: name.trim(), email: cleanEmail, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), email: cleanEmail, role: assignedRole }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. LOGIN (Retrieves Role from Database)
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(cleanPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Embeds the database role ('admin' or 'user') into the JWT payload and response
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};