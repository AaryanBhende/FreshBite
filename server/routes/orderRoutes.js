import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
  getOrderStatus,
  markDeliveryFailureRead, markDeliveryPickedUp, getDriverOrders, getDriverAnalytics, updateDriverDelivery,
  generateDeliveryOtp, verifyDeliveryOtp,
} from '../controllers/orderController.js';
import { verifyToken, verifyAdmin, verifyDriver } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

// Admin order management and delivery failure notifications
router.get('/', verifyAdmin, getOrders);
router.put('/:orderId/failure-read', verifyAdmin, markDeliveryFailureRead);
router.put('/:orderId/picked-up', verifyAdmin, asyncHandler(markDeliveryPickedUp));
router.get('/driver/analytics', verifyDriver, getDriverAnalytics);
router.get('/driver/assigned', verifyDriver, getDriverOrders);
router.post('/driver/:orderId/delivery-otp', verifyDriver, asyncHandler(generateDeliveryOtp));
router.put('/driver/:orderId/status', verifyDriver, asyncHandler(updateDriverDelivery));
router.post('/', asyncHandler(createOrder));
router.put('/:id', verifyAdmin, updateOrder);
router.delete('/:id', verifyAdmin, deleteOrder);

// Authenticated user routes — MUST be before '/:id' wildcard
router.get('/user', verifyToken, getUserOrders);
router.get('/status/:orderId', verifyToken, getOrderStatus);
router.post('/:orderId/verify-delivery-otp', verifyToken, asyncHandler(verifyDeliveryOtp));

export default router;
