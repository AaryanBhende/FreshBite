import express from 'express';
import { getRushStatus, updateRushOverride } from '../controllers/rushController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', getRushStatus);
router.put('/override', verifyAdmin, updateRushOverride);
export default router;
