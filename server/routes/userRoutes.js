import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
import { getCustomerRecommendations, getCustomerSegments } from '../controllers/crmController.js';

const router = express.Router();

router.get('/admin/segments', verifyAdmin, getCustomerSegments);
router.get('/recommendations', verifyToken, getCustomerRecommendations);

// Both routes are JWT-protected — verifyToken populates req.user
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

export default router;
