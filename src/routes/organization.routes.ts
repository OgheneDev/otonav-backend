import { Router } from "express";
import { OrganizationController } from "../controllers/organization.controller.js";

const router = Router();
const organizationController = new OrganizationController();

/**
 * @route GET /api/organizations/:id
 * @desc Get organization by ID
 * @access Public (or add authentication middleware if needed)
 */
router.get(
  "/organizations/:id",
  organizationController.getOrganizationById.bind(organizationController),
);

export const organizationRoutes = router;
