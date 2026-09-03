import { Router } from 'express';
import { itemController } from '../controllers/itemController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public / student read
router.get('/', itemController.getItems);
router.get('/:id', itemController.getItemById);

// Student create / edit
router.post('/', authenticateToken, itemController.createItem);
router.put('/:id', authenticateToken, itemController.updateItem);

// Moderation
router.patch('/:id/status', authenticateToken, itemController.moderateItem);
router.delete('/:id', authenticateToken, itemController.deleteItem);

export default router;
