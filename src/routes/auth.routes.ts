import express from "express";
import {
  registerBusinessController,
  registerCustomerController,
  loginController,
  verifyEmailWithOTPController,
  resendOTPController,
  refreshTokenController,
  logoutController,
  getProfileController,
  updateProfileController,
  createRiderAccountController,
  completeRiderRegistrationViaTokenController,
  acceptInvitationController,
  createCustomerAccountController,
  completeCustomerRegistrationViaTokenController,
  updatePasswordController,
  forgotPasswordController,
  resetPasswordController,
  resendRiderInvitationController,
  cancelRiderInvitationController,
  resendCustomerRegistrationLinkController,
  acceptCustomerInvitationController, // Add this import
  resendCustomerInvitationController, // Add this import
  cancelCustomerInvitationController, // Add this import
} from "../controllers/auth.controller.js";
import {
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
} from "../middleware/auth.middleware.js";
import {
  authorizeRole,
  requireOrgOwner,
} from "../middleware/role.middleware.js";

const router = express.Router();

// Public routes
router.post("/register/business", registerBusinessController);
router.post("/register/customer", registerCustomerController);
router.post("/login", loginController);
router.post("/verify-email", verifyEmailWithOTPController);
router.post("/resend-otp", resendOTPController);
router.post("/refresh-token", refreshTokenController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

// Token-based registration routes (public)
router.post(
  "/rider/complete-registration",
  completeRiderRegistrationViaTokenController,
);
router.post(
  "/customer/complete-registration",
  completeCustomerRegistrationViaTokenController,
);
router.post("/invitation/accept", acceptInvitationController);
router.post(
  "/customer/invitation/accept",
  acceptCustomerInvitationController, // Add this route
);

// Protected routes (no org context needed)
router.post("/logout", authenticateToken, logoutController);
router.get("/profile", authenticateToken, getProfileController);
router.put("/profile", authenticateToken, updateProfileController);
router.put("/change-password", authenticateToken, updatePasswordController);

// Owner only routes (require organization context)
router.post(
  "/rider/create",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  createRiderAccountController,
);

router.post(
  "/customer/create",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  createCustomerAccountController,
);

// Customer invitation management
router.post(
  "/customer/resend-registration",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  resendCustomerRegistrationLinkController,
);

router.post(
  "/customer/resend-invitation",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  resendCustomerInvitationController,
);

router.post(
  "/customer/cancel-invitation",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  cancelCustomerInvitationController,
);

// Rider invitation management
router.post(
  "/rider/resend-invitation",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  resendRiderInvitationController,
);

router.post(
  "/rider/cancel-invitation",
  authenticateToken,
  requireOrgContext,
  requireOrgMember,
  requireOrgOwner,
  cancelRiderInvitationController,
);

export const authRoutes = router;
