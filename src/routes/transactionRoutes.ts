import { Router } from 'express';
import { transactionController } from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.patch('/:id/status', transactionController.updateTransactionStatus);
router.post('/:id/verify-qr', transactionController.verifyQrCode);

export default router;
