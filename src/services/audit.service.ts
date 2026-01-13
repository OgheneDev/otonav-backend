import { db } from "../config/database.js";
import { auditLogs } from "../models/schema.js";
import type { auditSeverityEnum } from "../models/schema.js";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface CreateAuditLogInput {
  orgId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: "info" | "warning" | "error" | "critical";
}

export async function createAuditLog(
  input: CreateAuditLogInput
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      orgId: input.orgId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: input.details,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      severity: input.severity || "info",
      timestamp: new Date(),
    });

    console.log(`📝 Audit log created: ${input.action}`, {
      orgId: input.orgId,
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      severity: input.severity || "info",
    });
  } catch (error) {
    console.error("❌ Error creating audit log:", error);
    // Don't throw - audit logs shouldn't break the main functionality
  }
}

export async function getAuditLogs(
  filters: {
    orgId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: "info" | "warning" | "error" | "critical";
    startDate?: Date;
    endDate?: Date;
  },
  options: {
    limit?: number;
    offset?: number;
    orderBy?: "asc" | "desc";
  } = {}
): Promise<any[]> {
  try {
    const {
      orgId,
      userId,
      action,
      resourceType,
      resourceId,
      severity,
      startDate,
      endDate,
    } = filters;
    const { limit = 100, offset = 0, orderBy = "desc" } = options;

    const conditions = [];

    if (orgId) conditions.push(eq(auditLogs.orgId, orgId));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
    if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
    if (severity) conditions.push(eq(auditLogs.severity, severity));
    if (startDate) conditions.push(sql`${auditLogs.timestamp} >= ${startDate}`);
    if (endDate) conditions.push(sql`${auditLogs.timestamp} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(
        orderBy === "desc"
          ? desc(auditLogs.timestamp)
          : asc(auditLogs.timestamp)
      )
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw new Error("Failed to fetch audit logs");
  }
}

export async function getAuditLogById(logId: string): Promise<any | null> {
  try {
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, logId))
      .limit(1);

    return log || null;
  } catch (error) {
    console.error("Error fetching audit log by ID:", error);
    throw new Error("Failed to fetch audit log");
  }
}

export async function getAuditStats(orgId: string): Promise<{
  total: number;
  bySeverity: Record<string, number>;
  byAction: Record<string, number>;
  recentActions: any[];
}> {
  try {
    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId));

    // Get counts by severity
    const severityResults = await db
      .select({
        severity: auditLogs.severity,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .groupBy(auditLogs.severity);

    // Get counts by action
    const actionResults = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .groupBy(auditLogs.action)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(10);

    // Get recent actions
    const recentActions = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(20);

    const bySeverity: Record<string, number> = {};
    severityResults.forEach((row) => {
      bySeverity[row.severity] = row.count;
    });

    const byAction: Record<string, number> = {};
    actionResults.forEach((row) => {
      byAction[row.action] = row.count;
    });

    return {
      total: totalResult?.count || 0,
      bySeverity,
      byAction,
      recentActions,
    };
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    throw new Error("Failed to fetch audit statistics");
  }
}

export async function cleanupOldAuditLogs(
  daysToKeep: number = 90
): Promise<{ deletedCount: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(auditLogs)
      .where(sql`${auditLogs.timestamp} < ${cutoffDate}`)
      .returning({ id: auditLogs.id });

    console.log(
      `🧹 Cleaned up ${result.length} old audit logs (older than ${daysToKeep} days)`
    );

    return { deletedCount: result.length };
  } catch (error) {
    console.error("Error cleaning up old audit logs:", error);
    throw new Error("Failed to cleanup audit logs");
  }
}
