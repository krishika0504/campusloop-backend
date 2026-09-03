import { Router } from 'express';
import { conversationController } from '../controllers/conversationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', conversationController.getConversations);
router.post('/', conversationController.createOrGetConversation);
router.get('/:id/messages', conversationController.getMessages);
router.post('/:id/messages', conversationController.sendMessage);

export default router;
