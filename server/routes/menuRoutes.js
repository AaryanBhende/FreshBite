import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Saves directly to FreshBite\client\public\assets\images
    cb(null, path.join(__dirname, '../../client/public/assets/images'));
  },
  filename: (req, file, cb) => {
    // Unique filename to prevent cache conflicts
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.get('/', getMenuItems);
router.post('/', verifyToken, verifyAdmin, upload.single('image'), addMenuItem);
router.put('/:id', verifyToken, verifyAdmin, upload.single('image'), updateMenuItem);
router.delete('/:id', verifyToken, verifyAdmin, deleteMenuItem);

export default router;