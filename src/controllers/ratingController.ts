import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';

export const ratingController = {
  async createRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { transactionId, rating, review } = req.body;

      if (!transactionId || rating === undefined) {
        res.status(400).json({ error: 'Transaction ID and rating are required' });
        return;
      }

      const numRating = parseFloat(rating);
      if (numRating < 1 || numRating > 5) {
        res.status(400).json({ error: 'Rating must be between 1.0 and 5.0' });
        return;
      }

      const tx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { item: true },
      });

      if (!tx) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Check user participated
      const isBuyer = tx.buyerId === req.user.id;
      const isSeller = tx.sellerId === req.user.id;
      if (!isBuyer && !isSeller) {
        res.status(403).json({ error: 'You did not participate in this transaction' });
        return;
      }

      // Determine ratee
      const rateeId = isBuyer ? tx.sellerId : tx.buyerId;

      // Prevent duplicate ratings for same transaction
      const existing = await prisma.rating.findUnique({
        where: {
          transactionId_raterId: {
            transactionId: tx.id,
            raterId: req.user.id,
          },
        },
      });

      if (existing) {
        res.status(409).json({ error: 'You have already submitted a rating for this transaction' });
        return;
      }

      const newRating = await prisma.rating.create({
        data: {
          transactionId: tx.id,
          raterId: req.user.id,
          rateeId,
          rating: numRating,
          review: review || null,
        },
        include: {
          rater: { select: { name: true } },
        },
      });

      // Recalculate ratee's average trust rating
      const allRatings = await prisma.rating.findMany({
        where: { rateeId },
        select: { rating: true },
      });

      const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      await prisma.user.update({
        where: { id: rateeId },
        data: { trustRating: parseFloat(avgRating.toFixed(1)) },
      });

      // Update transaction status to RATED if both rated or transaction completed
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'RATED' },
      });

      res.status(201).json({
        rating: newRating,
        message: 'Rating submitted successfully and user trust score updated.',
      });
    } catch (error) {
      console.error('Create rating error:', error);
      res.status(500).json({ error: 'Failed to create rating' });
    }
  },

  async getUserRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          trustRating: true,
          totalTransactions: true,
          verificationStatus: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const ratings = await prisma.rating.findMany({
        where: { rateeId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          rater: { select: { id: true, name: true, avatarUrl: true } },
          transaction: { select: { transactionType: true, item: { select: { title: true } } } },
        },
      });

      const formatted = ratings.map((r) => ({
        id: r.id,
        rating: r.rating,
        feedback: r.review,
        review: r.review,
        raterName: r.rater.name,
        raterId: r.rater.id,
        resourceTitle: r.transaction?.item?.title || 'Campus Exchange',
        createdAt: r.createdAt.toISOString(),
      }));

      res.json({
        user,
        averageRating: user.trustRating,
        totalReviews: ratings.length,
        ratings: formatted,
      });
    } catch (error) {
      console.error('Get user ratings error:', error);
      res.status(500).json({ error: 'Failed to retrieve ratings' });
    }
  },
};
