import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET || 'freshbite_secret_key_123';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email is already registered. Please log in instead.' });
    }
    // Public registration always creates customer accounts. Staff accounts use admin-only routes.
    const assignedRole = 'user';
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await pool.query('INSERT INTO users(id, name, email, password, role) VALUES(?,?,?,?,?)', [
      userId,
      name.trim(),
      cleanEmail,
      hashedPassword,
      assignedRole,
    ]);
    const token = jwt.sign(
      { id: userId, name: name.trim(), email: cleanEmail, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: userId, name: name.trim(), email: cleanEmail, role: assignedRole } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const { name, email } = ticket.getPayload();
    const cleanEmail = email.toLowerCase();

    let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    let user = users[0];

    if (!user) {
      const assignedRole = 'user';
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

      await pool.query('INSERT INTO users(id, name, email, password, role) VALUES(?,?,?,?,?)', [
        userId,
        name,
        cleanEmail,
        randomPassword,
        assignedRole,
      ]);

      user = { id: userId, name, email: cleanEmail, role: assignedRole };
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(401).json({ error: 'Google authentication failed: ' + error.message });
  }
};
