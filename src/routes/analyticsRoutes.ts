import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/kpis', analyticsController.getDashboardKpis);
router.get('/monthly', analyticsController.getMonthlyCirculation);
router.get('/categories', analyticsController.getCategoryMetrics);
router.get('/leaderboard', analyticsController.getCollegeLeaderboard);

export default router;
