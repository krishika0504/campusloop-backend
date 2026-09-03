import { Router } from 'express';
import { collegeController } from '../controllers/collegeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Public / Authenticated read
router.get('/', collegeController.getColleges);
router.get('/:id', authenticateToken, collegeController.getCollegeById);

// SUPER_ADMIN mutations
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), collegeController.createCollege);
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), collegeController.updateCollege);
router.patch('/:id/status', authenticateToken, requireRole(['SUPER_ADMIN']), collegeController.updateCollegeStatus);

export default router;
