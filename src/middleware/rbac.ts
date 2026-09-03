import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import prisma from '../config/db.js';

/**
 * Enforce minimum role or specific roles
 */
export function requireRole(allowedRoles: ('SUPER_ADMIN' | 'COLLEGE_ADMIN' | 'STUDENT')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Insufficient privileges. Required: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Enforce College Data Isolation.
 * For COLLEGE_ADMIN:
 * 1. Overrides any collegeId query/body parameter with req.user.collegeId.
 * 2. Provides helper to verify that a target entity (student, listing, transaction, report, pickup) belongs to req.user.collegeId.
 */
export function enforceCollegeIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // SUPER_ADMIN has platform-wide visibility
  if (req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  // COLLEGE_ADMIN must have an assigned college
  if (req.user.role === 'COLLEGE_ADMIN') {
    if (!req.user.collegeId) {
      res.status(403).json({ error: 'Forbidden: College Admin is not assigned to any college' });
      return;
    }

    // Force query params to user's collegeId
    req.query.collegeId = req.user.collegeId;

    // Force body parameters to user's collegeId if present
    if (req.body && typeof req.body === 'object' && 'collegeId' in req.body) {
      req.body.collegeId = req.user.collegeId;
    }

    next();
    return;
  }

  // STUDENT is allowed
  next();
}

/**
 * Helper to verify an entity's college ownership before allowing COLLEGE_ADMIN access
 */
export async function verifyEntityCollegeOwnership(
  entityType: 'student' | 'item' | 'transaction' | 'report' | 'pickup',
  entityId: string,
  user: { role: string; collegeId?: string | null }
): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role !== 'COLLEGE_ADMIN' || !user.collegeId) return false;

  const collegeId = user.collegeId;

  switch (entityType) {
    case 'student': {
      const student = await prisma.user.findUnique({ where: { id: entityId }, select: { collegeId: true } });
      return student?.collegeId === collegeId;
    }
    case 'item': {
      const item = await prisma.item.findUnique({ where: { id: entityId }, select: { collegeId: true } });
      return item?.collegeId === collegeId;
    }
    case 'transaction': {
      const tx = await prisma.transaction.findUnique({ where: { id: entityId }, select: { collegeId: true } });
      return tx?.collegeId === collegeId;
    }
    case 'report': {
      const report = await prisma.report.findUnique({
        where: { id: entityId },
        select: {
          reporter: { select: { collegeId: true } },
          listing: { select: { collegeId: true } },
          transaction: { select: { collegeId: true } },
        },
      });
      if (!report) return false;
      return (
        report.reporter.collegeId === collegeId ||
        report.listing?.collegeId === collegeId ||
        report.transaction?.collegeId === collegeId
      );
    }
    case 'pickup': {
      const loc = await prisma.pickupLocation.findUnique({ where: { id: entityId }, select: { collegeId: true } });
      return loc?.collegeId === collegeId;
    }
    default:
      return false;
  }
}
