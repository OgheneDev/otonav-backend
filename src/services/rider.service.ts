// services/rider.service.ts - FIXED VERSION
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  users,
  organizations,
  auditLogs,
  userOrganizations,
} from "../models/schema.js";
import { sendEmail } from "./email.service.js";
import { createAuditLog } from "./audit.service.js";

// Define a union type for registration status
export type RegistrationStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "expired";

export interface Rider {
  id: string;
  email: string;
  name: string | null;
  globalRole: string;
  phoneNumber: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  registrationCompleted: boolean | null;
  registrationStatus: RegistrationStatus | null; // Can be null

  // Organization-specific information
  orgMembership: {
    orgId: string;
    orgName: string;
    role: string;
    isActive: boolean;
    isSuspended: boolean;
    registrationStatus: RegistrationStatus | null; // Can be null
    invitedAt: Date | null;
    invitationSentAt: Date | null;
    joinedAt: Date | null;
    suspensionReason?: string;
    suspensionExpires?: Date;
  };
}

export interface UpdateRiderStatusInput {
  reason?: string;
  notes?: string;
  suspensionDurationDays?: number;
}

export class RiderService {
  /**
   * Get all riders in an organization including pending ones
   */
  async getRidersByOrganization(
    orgId: string,
    includeSuspended: boolean = false,
    includePending: boolean = true
  ): Promise<Rider[]> {
    try {
      const whereConditions = [
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "rider"),
      ];

      if (!includeSuspended) {
        whereConditions.push(eq(userOrganizations.isSuspended, false));
      }

      const memberships = await db
        .select({
          userId: userOrganizations.userId,
          orgId: userOrganizations.orgId,
          role: userOrganizations.role,
          isActive: userOrganizations.isActive,
          isSuspended: userOrganizations.isSuspended,
          registrationStatus: userOrganizations.registrationStatus,
          invitedAt: userOrganizations.invitedAt,
          invitationSentAt: userOrganizations.invitationSentAt,
          joinedAt: userOrganizations.joinedAt,
          suspensionReason: userOrganizations.suspensionReason,
          suspensionExpires: userOrganizations.suspensionExpires,
          orgName: organizations.name,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.orgId, organizations.id))
        .innerJoin(users, eq(userOrganizations.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(userOrganizations.invitedAt));

      const userIds = memberships.map((m) => m.userId);
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          globalRole: users.role,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          registrationCompleted: users.registrationCompleted,
          registrationStatus: users.registrationStatus,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      const userMap = new Map(userList.map((user) => [user.id, user]));

      const riders: Rider[] = memberships
        .filter((membership) => userMap.has(membership.userId))
        .map((membership) => {
          const user = userMap.get(membership.userId)!;
          return {
            ...user,
            registrationStatus:
              user.registrationStatus as RegistrationStatus | null,
            orgMembership: {
              orgId: membership.orgId,
              orgName: membership.orgName,
              role: membership.role,
              isActive: membership.isActive,
              isSuspended: membership.isSuspended,
              registrationStatus:
                membership.registrationStatus as RegistrationStatus | null,
              invitedAt: membership.invitedAt,
              invitationSentAt: membership.invitationSentAt,
              joinedAt: membership.joinedAt,
              suspensionReason: membership.suspensionReason || undefined,
              suspensionExpires: membership.suspensionExpires || undefined,
            },
          };
        });

      // Filter out pending riders if requested
      if (!includePending) {
        return riders.filter(
          (rider) => rider.orgMembership.registrationStatus !== "pending"
        );
      }

      return riders;
    } catch (error) {
      console.error("Error fetching riders:", error);
      throw new Error("Failed to fetch riders");
    }
  }

