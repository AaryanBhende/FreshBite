import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toNum = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getMenuItems = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addMenuItem = async (req, res) => {
  let { title, category, description, price, calories, protein, carbs, fats, fibre } = req.body;
  const id = `cat-${Date.now()}`;

  if (Array.isArray(category)) {
    category = category.join(',');
  }

  const imgPath = req.file
    ? `assets/images/${req.file.filename}`
    : 'assets/images/placeholder.png';

  try {
    await pool.query(
      `INSERT INTO menu_items (id, title, category, description, price, img, calories, protein, carbs, fats, fibre) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title || '',
        category || '',
        description || '',
        toNum(price),
        imgPath,
        toNum(calories),
        toNum(protein),
        toNum(carbs),
        toNum(fats),
        toNum(fibre),
      ]
    );

    res.status(201).json({ message: 'Menu item added successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  let { title, category, description, price, currentImg, calories, protein, carbs, fats, fibre } = req.body;

  if (Array.isArray(category)) {
    category = category.join(',');
  }

  try {
    let imgPath = currentImg || '';

    if (req.file) {
      imgPath = `assets/images/${req.file.filename}`;

      // Remove previous image if it exists and isn't the placeholder
      if (currentImg && !currentImg.includes('placeholder.png')) {
        const oldFilePath = path.join(__dirname, '../../client/public', currentImg);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    await pool.query(
      `UPDATE menu_items
       SET title=?, category=?, description=?, price=?, img=?, calories=?, protein=?, carbs=?, fats=?, fibre=?
       WHERE id=?`,
      [
        title || '',
        category || '',
        description || '',
        toNum(price),
        imgPath,
        toNum(calories),
        toNum(protein),
        toNum(carbs),
        toNum(fats),
        toNum(fibre),
        id,
      ]
    );

    res.json({ message: 'Menu item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
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

export const getFavoriteItems = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE is_favorite = 1');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const setFavorite = async (req, res) => {
  const { id } = req.params;
  const isFavorite = req.body.isFavorite ? 1 : 0;
  try {
    const [result] = await pool.query(
      'UPDATE menu_items SET is_favorite = ? WHERE id = ?',
      [isFavorite, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Favorite updated', isFavorite: !!isFavorite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};