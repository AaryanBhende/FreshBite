import express from 'express';
import {
  getItemReviews,
  createItemReview,
  getAdminReviews,
  moderateReview,
} from '../controllers/ratingController.js';
import { verifyAdmin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public item reviews; GET accepts ?page=N&limit=N (default page 1, 5 reviews)
router.get('/item/:itemId', getItemReviews);

// Add review (optional JWT: records user_id if logged in, allows guest reviews too)
router.post('/item/:itemId', optionalAuth, createItemReview);

// Admin moderation routes
router.get('/admin', verifyAdmin, getAdminReviews);
router.put('/admin/:id/moderate', verifyAdmin, moderateReview);

export default router;
