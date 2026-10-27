import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  validatePromotion, getPromotions, createPromotion, updatePromotion, deletePromotion,
  setPromotionActive, getAnnouncements,
} from '../controllers/promotionController.js';
import { optionalAuth, verifyAdmin } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.join(__dirname, '../../client/public/uploads/promos');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Promo images must be JPG, PNG, or WEBP files.'));
    }
    callback(null, true);
  },
});

router.post('/validate', optionalAuth, validatePromotion);
router.get('/admin', verifyAdmin, getPromotions);
router.post('/admin', verifyAdmin, upload.single('image'), asyncHandler(createPromotion));
router.put('/admin/:id', verifyAdmin, upload.single('image'), asyncHandler(updatePromotion));
router.delete('/admin/:id', verifyAdmin, asyncHandler(deletePromotion));
router.put('/admin/:id/active', verifyAdmin, asyncHandler(setPromotionActive));
router.get('/announcements', getAnnouncements);
export default router;
