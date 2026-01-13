// middleware/role.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import { db } from "../config/database.js";
import { userOrganizations } from "../models/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to check user's role in the current organization context
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // If no orgId in context, use global role
      if (!user.orgId) {
        if (!user.role || !allowedRoles.includes(user.role)) {
          return res.status(403).json({
            success: false,
            message: `Insufficient permissions. Required roles: ${allowedRoles.join(
              ", "
            )}`,
          });
        }
        return next();
      }

      // For organization context, check user's role in this specific organization
      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, user.userId),
          eq(userOrganizations.orgId, user.orgId),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "User is not a member of this organization",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions in this organization. Required roles: ${allowedRoles.join(
            ", "
          )}`,
          userRoleInOrg: membership.role,
          currentOrgId: user.orgId,
        });
      }

      next();
    } catch (error) {
      console.error("Error in authorizeRole middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization",
      });
    }
  };
};

/**
 * Middleware to check if user owns the current organization
 */
export const requireOrgOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user || !user.orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and organization context required",
      });
    }

    const membership = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, user.userId),
        eq(userOrganizations.orgId, user.orgId),
        eq(userOrganizations.role, "owner"),
        eq(userOrganizations.isActive, true)
      ),
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Only organization owners can perform this action",
      });
    }

    next();
  } catch (error) {
    console.error("Error in requireOrgOwner middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization",
    });
  }
};

/**
 * Middleware to check if user is a rider in the current organization
 */
export const requireOrgRider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user || !user.orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and organization context required",
      });
    }

    const membership = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, user.userId),
        eq(userOrganizations.orgId, user.orgId),
        eq(userOrganizations.role, "rider"),
        eq(userOrganizations.isActive, true)
      ),
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Only organization riders can perform this action",
      });
    }

    next();
  } catch (error) {
    console.error("Error in requireOrgRider middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization",
    });
  }
};

/**
 * Middleware to check if user can access rider-specific resources (owner or rider)
 */
export const requireRiderAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user || !user.orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and organization context required",
      });
    }

    // Check if user is either owner or rider in this organization
    const membership = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, user.userId),
        eq(userOrganizations.orgId, user.orgId),
        eq(userOrganizations.isActive, true)
      ),
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "User is not a member of this organization",
      });
    }

    if (membership.role !== "owner" && membership.role !== "rider") {
      return res.status(403).json({
        success: false,
        message: "Only owners and riders can access this resource",
      });
    }

    next();
  } catch (error) {
    console.error("Error in requireRiderAccess middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization",
    });
  }
};
