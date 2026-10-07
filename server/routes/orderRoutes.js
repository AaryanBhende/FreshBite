import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
  getOrderStatus,
} from '../controllers/orderController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public admin routes
router.get('/', verifyAdmin, getOrders);
router.post('/', createOrder);
router.put('/:id', verifyAdmin, updateOrder);
router.delete('/:id', verifyAdmin, deleteOrder);

// Authenticated user routes — MUST be before '/:id' wildcard
router.get('/user', verifyToken, getUserOrders);
router.get('/status/:orderId', verifyToken, getOrderStatus);

export default router;