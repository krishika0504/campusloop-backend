import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';
import { generateQrVerificationCode } from '../utils/qr.js';

export const offerController = {
  async createOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { itemId, conversationId, offeredPrice, message } = req.body;

      if (!itemId || offeredPrice === undefined) {
        res.status(400).json({ error: 'Item ID and offered price are required' });
        return;
      }

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      if (item.sellerId === req.user.id) {
        res.status(400).json({ error: 'Cannot make an offer on your own item' });
        return;
      }

      const offer = await prisma.offer.create({
        data: {
          itemId,
          conversationId: conversationId || null,
          buyerId: req.user.id,
          sellerId: item.sellerId,
          originalPrice: item.price,
          offeredPrice: parseFloat(offeredPrice),
          message: message || null,
          status: 'PENDING',
        },
      });

      // Post offer message into conversation if available
      if (conversationId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: req.user.id,
            text: `Proposed an offer: ₹${offer.offeredPrice.toFixed(2)}${message ? ` - "${message}"` : ''}`,
            type: 'OFFER',
            metadata: {
              offerId: offer.id,
              offeredPrice: offer.offeredPrice,
              status: offer.status,
            },
          },
        });
      }

      res.status(201).json(offer);
    } catch (error) {
      console.error('Create offer error:', error);
      res.status(500).json({ error: 'Failed to create offer' });
    }
  },

  async acceptOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const offer = await prisma.offer.findUnique({
        where: { id },
        include: { item: true },
      });

      if (!offer) {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }

      // Can be accepted by seller (if buyer initiated) or buyer (if seller countered)
      const isSeller = offer.sellerId === req.user.id;
      const isBuyer = offer.buyerId === req.user.id;

      if (!isSeller && !isBuyer) {
        res.status(403).json({ error: 'You are not a participant in this offer' });
        return;
      }

      if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
        res.status(400).json({ error: `Cannot accept offer in ${offer.status} status` });
        return;
      }

      // The final agreed price:
      const finalPrice = offer.counterPrice !== null && offer.status === 'COUNTERED'
        ? offer.counterPrice
        : offer.offeredPrice;

      // Update offer status
      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });

      // Find or create transaction and LOCK agreed price
      let transaction = await prisma.transaction.findFirst({
        where: {
          itemId: offer.itemId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          status: { in: ['REQUESTED', 'NEGOTIATING', 'AGREED'] },
        },
      });

      const qrCode = generateQrVerificationCode(offer.itemId, offer.buyerId, offer.sellerId);

      if (transaction) {
        transaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            agreedPrice: finalPrice, // STRICT: lock agreed price from offer
            status: 'AGREED',
            qrVerificationCode: qrCode,
          },
        });
      } else {
        transaction = await prisma.transaction.create({
          data: {
            itemId: offer.itemId,
            buyerId: offer.buyerId,
            sellerId: offer.sellerId,
            collegeId: offer.item.collegeId,
            transactionType: offer.item.transactionType,
            agreedPrice: finalPrice, // STRICT: lock agreed price from offer
            status: 'AGREED',
            pickupLocationId: offer.item.pickupLocationId,
            qrVerificationCode: qrCode,
          },
        });
      }

      // Notify conversation
      if (offer.conversationId) {
        await prisma.message.create({
          data: {
            conversationId: offer.conversationId,
            senderId: req.user.id,
            text: `Offer ACCEPTED at ₹${finalPrice.toFixed(2)}! Transaction created (ID: ${transaction.id}).`,
            type: 'OFFER',
            metadata: {
              offerId: offer.id,
              transactionId: transaction.id,
              agreedPrice: finalPrice,
              status: 'ACCEPTED',
            },
          },
        });
      }

      res.json({
        offer: updatedOffer,
        transaction,
        message: `Offer accepted at ₹${finalPrice}. Transaction price locked.`,
      });
    } catch (error) {
      console.error('Accept offer error:', error);
      res.status(500).json({ error: 'Failed to accept offer' });
    }
  },

  async rejectOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const offer = await prisma.offer.findUnique({ where: { id } });

      if (!offer) {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }

      if (offer.sellerId !== req.user.id && offer.buyerId !== req.user.id) {
        res.status(403).json({ error: 'You are not a participant in this offer' });
        return;
      }

      const updated = await prisma.offer.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      if (offer.conversationId) {
        await prisma.message.create({
          data: {
            conversationId: offer.conversationId,
            senderId: req.user.id,
            text: `Declined offer of ₹${offer.offeredPrice.toFixed(2)}.`,
            type: 'OFFER',
            metadata: { offerId: offer.id, status: 'REJECTED' },
          },
        });
      }

      res.json(updated);
    } catch (error) {
      console.error('Reject offer error:', error);
      res.status(500).json({ error: 'Failed to reject offer' });
    }
  },

  async counterOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { counterPrice, message } = req.body;

      if (counterPrice === undefined) {
        res.status(400).json({ error: 'Counter price is required' });
        return;
      }

      const parentOffer = await prisma.offer.findUnique({ where: { id } });
      if (!parentOffer) {
        res.status(404).json({ error: 'Parent offer not found' });
        return;
      }

      // Mark parent as COUNTERED
      await prisma.offer.update({
        where: { id },
        data: {
          status: 'COUNTERED',
          counterPrice: parseFloat(counterPrice),
          counterBy: req.user.id,
        },
      });

      // Create new child counter offer
      const newOffer = await prisma.offer.create({
        data: {
          itemId: parentOffer.itemId,
          conversationId: parentOffer.conversationId,
          buyerId: parentOffer.buyerId,
          sellerId: parentOffer.sellerId,
          originalPrice: parentOffer.originalPrice,
          offeredPrice: parseFloat(counterPrice),
          status: 'PENDING',
          parentOfferId: parentOffer.id,
          message: message || null,
        },
      });

      if (parentOffer.conversationId) {
        await prisma.message.create({
          data: {
            conversationId: parentOffer.conversationId,
            senderId: req.user.id,
            text: `Proposed counteroffer: ₹${newOffer.offeredPrice.toFixed(2)}${message ? ` - "${message}"` : ''}`,
            type: 'OFFER',
            metadata: {
              offerId: newOffer.id,
              parentOfferId: parentOffer.id,
              offeredPrice: newOffer.offeredPrice,
              status: 'COUNTERED',
            },
          },
        });
      }

      res.status(201).json(newOffer);
    } catch (error) {
      console.error('Counter offer error:', error);
      res.status(500).json({ error: 'Failed to counter offer' });
    }
  },
};
