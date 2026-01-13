// routes/rider.routes.ts
import { Router } from "express";
import { riderController } from "../controllers/rider.controller.js";
import {
  authenticateToken,
  requireOrgMember,
} from "../middleware/auth.middleware.js";
import {
  authorizeRole,
  requireOrgOwner,
  requireRiderAccess,
} from "../middleware/role.middleware.js";

const router = Router();

// Apply authentication and organization membership to all routes
router.use(authenticateToken, requireOrgMember);

/**
 * @route   GET /api/riders
 * @desc    Get all riders in the organization
 * @access  Private (Owner only)
 */
router.get(
  "/",
  requireOrgOwner,
  riderController.getRiders.bind(riderController)
);

/**
 * @route   GET /api/riders/:riderId
 * @desc    Get a single rider by ID
 * @access  Private (Owner only)
 */
router.get(
  "/:riderId",
  requireOrgOwner,
  riderController.getRiderById.bind(riderController)
);

/**
 * @route   GET /api/riders/:riderId/organizations
 * @desc    Get all organizations a rider belongs to
 * @access  Private (Owner or the rider themselves)
 */
router.get(
  "/:riderId/organizations",
  requireRiderAccess, // Owners and riders can access
  riderController.getRiderOrganizations.bind(riderController)
);

/**
 * @route   POST /api/riders/:riderId/suspend
 * @desc    Suspend a rider
 * @access  Private (Owner only)
 */
router.post(
  "/:riderId/suspend",
  requireOrgOwner,
  riderController.suspendRider.bind(riderController)
);

/**
 * @route   POST /api/riders/:riderId/unsuspend
 * @desc    Unsuspend a rider
 * @access  Private (Owner only)
 */
router.post(
  "/:riderId/unsuspend",
  requireOrgOwner,
  riderController.unsuspendRider.bind(riderController)
);

/**
 * @route   DELETE /api/riders/:riderId
 * @desc    Remove a rider from organization (hard delete from user_organizations)
 * @access  Private (Owner only)
 */
router.delete(
  "/:riderId",
  requireOrgOwner,
  riderController.removeRider.bind(riderController)
);

/**
 * @route   POST /api/riders/:riderId/deactivate
 * @desc    Deactivate a rider (soft removal)
 * @access  Private (Owner only)
 */
router.post(
  "/:riderId/deactivate",
  requireOrgOwner,
  riderController.deactivateRider.bind(riderController)
);

/**
 * @route   POST /api/riders/:riderId/reactivate
 * @desc    Reactivate a rider
 * @access  Private (Owner only)
 */
router.post(
  "/:riderId/reactivate",
  requireOrgOwner,
  riderController.reactivateRider.bind(riderController)
);

/**
 * @route   GET /api/riders/:riderId/suspension-status
 * @desc    Check if rider is suspended
 * @access  Private (Owner only)
 */
router.get(
  "/:riderId/suspension-status",
  requireOrgOwner,
  riderController.checkSuspensionStatus.bind(riderController)
);

export const riderRoutes = router;
