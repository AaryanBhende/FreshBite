import express from 'express';
import { getKitchenOrders, getKitchenHistory, getKitchenDeliveredOrders, updateKitchenStatus, bumpKitchenItem } from '../controllers/kdsController.js';
import { verifyKitchen } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();
router.use(verifyKitchen);
router.get('/orders', getKitchenOrders);
router.get('/history', getKitchenHistory);
router.get('/delivered', getKitchenDeliveredOrders);
router.put('/orders/:id/status', asyncHandler(updateKitchenStatus));
router.put('/orders/items/:itemId/bump', bumpKitchenItem);
export default router;
