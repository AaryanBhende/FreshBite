import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'freshbite_db',
  waitForConnections: true,
  connectionLimit: 10,  // Reuses up to 10 simultaneous connections
  queueLimit: 0,        // Unlimited queued connection requests
  enableKeepAlive: true, // Keeps TCP connection alive to prevent timeouts
  keepAliveInitialDelay: 0,
});

// Test DB Connection on Startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(' Successfully connected to MySQL pool.');
    connection.release();
  } catch (error) {
    console.error(' Database connection failed:', error.message);
  }
})();

export default pool;