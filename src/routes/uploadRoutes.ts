import { Router } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/uploadController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max limit
  },
});

// Upload image route: supports both multipart form-data (field: "image" or "file") and JSON with base64
router.post('/', upload.single('image'), uploadController.uploadImage);

export default router;
