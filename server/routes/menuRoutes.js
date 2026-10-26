import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import {
  getMenuItems,
  getFavoriteItems,
  setFavorite,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setAvailability,
} from '../controllers/menuController.js';
import { verifyToken, verifyAdmin, verifyKitchen } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../client/public/assets/images'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Public routes
router.get('/', getMenuItems);

// Favorite routes (placed before /:id routes to avoid route matching conflicts)
router.get('/favorites', getFavoriteItems);
router.put('/:id/favorite', verifyToken, verifyAdmin, setFavorite);
router.put('/:id/availability', verifyToken, (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return verifyKitchen(req, res, next);
}, setAvailability);

// Admin item management routes
router.post('/', verifyToken, verifyAdmin, upload.single('image'), addMenuItem);
router.put('/:id', verifyToken, verifyAdmin, upload.single('image'), updateMenuItem);
router.delete('/:id', verifyToken, verifyAdmin, deleteMenuItem);

export default router;
