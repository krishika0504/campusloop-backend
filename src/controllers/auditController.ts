import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';

export const auditController = {
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { entityType, action, search } = req.query;

      const where: any = {};

      if (entityType && entityType !== 'ALL') {
        where.entityType = entityType;
      }

      if (action && action !== 'ALL') {
        where.action = action;
      }

      if (search && typeof search === 'string') {
        where.OR = [
          { adminName: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
          { entityType: { contains: search, mode: 'insensitive' } },
        ];
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const formatted = logs.map((l) => ({
        id: l.id,
        adminId: l.adminId,
        adminName: l.adminName,
        role: l.role,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        metadata: l.metadata,
        timestamp: l.timestamp.toISOString(),
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
  },
};
