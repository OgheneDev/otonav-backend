import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    orgId?: string | null;
    role?: string;
    type?: string;
    organizations?: Array<{
      orgId: string;
      role: string;
    }>;
  };
}

// middleware/auth.ts - Updates needed
/**
 * Middleware to verify access token with multi-organization support
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = verifyToken(token);

    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Attach user info to request
    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      orgId: decoded.orgId, // This could be null for users with multiple orgs
      role: decoded.role, // This is the role in the current org (or global if no org)
      type: decoded.type,
      organizations: decoded.organizations || [], // All organizations user belongs to
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Middleware to require specific organization context
 */
export const requireOrgContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Check if user has an orgId in token (single org context)
  if (!user.orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization context required. Please select an organization.",
      availableOrganizations: user.organizations || [],
    });
  }

  next();
};

/**
 * Middleware to check if user belongs to the organization in context
 */
export const requireOrgMembership = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthRequest).user;

  if (!user || !user.orgId) {
    return res.status(401).json({
      success: false,
      message: "Authentication and organization context required",
    });
  }

  // Check if user belongs to the organization in the token
  const belongsToOrg = user.organizations?.some(
    (org) => org.orgId === user.orgId
  );

  if (!belongsToOrg) {
    return res.status(403).json({
      success: false,
      message: "User is not a member of this organization",
      currentOrgId: user.orgId,
      userOrganizations: user.organizations || [],
    });
  }

  next();
};

// Update requireOrgMember to use the new logic
export const requireOrgMember = requireOrgMembership;
