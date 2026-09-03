import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';
import { recordAuditLog } from '../middleware/audit.js';

export const pickupController = {
  async getPickupLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { collegeId: queryCollegeId } = req.query;

      const where: any = { status: 'ACTIVE' };

      if (req.user?.role === 'COLLEGE_ADMIN') {
        where.collegeId = req.user.collegeId;
      } else if (queryCollegeId) {
        where.collegeId = queryCollegeId;
      } else if (req.user?.collegeId) {
        where.collegeId = req.user.collegeId;
      }

      const locations = await prisma.pickupLocation.findMany({
        where,
        orderBy: { isDefault: 'desc' },
        include: { college: { select: { name: true, code: true } } },
      });

      res.json(locations);
    } catch (error) {
      console.error('Get pickup locations error:', error);
      res.status(500).json({ error: 'Failed to retrieve pickup locations' });
    }
  },

  async createPickupLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COLLEGE_ADMIN')) {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      const { name, building, description, operatingHours, safetyTips, isDefault, collegeId: reqCollegeId } = req.body;

      if (!name || !building) {
        res.status(400).json({ error: 'Name and building are required' });
        return;
      }

      const collegeId = req.user.role === 'COLLEGE_ADMIN' ? req.user.collegeId : (reqCollegeId || req.user.collegeId);
      if (!collegeId) {
        res.status(400).json({ error: 'College ID is required' });
        return;
      }

      const location = await prisma.pickupLocation.create({
        data: {
          collegeId,
          name,
          building,
          description: description || null,
          operatingHours: operatingHours || '8:00 AM - 8:00 PM',
          safetyTips: safetyTips || 'Public area monitored by campus security',
          isDefault: Boolean(isDefault),
          status: 'ACTIVE',
        },
      });

      await recordAuditLog({
        admin: req.user,
        action: 'PICKUP_LOCATION_CREATED',
        entityType: 'PickupLocation',
        entityId: location.id,
        metadata: { name: location.name, building: location.building },
      });

      res.status(201).json(location);
    } catch (error) {
      console.error('Create pickup location error:', error);
      res.status(500).json({ error: 'Failed to create pickup location' });
    }
  },

  async updatePickupLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COLLEGE_ADMIN')) {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      const { id } = req.params;
      const { name, building, description, operatingHours, safetyTips, isDefault, status } = req.body;

      const loc = await prisma.pickupLocation.findUnique({ where: { id } });
      if (!loc) {
        res.status(404).json({ error: 'Pickup location not found' });
        return;
      }

      if (req.user.role === 'COLLEGE_ADMIN' && req.user.collegeId !== loc.collegeId) {
        res.status(403).json({ error: 'Forbidden: Cannot edit pickup location from another college' });
        return;
      }

      const updated = await prisma.pickupLocation.update({
        where: { id },
        data: {
          name,
          building,
          description,
          operatingHours,
          safetyTips,
          isDefault,
          status,
        },
      });

      await recordAuditLog({
        admin: req.user,
        action: 'PICKUP_LOCATION_UPDATED',
        entityType: 'PickupLocation',
        entityId: id,
        metadata: { updatedFields: req.body },
      });

      res.json(updated);
    } catch (error) {
      console.error('Update pickup location error:', error);
      res.status(500).json({ error: 'Failed to update pickup location' });
    }
  },
};
