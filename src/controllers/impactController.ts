import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';

export const impactController = {
  async getImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { collegeId: queryCollegeId } = req.query;

      let collegeId: string | undefined;
      if (req.user?.role === 'COLLEGE_ADMIN') {
        collegeId = req.user.collegeId || undefined;
      } else if (queryCollegeId && queryCollegeId !== 'ALL') {
        collegeId = queryCollegeId as string;
      }

      const filter = collegeId ? { collegeId } : {};

      const [
        totalCompleted,
        borrowCount,
        exchangeCount,
        donateCount,
        sellCount,
        students,
        colleges,
      ] = await Promise.all([
        prisma.transaction.count({
          where: { status: { in: ['COMPLETED', 'RATED'] }, ...filter },
        }),
        prisma.transaction.count({
          where: { transactionType: 'BORROW', status: { in: ['COMPLETED', 'RATED', 'BORROWED'] }, ...filter },
        }),
        prisma.transaction.count({
          where: { transactionType: 'EXCHANGE', status: { in: ['COMPLETED', 'RATED'] }, ...filter },
        }),
        prisma.transaction.count({
          where: { transactionType: 'DONATE', status: { in: ['COMPLETED', 'RATED'] }, ...filter },
        }),
        prisma.transaction.count({
          where: { transactionType: 'SELL', status: { in: ['COMPLETED', 'RATED'] }, ...filter },
        }),
        prisma.user.aggregate({
          where: { role: 'STUDENT', ...filter },
          _sum: { co2SavedKg: true, moneySavedUsd: true, itemsCirculated: true },
        }),
        prisma.college.findMany({
          where: collegeId ? { id: collegeId } : { status: 'ACTIVE' },
          select: { id: true, name: true, code: true, circularityScore: true },
        }),
      ]);

      const itemsReused = Math.max(totalCompleted, (students._sum.itemsCirculated || 0));
      const totalCo2SavedKg = Math.max(Math.round(itemsReused * 8.5), Math.round(students._sum.co2SavedKg || 0));
      const totalMoneySavedInr = Math.max(Math.round(itemsReused * 450), Math.round((students._sum.moneySavedUsd || 0) * 85));
      const totalWasteDivertedKg = Math.round(itemsReused * 1.1);

      res.json({
        summary: {
          itemsReused,
          totalCompletedTransfers: totalCompleted,
          borrowTransactions: borrowCount,
          exchangeTransactions: exchangeCount,
          donationTransactions: donateCount,
          sellTransactions: sellCount,
          studentSavingsInr: totalMoneySavedInr,
          co2AvoidedKg: totalCo2SavedKg,
          wasteDivertedKg: totalWasteDivertedKg,
          treesEquivalent: Math.round(totalCo2SavedKg / 21), // ~21kg CO2 sequestered per tree per year
        },
        methodology: {
          co2FactorPerTextbook: '2.5 kg CO2e / unit',
          co2FactorPerDevice: '45.0 kg CO2e / unit',
          co2FactorPerLabTool: '12.0 kg CO2e / unit',
          wasteFactor: '~1.1 kg landfill diversion per reused item',
          savingsFormula: 'Buy/Sell: MarketRetail - AgreedPrice; Borrow: 100% Replacement value saved; Donate: 100% value saved',
        },
        collegeComparison: colleges.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          circularityScore: c.circularityScore,
        })),
      });
    } catch (error) {
      console.error('Get impact error:', error);
      res.status(500).json({ error: 'Failed to retrieve impact metrics' });
    }
  },

  async getUserImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          _count: {
            select: { buyerTransactions: true, sellerTransactions: true, ownedItems: true },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const [userBorrows, userExchanges, userDonations] = await Promise.all([
        prisma.transaction.count({
          where: {
            OR: [{ buyerId: user.id }, { sellerId: user.id }],
            transactionType: 'BORROW',
          },
        }),
        prisma.transaction.count({
          where: {
            OR: [{ buyerId: user.id }, { sellerId: user.id }],
            transactionType: 'EXCHANGE',
          },
        }),
        prisma.transaction.count({
          where: {
            OR: [{ buyerId: user.id }, { sellerId: user.id }],
            transactionType: 'DONATE',
          },
        }),
      ]);

      const itemsReused = user.itemsCirculated;
      const co2Saved = user.co2SavedKg;
      const moneySaved = user.moneySavedUsd;

      res.json({
        userId: user.id,
        userName: user.name,
        itemsReused,
        transactionsCompleted: user.totalTransactions,
        itemsBorrowed: userBorrows,
        itemsExchanged: userExchanges,
        itemsDonated: userDonations,
        moneySavedInr: Math.round(moneySaved * 85),
        co2SavedKg: co2Saved,
        wasteDivertedKg: Math.round(itemsReused * 1.1),
        trustRating: user.trustRating,
      });
    } catch (error) {
      console.error('Get user impact error:', error);
      res.status(500).json({ error: 'Failed to retrieve user impact' });
    }
  },
};
