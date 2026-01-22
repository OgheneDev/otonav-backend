import express from "express";
import { customerController } from "../controllers/customer.controller.js";
import {
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireOrgContext);
router.use(requireOrgMember);

// Get all customers
router.get("/", customerController.getAllCustomers);

// Get customer by ID
router.get("/:customerId", customerController.getCustomerById);

// Search customers
router.get("/search", customerController.searchCustomers);

export const customerRoutes = router;
