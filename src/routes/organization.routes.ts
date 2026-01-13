// routes/organization.routes.ts
import { Router } from "express";
import { organizationController } from "../controllers/organization.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// All organization routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/organizations
 * @desc    Get user's organizations
 * @access  Private
 */
router.get(
  "/",
  organizationController.getUserOrganizations.bind(organizationController)
);

/**
 * @route   POST /api/organizations/switch
 * @desc    Switch organization context
 * @access  Private
 */
router.post(
  "/switch",
  organizationController.switchOrganization.bind(organizationController)
);

/**
 * @route   DELETE /api/organizations/:orgId/leave
 * @desc    Leave an organization
 * @access  Private
 */
router.delete(
  "/:orgId/leave",
  organizationController.leaveOrganization.bind(organizationController)
);

export default router;
