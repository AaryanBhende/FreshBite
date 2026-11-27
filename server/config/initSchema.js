import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Loads schema.sql once, when the database has no `users` table yet (fresh install).
const describe = (err) => `${err.code || ''} ${err.message || ''} ${(err.errors || []).map((e) => e.message || e.code).join('; ')}`.trim();

// Waits for the database to accept connections (it may still be starting), then loads the schema.
export default async function ensureSchema() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      console.error(`DB not reachable (attempt ${attempt}/10): ${describe(err)}`);
      if (attempt === 10) return;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'users'");
    if (rows.length === 0) {
      console.log('Empty database detected, loading schema.sql ...');
      await runSqlFile('../schema.sql');
      console.log('Schema loaded.');
    }
    // One-time menu seed (migrations/menu_item.sql): only when the menu is empty.
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM menu_items');
    if (n === 0) {
      console.log('Menu is empty, loading migrations/menu_item.sql ...');
      await runSqlFile('../migrations/menu_item.sql');
      console.log('Menu items loaded.');
    }
    // One-time data files, tracked in `applied_seeds` so each runs once per database.
    // admin.sql holds users rows; REPLACE overwrites the default admin row from schema.sql.
    await runOnce('admin.sql', (sql) => sql.replace(/INSERT INTO `users`/g, 'REPLACE INTO `users`'));
    // datamigration.sql (announcements, promotions, orders, reservations, tables, ...) must run
    // before reservation_tables.sql, which links reservations to tables.
    const asReplace = (sql) => sql.replace(/^INSERT INTO /gm, 'REPLACE INTO ');
    await runOnce('datamigration.sql', asReplace);
    await runOnce('reservation_tables.sql', asReplace);
  } catch (err) {
    console.error('Schema init failed:', describe(err));
  }
}

async function runOnce(name, transform) {
  await pool.query('CREATE TABLE IF NOT EXISTS applied_seeds (name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  const [done] = await pool.query('SELECT 1 FROM applied_seeds WHERE name = ?', [name]);
  if (done.length > 0) return;
  console.log(`Applying migrations/${name} ...`);
  await runSqlFile(`../migrations/${name}`, transform);
  await pool.query('INSERT INTO applied_seeds (name) VALUES (?)', [name]);
  console.log(`Applied migrations/${name}.`);
}

async function runSqlFile(relPath, transform = (x) => x) {
  const sql = transform(fs.readFileSync(path.join(__dirname, relPath), 'utf8').replace(/\r\n/g, '\n'));
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
  } finally {
    conn.release();
  }
}
