import { Router } from 'express';
import { offerController } from '../controllers/offerController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/', offerController.createOffer);
router.put('/:id/accept', offerController.acceptOffer);
router.put('/:id/reject', offerController.rejectOffer);
router.post('/:id/counter', offerController.counterOffer);

export default router;
