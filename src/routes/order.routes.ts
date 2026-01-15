import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// CREATE ORDER - Owner only, requires org context
router.post(
  "/",
  authorizeRole(["owner"]),
  orderController.createOrder.bind(orderController)
);

// GET ALL ORDERS - All roles
router.get(
  "/",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.getOrders.bind(orderController)
);

// GET SINGLE ORDER - All roles
router.get(
  "/:orderId",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.getOrder.bind(orderController)
);

// CANCEL ORDER - All roles
router.delete(
  "/:orderId/cancel",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.cancelOrder.bind(orderController)
);

// RIDER ACCEPT ORDER - Rider only
router.post(
  "/:orderId/accept",
  authorizeRole(["rider"]),
  orderController.riderAcceptOrder.bind(orderController)
);

// CUSTOMER SET LOCATION - Customer only
router.post(
  "/:orderId/set-location",
  authorizeRole(["customer"]),
  orderController.setCustomerLocation.bind(orderController)
);

// OWNER SET CUSTOMER LOCATION - Owner only
router.post(
  "/:orderId/set-customer-location",
  authorizeRole(["owner"]),
  orderController.ownerSetCustomerLocation.bind(orderController)
);

// GET CUSTOMER LOCATION LABELS - Owner only
router.get(
  "/:orderId/customer-location-labels",
  authorizeRole(["owner"]),
  orderController.getCustomerLocationLabels.bind(orderController)
);

export const orderRoutes = router;
