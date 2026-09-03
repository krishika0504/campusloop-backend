import { Router } from 'express';
import { requestController } from '../controllers/requestController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requestController.getRequests);
router.post('/', requestController.createRequest);

export default router;
