import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.post('/', requireRole(['SUPER_ADMIN', 'COLLEGE_ADMIN']), notificationController.sendAnnouncement);

export default router;
