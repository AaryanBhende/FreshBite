import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
  getOrderStatus,
  markDeliveryFailureRead, getDriverOrders, getDriverAnalytics, updateDriverDelivery,
} from '../controllers/orderController.js';
import { verifyToken, verifyAdmin, verifyDriver } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin order management and delivery failure notifications
router.get('/', verifyAdmin, getOrders);
router.put('/:orderId/failure-read', verifyAdmin, markDeliveryFailureRead);
router.get('/driver/analytics', verifyDriver, getDriverAnalytics);
router.get('/driver/assigned', verifyDriver, getDriverOrders);
router.put('/driver/:orderId/status', verifyDriver, updateDriverDelivery);
router.post('/', createOrder);
router.put('/:id', verifyAdmin, updateOrder);
router.delete('/:id', verifyAdmin, deleteOrder);

// Authenticated user routes — MUST be before '/:id' wildcard
router.get('/user', verifyToken, getUserOrders);
router.get('/status/:orderId', verifyToken, getOrderStatus);

export default router;
