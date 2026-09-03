import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Only SUPER_ADMIN can view global audit logs
router.use(authenticateToken, requireRole(['SUPER_ADMIN']));

router.get('/', auditController.getAuditLogs);

export default router;
