// controllers/organization.controller.ts - Fixed version
import { Request, Response } from "express";
import { db } from "../config/database.js";
import {
  userOrganizations,
  organizations,
  auditLogs,
  users,
} from "../models/schema.js";
import { eq, and } from "drizzle-orm";
import { generateAccessToken } from "../services/auth.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export class OrganizationController {
  /**
   * Switch organization context
   */
  async switchOrganization(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      const { orgId } = req.body;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const orgIdString = Array.isArray(orgId) ? orgId[0] : orgId;

      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, user.userId),
          eq(userOrganizations.orgId, orgIdString),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "User is not a member of this organization",
        });
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgIdString),
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const accessToken = generateAccessToken({
        userId: user.userId,
        email: user.email,
        orgId: orgIdString,
        role: membership.role,
        organizations: user.organizations || [],
      });

      return res.status(200).json({
        success: true,
        message: "Organization switched successfully",
        data: {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
          },
          role: membership.role,
          accessToken,
          expiresIn: 7 * 24 * 60 * 60,
        },
      });
    } catch (error: any) {
      console.error("Error switching organization:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to switch organization",
      });
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(req: AuthRequest, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userOrgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          role: userOrganizations.role,
          isActive: userOrganizations.isActive,
          isSuspended: userOrganizations.isSuspended,
          joinedAt: userOrganizations.joinedAt,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.orgId, organizations.id))
        .where(
          and(
            eq(userOrganizations.userId, user.userId),
            eq(userOrganizations.isActive, true)
          )
        )
        .orderBy(userOrganizations.joinedAt);

      return res.status(200).json({
        success: true,
        data: userOrgs,
        count: userOrgs.length,
      });
    } catch (error: any) {
      console.error("Error getting user organizations:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get organizations",
      });
    }
  }

  /**
   * Leave an organization
   */
  async leaveOrganization(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      const { orgId } = req.params;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const orgIdString = Array.isArray(orgId) ? orgId[0] : orgId;

      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, user.userId),
          eq(userOrganizations.orgId, orgIdString)
        ),
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: "Membership not found",
        });
      }

      if (membership.role === "owner") {
        return res.status(400).json({
          success: false,
          message:
            "Organization owners cannot leave. Transfer ownership first.",
        });
      }

      await db
        .delete(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, user.userId),
            eq(userOrganizations.orgId, orgIdString)
          )
        );

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgIdString),
      });

      await db.insert(auditLogs).values({
        orgId: orgIdString,
        userId: user.userId,
        action: "user.left_organization",
        severity: "info",
        details: {
          organizationName: org?.name,
          userEmail: user.email,
        },
        timestamp: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: `You have left ${org?.name || "the organization"}`,
      });
    } catch (error: any) {
      console.error("Error leaving organization:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to leave organization",
      });
    }
  }

  /**
   * Transfer organization ownership
   */
  async transferOwnership(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      const { orgId } = req.params;
      const { newOwnerId } = req.body;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!orgId || !newOwnerId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and new owner ID are required",
        });
      }

      const orgIdString = Array.isArray(orgId) ? orgId[0] : orgId;

      const currentOwnerMembership = await db.query.userOrganizations.findFirst(
        {
          where: and(
            eq(userOrganizations.userId, user.userId),
            eq(userOrganizations.orgId, orgIdString),
            eq(userOrganizations.role, "owner")
          ),
        }
      );

      if (!currentOwnerMembership) {
        return res.status(403).json({
          success: false,
          message: "Only organization owners can transfer ownership",
        });
      }

      const newOwnerMembership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, newOwnerId),
          eq(userOrganizations.orgId, orgIdString)
        ),
      });

      if (!newOwnerMembership) {
        return res.status(404).json({
          success: false,
          message: "New owner is not a member of this organization",
        });
      }

      await db.transaction(async (tx) => {
        // Update current owner to rider role
        await tx
          .update(userOrganizations)
          .set({ role: "rider" })
          .where(
            and(
              eq(userOrganizations.userId, user.userId),
              eq(userOrganizations.orgId, orgIdString)
            )
          );

        // Update new owner to owner role
        await tx
          .update(userOrganizations)
          .set({ role: "owner" })
          .where(
            and(
              eq(userOrganizations.userId, newOwnerId),
              eq(userOrganizations.orgId, orgIdString)
            )
          );

        await tx
          .update(organizations)
          .set({ ownerUserId: newOwnerId })
          .where(eq(organizations.id, orgIdString));

        await tx.insert(auditLogs).values({
          orgId: orgIdString,
          userId: user.userId,
          action: "organization.ownership_transferred",
          severity: "info",
          details: {
            fromUserId: user.userId,
            toUserId: newOwnerId,
          },
          timestamp: new Date(),
        });
      });

      return res.status(200).json({
        success: true,
        message: "Ownership transferred successfully",
      });
    } catch (error: any) {
      console.error("Error transferring ownership:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to transfer ownership",
      });
    }
  }

  /**
   * Invite user to organization
   */
  async inviteToOrganization(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      const { orgId } = req.params;
      const { email, role = "rider" } = req.body;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!orgId || !email) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and email are required",
        });
      }

      const orgIdString = Array.isArray(orgId) ? orgId[0] : orgId;

      // Verify user has permission to invite (owner only)
      const userMembership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, user.userId),
          eq(userOrganizations.orgId, orgIdString),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!userMembership || userMembership.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Only organization owners can invite users",
        });
      }

      // Check if user is already a member
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        const existingMembership = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, existingUser.id),
            eq(userOrganizations.orgId, orgIdString)
          ),
        });

        if (existingMembership) {
          return res.status(400).json({
            success: false,
            message: "User is already a member of this organization",
          });
        }
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgIdString),
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invitation logic would be handled by auth service",
        data: {
          email,
          role,
          organizationName: org.name,
        },
      });
    } catch (error: any) {
      console.error("Error inviting to organization:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send invitation",
      });
    }
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      const { orgId } = req.params;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const orgIdString = Array.isArray(orgId) ? orgId[0] : orgId;

      // Verify user belongs to the organization
      const userMembership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, user.userId),
          eq(userOrganizations.orgId, orgIdString),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this organization",
        });
      }

      const members = await db
        .select({
          userId: userOrganizations.userId,
          role: userOrganizations.role,
          isActive: userOrganizations.isActive,
          isSuspended: userOrganizations.isSuspended,
          joinedAt: userOrganizations.joinedAt,
          userEmail: users.email,
          userName: users.name,
          userPhoneNumber: users.phoneNumber,
        })
        .from(userOrganizations)
        .innerJoin(users, eq(userOrganizations.userId, users.id))
        .where(
          and(
            eq(userOrganizations.orgId, orgIdString),
            eq(userOrganizations.isActive, true)
          )
        )
        .orderBy(userOrganizations.joinedAt);

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgIdString),
      });

      return res.status(200).json({
        success: true,
        data: {
          organization: {
            id: org?.id,
            name: org?.name,
          },
          members,
          count: members.length,
        },
      });
    } catch (error: any) {
      console.error("Error getting organization members:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get organization members",
      });
    }
  }
}

export const organizationController = new OrganizationController();
