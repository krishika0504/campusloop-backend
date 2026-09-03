import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';

export const conversationController = {
  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ participantAId: req.user.id }, { participantBId: req.user.id }],
        },
        include: {
          participantA: {
            select: { id: true, name: true, email: true, trustRating: true, verificationStatus: true },
          },
          participantB: {
            select: { id: true, name: true, email: true, trustRating: true, verificationStatus: true },
          },
          item: {
            select: { id: true, title: true, price: true, category: true, transactionType: true, images: { take: 1 } },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          offers: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      const formatted = conversations.map((c) => {
        const otherParticipant = c.participantAId === req.user?.id ? c.participantB : c.participantA;
        const lastMsg = c.messages[0];
        const latestOffer = c.offers[0];

        return {
          id: c.id,
          itemId: c.itemId,
          itemTitle: c.item?.title,
          itemPrice: c.item?.price,
          itemCategory: c.item?.category,
          itemImageUrl: c.item?.images[0]?.url,
          participant: otherParticipant,
          otherParticipantName: otherParticipant.name,
          isVerifiedStudent: otherParticipant.verificationStatus === 'VERIFIED',
          lastMessage: lastMsg?.text || 'Chat initiated',
          lastMessageTime: (lastMsg?.createdAt || c.lastMessageAt).toISOString(),
          unreadCount: 0,
          activeOffer: latestOffer ? {
            offerId: latestOffer.id,
            offeredPrice: latestOffer.offeredPrice,
            status: latestOffer.status,
            isBuyer: latestOffer.buyerId === req.user?.id,
          } : null,
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to retrieve conversations' });
    }
  },

  async createOrGetConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { itemId, sellerId } = req.body;

      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID is required' });
        return;
      }

      if (sellerId === req.user.id) {
        res.status(400).json({ error: 'Cannot start conversation with yourself' });
        return;
      }

      // Find existing conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { itemId: itemId || undefined },
            {
              OR: [
                { participantAId: req.user.id, participantBId: sellerId },
                { participantAId: sellerId, participantBId: req.user.id },
              ],
            },
          ],
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            itemId: itemId || null,
            participantAId: req.user.id,
            participantBId: sellerId,
          },
        });

        // Insert initial system message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: req.user.id,
            text: 'Started a conversation about this item.',
            type: 'SYSTEM',
          },
        });
      }

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  },

  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      const formatted = messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender.name,
        text: m.text,
        type: m.type,
        metadata: m.metadata,
        isMe: m.senderId === req.user?.id,
        timestamp: m.createdAt.toISOString(),
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
  },

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { text, type, metadata } = req.body;

      if (!text || text.trim() === '') {
        res.status(400).json({ error: 'Message cannot be empty' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: req.user.id,
          text: text.trim(),
          type: type || 'TEXT',
          metadata: metadata || undefined,
        },
        include: { sender: { select: { name: true } } },
      });

      // Update last message timestamp
      await prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });

      res.status(201).json({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender.name,
        text: message.text,
        type: message.type,
        metadata: message.metadata,
        isMe: true,
        timestamp: message.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },
};
