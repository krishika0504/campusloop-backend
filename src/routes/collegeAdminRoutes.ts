import { Router } from 'express';
import { collegeAdminController } from '../controllers/collegeAdminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Only SUPER_ADMIN can manage College Admins
router.use(authenticateToken, requireRole(['SUPER_ADMIN']));

router.get('/', collegeAdminController.getCollegeAdmins);
router.post('/', collegeAdminController.createCollegeAdmin);
router.patch('/:id/assign', collegeAdminController.assignCollege);

export default router;
