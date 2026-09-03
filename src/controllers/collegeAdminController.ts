import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';
import { hashPassword } from '../utils/passwords.js';
import { recordAuditLog } from '../middleware/audit.js';

export const collegeAdminController = {
  async getCollegeAdmins(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'COLLEGE_ADMIN' },
        include: {
          college: { select: { id: true, name: true, code: true, city: true } },
          adminAssignments: {
            include: {
              college: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        status: a.status,
        collegeId: a.collegeId,
        collegeName: a.college?.name || 'Unassigned',
        collegeCode: a.college?.code,
        assignedCollege: a.college,
        createdAt: a.createdAt.toISOString(),
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get college admins error:', error);
      res.status(500).json({ error: 'Failed to retrieve college admins' });
    }
  },

  async createCollegeAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, password, collegeId } = req.body;

      if (!name || !email || !password || !collegeId) {
        res.status(400).json({ error: 'Name, email, password, and collegeId are required' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'A user with this email already exists' });
        return;
      }

      const targetCollege = await prisma.college.findUnique({ where: { id: collegeId } });
      if (!targetCollege) {
        res.status(404).json({ error: 'Target college not found' });
        return;
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'COLLEGE_ADMIN',
          collegeId: targetCollege.id,
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
        },
        include: { college: true },
      });

      await prisma.collegeAdmin.create({
        data: {
          userId: user.id,
          collegeId: targetCollege.id,
          assignedBy: req.user?.id,
        },
      });

      if (req.user) {
        await recordAuditLog({
          admin: req.user,
          action: 'ADMIN_CREATED',
          entityType: 'CollegeAdmin',
          entityId: user.id,
          metadata: { email: user.email, collegeName: targetCollege.name },
        });
      }

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        collegeName: user.college?.name,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Create college admin error:', error);
      res.status(500).json({ error: 'Failed to create college admin' });
    }
  },

  async assignCollege(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { collegeId } = req.body;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const college = await prisma.college.findUnique({ where: { id: collegeId } });
      if (!college) {
        res.status(404).json({ error: 'College not found' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          role: 'COLLEGE_ADMIN',
          collegeId: college.id,
        },
        include: { college: true },
      });

      await prisma.collegeAdmin.upsert({
        where: {
          userId_collegeId: {
            userId: user.id,
            collegeId: college.id,
          },
        },
        update: {
          assignedBy: req.user?.id,
          assignedAt: new Date(),
        },
        create: {
          userId: user.id,
          collegeId: college.id,
          assignedBy: req.user?.id,
        },
      });

      if (req.user) {
        await recordAuditLog({
          admin: req.user,
          action: 'ADMIN_ASSIGNED',
          entityType: 'CollegeAdmin',
          entityId: user.id,
          metadata: { newCollegeId: college.id, collegeName: college.name },
        });
      }

      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        collegeId: updated.collegeId,
        collegeName: updated.college?.name,
      });
    } catch (error) {
      console.error('Assign college error:', error);
      res.status(500).json({ error: 'Failed to assign college' });
    }
  },
};
