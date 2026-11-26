import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Loads schema.sql once, when the database has no `users` table yet (fresh install).
export default async function ensureSchema() {
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'users'");
    if (rows.length > 0) return;
    console.log('Empty database detected, loading schema.sql ...');
    const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8').replace(/\r\n/g, '\n');
    const conn = await pool.getConnection();
    try {
      // Drop comment-only lines, then split on statement terminators at end of line.
      // The dump's /*! ... */ conditional comments (some are split across lines) are only
      // session settings, so strip them and disable FK checks ourselves.
      await conn.query('SET FOREIGN_KEY_CHECKS=0');
      const statements = sql
        .replace(/\/\*[\s\S]*?\*\/;?/g, '')
        .split('\n')
        .filter((l) => !l.startsWith('--'))
        .join('\n')
        .split(/;[ \t]*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) await conn.query(stmt);
      await conn.query('SET FOREIGN_KEY_CHECKS=1');
      console.log('Schema loaded.');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Schema init failed:', err.message);
  }
}
