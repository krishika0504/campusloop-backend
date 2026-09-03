import prisma from '../config/db.js';
import { TokenPayload } from '../utils/token.js';

export interface AuditLogParams {
  admin: TokenPayload;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function recordAuditLog({
  admin,
  action,
  entityType,
  entityId,
  metadata,
}: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name,
        role: admin.role,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
