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
