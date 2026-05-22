import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export class AuditService {
  static async log(userId: number | null, action: string, details: string, ipAddress?: string) {
    try {
      await prisma.auditLog.create({
        data: {
          user_id: userId,
          action,
          details,
          ip_address: ipAddress || null,
        },
      });
      logger.info(`Audit Log [${action}]: ${details} (User: ${userId || 'System'})`);
    } catch (error) {
      logger.error(`Failed to write Audit Log: ${error}`);
    }
  }
}
