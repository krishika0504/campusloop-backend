import { Router } from 'express';
import { pickupController } from '../controllers/pickupController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, pickupController.getPickupLocations);
router.post('/', authenticateToken, pickupController.createPickupLocation);
router.put('/:id', authenticateToken, pickupController.updatePickupLocation);

export default router;
