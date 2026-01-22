import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticateToken);

router.post(
  "/",
  authorizeRole(["owner"]),
  orderController.createOrder.bind(orderController),
);

router.get(
  "/",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.getOrders.bind(orderController),
);

router.get(
  "/:orderId",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.getOrder.bind(orderController),
);

router.delete(
  "/:orderId/cancel",
  authorizeRole(["customer", "owner", "rider"]),
  orderController.cancelOrder.bind(orderController),
);

router.post(
  "/:orderId/accept",
  authorizeRole(["rider"]),
  orderController.riderAcceptOrder.bind(orderController),
);

router.post(
  "/:orderId/set-location",
  authorizeRole(["customer"]),
  orderController.setCustomerLocation.bind(orderController),
);

router.post(
  "/:orderId/set-customer-location",
  authorizeRole(["owner"]),
  orderController.ownerSetCustomerLocation.bind(orderController),
);

router.get(
  "/:orderId/customer-location-labels",
  authorizeRole(["owner"]),
  orderController.getCustomerLocationLabels.bind(orderController),
);

router.post(
  "/:orderId/confirm-delivery",
  authorizeRole(["rider"]),
  orderController.confirmDelivery.bind(orderController),
);

router.post(
  "/:orderId/package-picked-up",
  authorizeRole(["rider"]),
  orderController.markPackagePickedUp.bind(orderController),
);

router.post(
  "/:orderId/start-delivery",
  authorizeRole(["rider"]),
  orderController.startDelivery.bind(orderController),
);

router.post(
  "/:orderId/mark-arrived",
  authorizeRole(["rider"]),
  orderController.markArrivedAtLocation.bind(orderController),
);

router.post(
  "/:orderId/update-location",
  authorizeRole(["rider"]),
  orderController.updateRiderLocation.bind(orderController),
);

export const orderRoutes = router;
