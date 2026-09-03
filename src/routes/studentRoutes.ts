import { Router } from 'express';
import { studentController } from '../controllers/studentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Restricted to Admins
router.use(authenticateToken, requireRole(['SUPER_ADMIN', 'COLLEGE_ADMIN']));

router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.patch('/:id/verify', studentController.updateVerificationStatus);
router.patch('/:id/status', studentController.updateAccountStatus);
router.post('/:id/strikes', studentController.addStrike);

export default router;
