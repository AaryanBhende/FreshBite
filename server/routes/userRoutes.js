import express from 'express';
import { getProfile, updateProfile, getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../controllers/userController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
import { getCustomerRecommendations, getCustomerSegments } from '../controllers/crmController.js';

const router = express.Router();

router.get('/admin/segments', verifyAdmin, getCustomerSegments);
router.get('/admin/employees', verifyAdmin, getEmployees);
router.post('/admin/employees', verifyAdmin, createEmployee);
router.put('/admin/employees/:id', verifyAdmin, updateEmployee);
router.delete('/admin/employees/:id', verifyAdmin, deleteEmployee);
router.get('/recommendations', verifyToken, getCustomerRecommendations);

// Both routes are JWT-protected — verifyToken populates req.user
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

export default router;
