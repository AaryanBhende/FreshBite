import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Routes
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import rushRoutes from './routes/rushRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import kdsRoutes from './routes/kdsRoutes.js';
import ensureSchema from './config/initSchema.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Response Compression (<200ms API target)
app.use(compression());

// 2. Security & Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 3. Rate Limiting (Prevents API abuse)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 1200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'API request limit reached. Please try again shortly.' }),
});
app.use('/api/', apiLimiter);

// 4. Static Assets with Browser Caching
app.use(
  '/assets',
  express.static(path.join(__dirname, '../client/public/assets'), {
    maxAge: '1d', // Cache static images for 1 day
  })
);
app.use('/uploads', express.static(path.join(__dirname, '../client/public/uploads')));

// 5. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kds', kdsRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/rush', rushRoutes);
app.use('/api/contact', contactRoutes);

// Keep unknown API paths in the same JSON response contract as known routes.
app.use('/api', (req, res) => res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` }));

// 6. Serve the built React client (SPA fallback for client-side routes)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next());
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Server Error:', err.stack);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
await ensureSchema();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
