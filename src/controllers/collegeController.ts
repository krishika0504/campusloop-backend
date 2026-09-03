import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../config/db.js';
import { recordAuditLog } from '../middleware/audit.js';

export const collegeController = {
  async getColleges(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { search, status } = req.query;

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { emailDomain: { contains: search, mode: 'insensitive' } },
        ];
      }

      const colleges = await prisma.college.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { students: true, items: true, transactions: true },
          },
          pickupLocations: {
            where: { status: 'ACTIVE' },
            select: { name: true },
          },
        },
      });

      const formatted = colleges.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        domain: c.emailDomain,
        emailDomain: c.emailDomain,
        city: c.city,
        state: c.state,
        country: c.country,
        logo: c.logo || undefined,
        contactPerson: c.contactPerson || c.adminName || '',
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone || '',
        adminName: c.adminName || '',
        status: c.status,
        subscriptionPlan: c.subscriptionPlan,
        subscriptionStatus: c.subscriptionStatus,
        studentCount: c._count.students,
        listingCount: c._count.items,
        circularityScore: c.circularityScore,
        onboardedAt: c.createdAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
        pickupHubs: c.pickupLocations.map((p) => p.name),
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get colleges error:', error);
      res.status(500).json({ error: 'Failed to retrieve colleges' });
    }
  },

  async getCollegeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // COLLEGE_ADMIN cannot access details of another college
      if (req.user?.role === 'COLLEGE_ADMIN' && req.user.collegeId !== id) {
        res.status(403).json({ error: 'Forbidden: Access to other college data is denied' });
        return;
      }

      const college = await prisma.college.findUnique({
        where: { id },
        include: {
          _count: {
            select: { students: true, items: true, transactions: true },
          },
          pickupLocations: true,
          collegeAdmins: {
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
          },
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const reportCount = await prisma.report.count({
        where: { reporter: { collegeId: id } },
      });

      if (!college) {
        res.status(404).json({ error: 'College not found' });
        return;
      }

      res.json({
        id: college.id,
        name: college.name,
        code: college.code,
        domain: college.emailDomain,
        emailDomain: college.emailDomain,
        city: college.city,
        state: college.state,
        country: college.country,
        logo: college.logo || undefined,
        contactPerson: college.contactPerson || college.adminName || '',
        contactEmail: college.contactEmail,
        contactPhone: college.contactPhone || '',
        adminName: college.adminName || '',
        status: college.status,
        subscriptionPlan: college.subscriptionPlan,
        subscriptionStatus: college.subscriptionStatus,
        studentCount: college._count.students,
        listingCount: college._count.items,
        transactionCount: college._count.transactions,
        reportCount,
        circularityScore: college.circularityScore,
        onboardedAt: college.createdAt.toISOString(),
        createdAt: college.createdAt.toISOString(),
        pickupHubs: college.pickupLocations.map((p) => p.name),
        pickupLocations: college.pickupLocations,
        admins: college.collegeAdmins.map((a) => a.user),
        currentSubscription: college.subscriptions[0] || null,
      });
    } catch (error) {
      console.error('Get college by id error:', error);
      res.status(500).json({ error: 'Failed to retrieve college details' });
    }
  },

  async createCollege(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, code, domain, emailDomain, city, state, country, contactEmail, contactPhone, adminName, pickupHubs } = req.body;
      const cleanDomain = (domain || emailDomain || '').toLowerCase().trim();

      if (!name || !code || !cleanDomain || !contactEmail) {
        res.status(400).json({ error: 'Missing required college fields' });
        return;
      }

      const existingCode = await prisma.college.findUnique({ where: { code: code.toUpperCase() } });
      if (existingCode) {
        res.status(409).json({ error: 'A college with this code already exists' });
        return;
      }

      const existingDomain = await prisma.college.findUnique({ where: { emailDomain: cleanDomain } });
      if (existingDomain) {
        res.status(409).json({ error: 'A college with this email domain already exists' });
        return;
      }

      const college = await prisma.college.create({
        data: {
          name,
          code: code.toUpperCase(),
          emailDomain: cleanDomain,
          city: city || 'City',
          state: state || 'State',
          country: country || 'India',
          contactEmail,
          contactPhone: contactPhone || null,
          adminName: adminName || null,
          status: 'ACTIVE',
          subscriptionPlan: 'STANDARD',
          subscriptionStatus: 'ACTIVE',
        },
      });

      // Automatically create initial campus pickup locations if provided
      const hubs = Array.isArray(pickupHubs) && pickupHubs.length > 0 ? pickupHubs : ['Main Library', 'Student Center'];
      for (const hubName of hubs) {
        await prisma.pickupLocation.create({
          data: {
            collegeId: college.id,
            name: hubName,
            building: 'Campus Quad',
            description: `Designated safe exchange location at ${hubName}`,
          },
        });
      }

      // Automatically create default annual subscription
      await prisma.subscription.create({
        data: {
          collegeId: college.id,
          plan: 'STANDARD',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          amount: 49999.0,
          billingCycle: 'ANNUAL',
        },
      });

      if (req.user) {
        await recordAuditLog({
          admin: req.user,
          action: 'COLLEGE_CREATED',
          entityType: 'College',
          entityId: college.id,
          metadata: { name: college.name, code: college.code },
        });
      }

      res.status(201).json(college);
    } catch (error) {
      console.error('Create college error:', error);
      res.status(500).json({ error: 'Failed to create college' });
    }
  },

  async updateCollege(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, city, state, country, contactEmail, contactPhone, adminName, subscriptionPlan } = req.body;

      const college = await prisma.college.update({
        where: { id },
        data: {
          name,
          city,
          state,
          country,
          contactEmail,
          contactPhone,
          adminName,
          subscriptionPlan,
        },
      });

      if (req.user) {
        await recordAuditLog({
          admin: req.user,
          action: 'COLLEGE_UPDATED',
          entityType: 'College',
          entityId: college.id,
          metadata: { updatedFields: req.body },
        });
      }

      res.json(college);
    } catch (error) {
      console.error('Update college error:', error);
      res.status(500).json({ error: 'Failed to update college' });
    }
  },

  async updateCollegeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const college = await prisma.college.update({
        where: { id },
        data: { status },
      });

      if (req.user) {
        await recordAuditLog({
          admin: req.user,
          action: status === 'ACTIVE' ? 'COLLEGE_ACTIVATED' : 'COLLEGE_SUSPENDED',
          entityType: 'College',
          entityId: college.id,
          metadata: { newStatus: status },
        });
      }

      res.json(college);
    } catch (error) {
      console.error('Update college status error:', error);
      res.status(500).json({ error: 'Failed to update college status' });
    }
  },
};
