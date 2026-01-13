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
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = express.Router();

// Public routes
router.post("/register/business", registerBusinessController); //
router.post("/register/customer", registerCustomerController);
router.post("/login", loginController); //
router.post("/verify-email", verifyEmailWithOTPController); //
router.post("/resend-otp", resendOTPController);
router.post("/refresh-token", refreshTokenController);
router.post("/forgot-password", forgotPasswordController); //
router.post("/reset-password", resetPasswordController); //

// Token-based registration routes (public)
router.post(
  "/rider/complete-registration",
  completeRiderRegistrationViaTokenController
); //
router.post(
  "/customer/complete-registration",
  completeCustomerRegistrationViaTokenController
); //
router.post("/invitation/accept", acceptInvitationController);

// Protected routes
router.post("/logout", authenticateToken, logoutController); //
router.get("/profile", authenticateToken, getProfileController); //
router.put("/profile", authenticateToken, updateProfileController); //
router.put("/change-password", authenticateToken, updatePasswordController); //

// Owner only routes
router.post(
  "/rider/create",
  authenticateToken,
  authorizeRole(["owner"]),
  createRiderAccountController
); //

router.post(
  "/customer/create",
  authenticateToken,
  authorizeRole(["owner"]),
  createCustomerAccountController
); //

export const authRoutes = router;
