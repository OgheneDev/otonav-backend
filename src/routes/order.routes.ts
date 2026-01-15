import { Router, Request, Response, NextFunction } from "express";
import { orderController } from "../controllers/order.controller.js";
import {
  authenticateToken,
  requireOrgContext,
  requireOrgMembership,
} from "../middleware/auth.middleware.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to check if user is a customer
const isCustomer = (req: Request): boolean => {
  const authReq = req as AuthRequest;
  return !!authReq.user && authReq.user.role === "customer";
};

// Middleware for customers (no org context required)
const customerAccess = (req: Request, res: Response, next: NextFunction) => {
  if (isCustomer(req)) {
    return next(); // Customers can access without org context
  }
  // Non-customers need org context
  requireOrgContext(req, res, next);
};

// Apply appropriate middleware based on role
router.use((req: Request, res: Response, next: NextFunction) => {
  if (isCustomer(req)) {
    // For customers: skip org checks, just go to next
    return next();
  }
  // For owners/riders: apply org context and membership checks
  requireOrgContext(req, res, (err: any) => {
    if (err) return next(err);
    requireOrgMembership(req, res, next);
  });
});

// Create order (Owner only - needs org context)
router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only organization owners can create orders",
      });
    }
    next();
  },
  orderController.createOrder.bind(orderController)
);

// Get orders (All roles, filtered by role)
router.get("/", orderController.getOrders.bind(orderController));

// Get single order (All roles with access check)
router.get("/:orderId", orderController.getOrder.bind(orderController));

// Cancel order (All roles with access check)
router.delete(
  "/:orderId/cancel",
  orderController.cancelOrder.bind(orderController)
);

// Rider accept order (Rider only)
router.post(
  "/:orderId/accept",
  (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "rider") {
      return res.status(403).json({
        success: false,
        message: "Only riders can accept orders",
      });
    }
    next();
  },
  orderController.riderAcceptOrder.bind(orderController)
);

// Customer set location (Customer only)
router.post(
  "/:orderId/set-location",
  (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can set their location",
      });
    }
    next();
  },
  orderController.setCustomerLocation.bind(orderController)
);

// Owner set customer location (Owner only)
router.post(
  "/:orderId/set-customer-location",
  (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only organization owners can set customer locations",
      });
    }
    next();
  },
  orderController.ownerSetCustomerLocation.bind(orderController)
);

// Get customer location labels (Owner only)
router.get(
  "/:orderId/customer-location-labels",
  (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only organization owners can view customer location labels",
      });
    }
    next();
  },
  orderController.getCustomerLocationLabels.bind(orderController)
);

export const orderRoutes = router;
