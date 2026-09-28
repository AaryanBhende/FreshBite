import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getMenuItems = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addMenuItem = async (req, res) => {
  const { title, category, description, price } = req.body;
  const id = `cat-${Date.now()}`;
  
  // Set image path if uploaded, or fall back to default
  const imgPath = req.file ? `assets/images/${req.file.filename}` : 'assets/images/placeholder.png';

  try {
    await pool.query(
      'INSERT INTO menu_items(id, title, category, description, price, img) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, category, description, price, imgPath]
    );
    res.status(201).json({ message: 'Menu item added successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const { title, category, description, price, currentImg } = req.body;

  try {
    let imgPath = currentImg;

    // If a new image was uploaded
    if (req.file) {
      imgPath = `assets/images/${req.file.filename}`;

      // Delete the old image file from disk if it exists and is not placeholder
      if (currentImg && !currentImg.includes('placeholder.png')) {
        const oldFilePath = path.join(__dirname, '../../client/public', currentImg);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    await pool.query(
      'UPDATE menu_items SET title=?, category=?, description=?, price=?, img=? WHERE id=?',
      [title, category, description, price, imgPath, id]
    );

    res.json({ message: 'Menu item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMenuItem = async (req, res) => {
  const { id } = req.params;
  try {
    // Optionally delete image from disk
    const [rows] = await pool.query('SELECT img FROM menu_items WHERE id=?', [id]);
    if (rows.length > 0 && rows[0].img && !rows[0].img.includes('placeholder.png')) {
      const filePath = path.join(__dirname, '../../client/public', rows[0].img);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query('DELETE FROM menu_items WHERE id=?', [id]);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};