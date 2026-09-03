import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/verify', authenticateToken, authController.submitVerification);
router.post('/logout', authController.logout);

export default router;
