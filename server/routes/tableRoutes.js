import express from 'express';
import { getTables, getTableAvailability } from '../controllers/tableController.js';

const router = express.Router();
router.get('/', getTables);
router.get('/availability', getTableAvailability);
export default router;
