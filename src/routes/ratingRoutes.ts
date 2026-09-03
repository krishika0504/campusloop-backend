import { Router } from 'express';
import { ratingController } from '../controllers/ratingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, ratingController.createRating);
router.get('/user/:id', authenticateToken, ratingController.getUserRatings);

export default router;
