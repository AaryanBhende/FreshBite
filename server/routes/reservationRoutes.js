import express from 'express';
import {
  getAvailability,
  createReservation,
  getUserReservations,
  cancelUserReservation,
  getAdminReservations,
  updateReservationStatus,
  createWalkInReservation,
} from '../controllers/reservationController.js';
import { verifyToken, verifyAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

// 1. Availability check endpoint (public, used by customer booking form)
router.get('/availability', getAvailability);

// 2. Customer booking endpoint (optional JWT: logs user_id if authenticated, or allows guest booking)
router.post('/', optionalAuth, asyncHandler(createReservation));

// 3. Authenticated customer reservation history
router.get('/user', verifyToken, getUserReservations);
router.put('/:id/cancel', verifyToken, cancelUserReservation);

// 4. Admin Management Endpoints
router.get('/admin', verifyAdmin, getAdminReservations);
router.post('/admin/walkin', verifyAdmin, asyncHandler(createWalkInReservation));
router.put('/admin/:id/status', verifyAdmin, updateReservationStatus);

export default router;
