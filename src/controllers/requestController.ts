import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';

export const requestController = {
  async getRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requests = await prisma.request.findMany({
        where: {
          OR: [
            { requesterId: req.user.id },
            { item: { sellerId: req.user.id } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, title: true, price: true, category: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      });

      res.json(requests);
    } catch (error) {
      console.error('Get requests error:', error);
      res.status(500).json({ error: 'Failed to retrieve requests' });
    }
  },

  async createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { itemId, message } = req.body;

      if (!itemId) {
        res.status(400).json({ error: 'Item ID is required' });
        return;
      }

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      const request = await prisma.request.create({
        data: {
          itemId,
          requesterId: req.user.id,
          message: message || null,
          status: 'PENDING',
        },
      });

      res.status(201).json(request);
    } catch (error) {
      console.error('Create request error:', error);
      res.status(500).json({ error: 'Failed to create request' });
    }
  },
};
