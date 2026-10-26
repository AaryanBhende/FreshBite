import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

// GET /api/users/profile — returns the authenticated user's profile
export const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/users/profile — updates name, email, and optionally password
export const updateProfile = async (req, res) => {
  // Strictly scope to the authenticated user — no other user's data is touched
  const userId = req.user.id;
  const { name, email, currentPassword, newPassword } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  try {
    // Fetch current user record
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = users[0];

    // Check if new email is already taken by another user
    if (cleanEmail !== user.email) {
      const [conflict] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [cleanEmail, userId]
      );
      if (conflict.length > 0) {
        return res.status(400).json({ error: 'Email is already in use by another account.' });
      }
    }

    // Handle optional password change
    let hashedPassword = user.password;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword.trim(), user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    }

    await pool.query(
      'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
      [cleanName, cleanEmail, hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: { id: userId, name: cleanName, email: cleanEmail, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const EMPLOYEE_ROLES = new Set(['driver', 'kitchen']);
const employeeId = () => `employee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getEmployees = async (_req, res) => {
  try {
    const [employees] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE role IN ('driver', 'kitchen') ORDER BY role, name"
    );
    res.json(employees);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const createEmployee = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
      !name.trim() || !email.trim() || !password.trim() || !EMPLOYEE_ROLES.has(role)) {
    return res.status(400).json({ error: 'Name, email, password, and a valid employee type are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPassword = password.trim();
  if (cleanName.length > 100 || cleanEmail.length > 150 || !/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ error: 'Enter a valid name and email address.' });
  if (cleanPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const id = employeeId();
    await pool.query('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)', [id, cleanName, cleanEmail, hashedPassword, role]);
    res.status(201).json({ employee: { id, name: cleanName, email: cleanEmail, role } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.' });
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || !name.trim() || !email.trim()) return res.status(400).json({ error: 'Name and email are required.' });
  if (name.trim().length > 100 || email.trim().length > 150 || !/^\S+@\S+\.\S+$/.test(email.trim())) return res.status(400).json({ error: 'Enter a valid name and email address.' });
  if (password != null && typeof password !== 'string') return res.status(400).json({ error: 'Password must be text.' });
  if (password && password.trim().length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  try {
    const [employees] = await pool.query("SELECT id FROM users WHERE id = ? AND role IN ('driver', 'kitchen')", [req.params.id]);
    if (!employees.length) return res.status(404).json({ error: 'Employee not found.' });
    const values = [cleanName, cleanEmail];
    let passwordSql = '';
    if (password) {
      passwordSql = ', password = ?';
      values.push(await bcrypt.hash(password.trim(), 10));
    }
    values.push(req.params.id);
    await pool.query(`UPDATE users SET name = ?, email = ?${passwordSql} WHERE id = ?`, values);
    res.json({ employee: { id: req.params.id, name: cleanName, email: cleanEmail } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.' });
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role IN ('driver', 'kitchen')", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ success: true, message: 'Employee deleted.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
