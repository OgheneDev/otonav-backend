import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    orgId?: string | null;
    role?: string;
    type?: string;
  };
}

/**
 * Middleware to verify access token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

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
      orgId: decoded.orgId,
      role: decoded.role,
      type: decoded.type,
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
 * Middleware to check user role
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check organization membership
 */
export const requireOrgMember = (
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

  if (!user.orgId) {
    return res.status(403).json({
      success: false,
      message: "User is not a member of any organization",
    });
  }

  next();
};