  /**
   * Get a single rider by ID within an organization
   */
  async getRiderById(riderId: string, orgId: string): Promise<Rider | null> {
    try {
      const [membership] = await db
        .select({
          userId: userOrganizations.userId,
          orgId: userOrganizations.orgId,
          role: userOrganizations.role,
          isActive: userOrganizations.isActive,
          isSuspended: userOrganizations.isSuspended,
          registrationStatus: userOrganizations.registrationStatus,
          invitedAt: userOrganizations.invitedAt,
          invitationSentAt: userOrganizations.invitationSentAt,
          joinedAt: userOrganizations.joinedAt,
          suspensionReason: userOrganizations.suspensionReason,
          suspensionExpires: userOrganizations.suspensionExpires,
          orgName: organizations.name,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.orgId, organizations.id))
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.role, "rider")
          )
        )
        .limit(1);

      if (!membership) return null;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          globalRole: users.role,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          registrationCompleted: users.registrationCompleted,
          registrationStatus: users.registrationStatus,
        })
        .from(users)
        .where(eq(users.id, riderId))
        .limit(1);

      if (!user) return null;

      return {
        ...user,
        registrationStatus:
          user.registrationStatus as RegistrationStatus | null,
        orgMembership: {
          orgId: membership.orgId,
          orgName: membership.orgName,
          role: membership.role,
          isActive: membership.isActive,
          isSuspended: membership.isSuspended,
          registrationStatus:
            membership.registrationStatus as RegistrationStatus | null,
          invitedAt: membership.invitedAt,
          invitationSentAt: membership.invitationSentAt,
          joinedAt: membership.joinedAt,
          suspensionReason: membership.suspensionReason || undefined,
          suspensionExpires: membership.suspensionExpires || undefined,
        },
      };
    } catch (error) {
      console.error("Error fetching rider:", error);
      throw new Error("Failed to fetch rider");
    }
  }

  /**
   * Check if a rider invitation is still pending
   */
  async isInvitationPending(riderId: string, orgId: string): Promise<boolean> {
    try {
      const [membership] = await db
        .select({ registrationStatus: userOrganizations.registrationStatus })
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.role, "rider")
          )
        )
        .limit(1);

      return membership?.registrationStatus === "pending";
    } catch (error) {
      console.error("Error checking invitation status:", error);
      return false;
    }
  }

  /**
   * Suspend a rider from a specific organization
   */
  async suspendRider(
    riderId: string,
    orgId: string,
    actorUserId: string,
    data: UpdateRiderStatusInput = {}
  ): Promise<Rider> {
    try {
      // First, verify the rider exists and belongs to the organization
      const rider = await this.getRiderById(riderId, orgId);
      if (!rider) {
        throw new Error("Rider not found in this organization");
      }

      if (rider.orgMembership.isSuspended) {
        throw new Error("Rider is already suspended");
      }

      // Calculate suspension expiry
      const suspensionDuration = data.suspensionDurationDays || 30;
      const suspensionExpires = new Date();
      suspensionExpires.setDate(
        suspensionExpires.getDate() + suspensionDuration
      );

      // Update suspension status in user_organizations
      await db
        .update(userOrganizations)
        .set({
          isSuspended: true,
          suspensionReason: data.reason || "Violation of terms of service",
          suspensionExpires: suspensionExpires,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId)
          )
        );

      // Send suspension email
      await this.sendSuspensionEmail(rider, data.reason, suspensionDuration);

      // Create audit log
      await createAuditLog({
        orgId,
        userId: actorUserId,
        action: "rider.suspended",
        resourceType: "user",
        resourceId: riderId,
        details: {
          reason: data.reason,
          notes: data.notes,
          suspensionDurationDays: suspensionDuration,
          suspensionExpires: suspensionExpires,
        },
        severity: "warning",
      });

      // Return updated rider
      return (await this.getRiderById(riderId, orgId)) as Rider;
    } catch (error) {
      console.error("Error suspending rider:", error);
      throw error;
    }
  }

  /**
   * Unsuspend a rider from a specific organization
   */
  async unsuspendRider(
    riderId: string,
    orgId: string,
    actorUserId: string
  ): Promise<Rider> {
    try {
      // First, verify the rider exists and belongs to the organization
      const rider = await this.getRiderById(riderId, orgId);
      if (!rider) {
        throw new Error("Rider not found in this organization");
      }

      if (!rider.orgMembership.isSuspended) {
        throw new Error("Rider is not suspended");
      }

      // Remove suspension
      await db
        .update(userOrganizations)
        .set({
          isSuspended: false,
          suspensionReason: null,
          suspensionExpires: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId)
          )
        );

      // Create audit log
      await createAuditLog({
        orgId,
        userId: actorUserId,
        action: "rider.unsuspended",
        resourceType: "user",
        resourceId: riderId,
        details: {},
        severity: "info",
      });

      // Return updated rider
      return (await this.getRiderById(riderId, orgId)) as Rider;
    } catch (error) {
      console.error("Error unsuspending rider:", error);
      throw error;
    }
  }

  /**
   * Remove a rider from organization (handles pending riders differently)
   */
  async removeRiderFromOrganization(
    riderId: string,
    orgId: string,
    actorUserId: string,
    data: UpdateRiderStatusInput = {}
  ): Promise<{ success: boolean; message: string; removedFromOrg: boolean }> {
    try {
      const rider = await this.getRiderById(riderId, orgId);
      if (!rider) {
        throw new Error("Rider not found in this organization");
      }

      const isPending = rider.orgMembership.registrationStatus === "pending";

      // Remove from user_organizations table
      await db
        .delete(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId)
          )
        );

      // Send different email for pending vs active riders
      if (isPending) {
        await this.sendInvitationCancelledEmail(rider, data.reason);
      } else {
        await this.sendRemovalEmail(rider, data.reason);
      }

      // Create audit log
      await createAuditLog({
        orgId,
        userId: actorUserId,
        action: isPending ? "rider.invitation_cancelled" : "rider.removed",
        resourceType: "user",
        resourceId: riderId,
        details: {
          reason: data.reason,
          notes: data.notes,
          wasPending: isPending,
        },
        severity: "warning",
      });

      return {
        success: true,
        message: isPending
          ? "Invitation cancelled successfully"
          : "Rider successfully removed from organization",
        removedFromOrg: true,
      };
    } catch (error) {
      console.error("Error removing rider:", error);
      throw error;
    }
  }

  /**
   * Send invitation cancelled email
   */
  private async sendInvitationCancelledEmail(
    rider: Rider,
    reason?: string
  ): Promise<void> {
    try {
      const emailData = {
        riderName: rider.name || rider.email,
        organizationName: rider.orgMembership.orgName,
        cancellationDate: new Date().toLocaleDateString(),
        reason: reason || "Invitation cancelled by organization",
        contactEmail: process.env.SUPPORT_EMAIL || "support@example.com",
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #fff; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .notice { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Invitation Cancelled - ${emailData.organizationName}</h2>
                </div>
                <div class="content">
                    <p>Dear ${emailData.riderName},</p>
                    
                    <div class="notice">
                        <p><strong>Your invitation to join ${emailData.organizationName} has been cancelled.</strong></p>
                    </div>
                    
                    <p><strong>Details:</strong></p>
                    <ul>
                        <li><strong>Organization:</strong> ${emailData.organizationName}</li>
                        <li><strong>Cancellation Date:</strong> ${emailData.cancellationDate}</li>
                        <li><strong>Reason:</strong> ${emailData.reason}</li>
                    </ul>
                    
                    <p>This means you will no longer be able to complete registration for ${emailData.organizationName}.</p>
                    
                    <p>If you believe this cancellation is in error, please contact 
                    <a href="mailto:${emailData.contactEmail}">${emailData.contactEmail}</a>.</p>
                    
                    <p>Best regards,<br>
                    The ${emailData.organizationName} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: rider.email,
        subject: `Invitation Cancelled - ${emailData.organizationName}`,
        html,
      });

      console.log(`Invitation cancelled email sent to ${rider.email}`);
    } catch (error) {
      console.error("Error sending invitation cancelled email:", error);
    }
  }

  /**
   * Send suspension email to rider
   */
  private async sendSuspensionEmail(
    rider: Rider,
    reason?: string,
    suspensionDurationDays: number = 30
  ): Promise<void> {
    try {
      const emailData = {
        riderName: rider.name || rider.email,
        organizationName: rider.orgMembership.orgName,
        suspensionDate: new Date().toLocaleDateString(),
        suspensionDurationDays: suspensionDurationDays,
        reason: reason || "Violation of terms of service",
        contactEmail: process.env.SUPPORT_EMAIL || "support@example.com",
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #fff; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Account Suspension Notice - ${emailData.organizationName}</h2>
                </div>
                <div class="content">
                    <p>Dear ${emailData.riderName},</p>
                    
                    <div class="warning">
                        <p><strong>Your rider account with ${emailData.organizationName} has been suspended for ${emailData.suspensionDurationDays} days.</strong></p>
                    </div>
                    
                    <p><strong>Suspension Details:</strong></p>
                    <ul>
                        <li><strong>Date:</strong> ${emailData.suspensionDate}</li>
                        <li><strong>Organization:</strong> ${emailData.organizationName}</li>
                        <li><strong>Duration:</strong> ${emailData.suspensionDurationDays} days</li>
                        <li><strong>Reason:</strong> ${emailData.reason}</li>
                    </ul>
                    
                    <p>During this suspension period, you will not be able to:</p>
                    <ul>
                        <li>Accept delivery requests from ${emailData.organizationName}</li>
                        <li>Access ${emailData.organizationName}'s rider dashboard</li>
                        <li>Receive notifications for new orders from ${emailData.organizationName}</li>
                    </ul>
                    
                    <p><strong>Note:</strong> This suspension only affects your relationship with ${emailData.organizationName}. 
                    You may still work with other organizations if you are a member of multiple.</p>
                    
                    <p>If you believe this suspension is in error, please contact the organization at 
                    <a href="mailto:${emailData.contactEmail}">${emailData.contactEmail}</a>.</p>
                    
                    <p>You will be notified when your suspension period ends.</p>
                    
                    <p>Best regards,<br>
                    The ${emailData.organizationName} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: rider.email,
        subject: `Account Suspension Notice - ${emailData.organizationName}`,
        html,
      });

      console.log(`Suspension email sent to ${rider.email}`);
    } catch (error) {
      console.error("Error sending suspension email:", error);
      // Don't throw - we don't want email failure to block suspension
    }
  }

  /**
   * Send removal email to rider
   */
  private async sendRemovalEmail(rider: Rider, reason?: string): Promise<void> {
    try {
      const emailData = {
        riderName: rider.name || rider.email,
        organizationName: rider.orgMembership.orgName,
        removalDate: new Date().toLocaleDateString(),
        reason: reason || "Organization decision",
        contactEmail: process.env.SUPPORT_EMAIL || "support@example.com",
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #fff; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .notice { background-color: #e7f3ff; border: 1px solid #0066cc; padding: 15px; border-radius: 4px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Organization Removal Notice</h2>
                </div>
                <div class="content">
                    <p>Dear ${emailData.riderName},</p>
                    
                    <div class="notice">
                        <p><strong>You have been removed as a rider from ${emailData.organizationName}.</strong></p>
                    </div>
                    
                    <p><strong>Removal Details:</strong></p>
                    <ul>
                        <li><strong>Date:</strong> ${emailData.removalDate}</li>
                        <li><strong>Organization:</strong> ${emailData.organizationName}</li>
                        <li><strong>Reason:</strong> ${emailData.reason}</li>
                    </ul>
                    
                    <p>Effective immediately, you will no longer:</p>
                    <ul>
                        <li>Have access to ${emailData.organizationName}'s rider portal</li>
                        <li>Receive delivery assignments from ${emailData.organizationName}</li>
                        <li>Be associated with ${emailData.organizationName} in any capacity</li>
                    </ul>
                    
                    <p><strong>Note:</strong> This removal only affects your relationship with ${emailData.organizationName}. 
                    Your OtoNav account remains active, and you can continue working with other organizations if applicable.</p>
                    
                    <p>If you have any questions about this decision, please contact 
                    <a href="mailto:${emailData.contactEmail}">${emailData.contactEmail}</a>.</p>
                    
                    <p>We thank you for your service with ${emailData.organizationName} and wish you the best.</p>
                    
                    <p>Sincerely,<br>
                    The ${emailData.organizationName} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: rider.email,
        subject: `Organization Removal Notice - ${emailData.organizationName}`,
        html,
      });

      console.log(`Removal email sent to ${rider.email}`);
    } catch (error) {
      console.error("Error sending removal email:", error);
      // Don't throw - we don't want email failure to block removal
    }
  }

  /**
   * Check if rider is suspended in a specific organization
   */
  async isRiderSuspended(riderId: string, orgId: string): Promise<boolean> {
    try {
      const [membership] = await db
        .select({ isSuspended: userOrganizations.isSuspended })
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.role, "rider")
          )
        )
        .limit(1);

      return membership?.isSuspended || false;
    } catch (error) {
      console.error("Error checking rider suspension status:", error);
      return false;
    }
  }

  /**
   * Get all organizations a rider belongs to
   */
  async getRiderOrganizations(riderId: string): Promise<
    Array<{
      orgId: string;
      orgName: string;
      role: string;
      isActive: boolean;
      isSuspended: boolean;
      joinedAt: Date | null; // Updated to allow null
    }>
  > {
    try {
      const memberships = await db
        .select({
          orgId: userOrganizations.orgId,
          role: userOrganizations.role,
          isActive: userOrganizations.isActive,
          isSuspended: userOrganizations.isSuspended,
          joinedAt: userOrganizations.joinedAt,
          orgName: organizations.name,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.orgId, organizations.id))
        .where(eq(userOrganizations.userId, riderId))
        .orderBy(desc(userOrganizations.joinedAt));

      return memberships;
    } catch (error) {
      console.error("Error fetching rider organizations:", error);
      throw new Error("Failed to fetch rider organizations");
    }
  }

  /**
   * Deactivate rider in organization (soft removal)
   */
  async deactivateRider(
    riderId: string,
    orgId: string,
    actorUserId: string,
    reason?: string
  ): Promise<Rider> {
    try {
      const rider = await this.getRiderById(riderId, orgId);
      if (!rider) {
        throw new Error("Rider not found in this organization");
      }

      // Deactivate instead of deleting
      await db
        .update(userOrganizations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId)
          )
        );

      // Create audit log
      await createAuditLog({
        orgId,
        userId: actorUserId,
        action: "rider.deactivated",
        resourceType: "user",
        resourceId: riderId,
        details: { reason },
        severity: "warning",
      });

      return (await this.getRiderById(riderId, orgId)) as Rider;
    } catch (error) {
      console.error("Error deactivating rider:", error);
      throw error;
    }
  }

  /**
   * Reactivate rider in organization
   */
  async reactivateRider(
    riderId: string,
    orgId: string,
    actorUserId: string
  ): Promise<Rider> {
    try {
      const rider = await this.getRiderById(riderId, orgId);
      if (!rider) {
        throw new Error("Rider not found in this organization");
      }

      await db
        .update(userOrganizations)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userOrganizations.userId, riderId),
            eq(userOrganizations.orgId, orgId)
          )
        );

      // Create audit log
      await createAuditLog({
        orgId,
        userId: actorUserId,
        action: "rider.reactivated",
        resourceType: "user",
        resourceId: riderId,
        details: {},
        severity: "info",
      });

      return (await this.getRiderById(riderId, orgId)) as Rider;
    } catch (error) {
      console.error("Error reactivating rider:", error);
      throw error;
    }
  }
}

export const riderService = new RiderService();
