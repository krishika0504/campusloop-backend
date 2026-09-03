import { Router } from 'express';
import { revenueController } from '../controllers/revenueController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Only SUPER_ADMIN can view financial platform revenue
router.use(authenticateToken, requireRole(['SUPER_ADMIN']));

router.get('/', revenueController.getRevenueMetrics);
router.get('/subscriptions', revenueController.getSubscriptions);

export default router;
