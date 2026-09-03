import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import { generateToken } from '../utils/token.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  university: z.string().optional(),
  collegeId: z.string().optional(),
  department: z.string().optional(),
  academicYear: z.string().optional(),
  rollNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
        return;
      }

      const { name, email, password, university, collegeId: reqCollegeId, department, academicYear, rollNumber } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'User already exists with this email' });
        return;
      }

      // Auto-match college by domain or ID
      let collegeId = reqCollegeId;
      if (!collegeId) {
        const domain = email.split('@')[1];
        if (domain) {
          const matchedCollege = await prisma.college.findFirst({
            where: { emailDomain: { equals: domain, mode: 'insensitive' } },
          });
          if (matchedCollege) collegeId = matchedCollege.id;
        }
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'STUDENT',
          collegeId: collegeId || null,
          department: department || 'General Studies',
          academicYear: academicYear || '1st Year',
          rollNumber: rollNumber || null,
          verificationStatus: 'EMAIL_PENDING',
        },
        include: { college: true },
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        name: user.name,
      });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          collegeName: user.college?.name,
          department: user.department,
          academicYear: user.academicYear,
          verificationStatus: user.verificationStatus,
          trustRating: user.trustRating,
          totalTransactions: user.totalTransactions,
          co2SavedKg: user.co2SavedKg,
          moneySavedUsd: user.moneySavedUsd,
          itemsCirculated: user.itemsCirculated,
        },
        tokens: {
          accessToken: token,
          refreshToken: token,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid email or password' });
        return;
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { college: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ error: 'Account suspended. Please contact your college administrator.' });
        return;
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        name: user.name,
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          collegeName: user.college?.name,
          department: user.department,
          academicYear: user.academicYear,
          verificationStatus: user.verificationStatus,
          trustRating: user.trustRating,
          totalTransactions: user.totalTransactions,
          co2SavedKg: user.co2SavedKg,
          moneySavedUsd: user.moneySavedUsd,
          itemsCirculated: user.itemsCirculated,
          createdAt: user.createdAt.toISOString(),
        },
        tokens: {
          accessToken: token,
          refreshToken: token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  },

  async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid email or password' });
        return;
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { college: true },
      });

      if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COLLEGE_ADMIN')) {
        res.status(401).json({ error: 'Access denied: Admin credentials required' });
        return;
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ error: 'Admin account is deactivated' });
        return;
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        name: user.name,
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId || undefined,
          collegeName: user.college?.name,
          createdAt: user.createdAt.toISOString(),
        },
        tokens: {
          accessToken: token,
          refreshToken: token,
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Internal server error during admin login' });
    }
  },

  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { college: true },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        collegeName: user.college?.name,
        department: user.department,
        academicYear: user.academicYear,
        verificationStatus: user.verificationStatus,
        verificationNote: user.verificationNote,
        verifiedAt: user.verifiedAt?.toISOString(),
        trustRating: user.trustRating,
        totalTransactions: user.totalTransactions,
        co2SavedKg: user.co2SavedKg,
        moneySavedUsd: user.moneySavedUsd,
        itemsCirculated: user.itemsCirculated,
        strikes: user.strikes,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async submitVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { studentIdNumber, documentUrl } = req.body;

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          verificationStatus: 'ID_PENDING',
          rollNumber: studentIdNumber || undefined,
          verificationNote: 'Student submitted ID verification document',
        },
      });

      res.json({
        message: 'Verification submitted successfully for campus admin review',
        verificationStatus: updated.verificationStatus,
      });
    } catch (error) {
      console.error('Verification submission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Logged out successfully' });
  },
};
