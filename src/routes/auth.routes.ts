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
  completeRiderRegistrationController,
  updatePasswordController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register/business", registerBusinessController); //
router.post("/register/customer", registerCustomerController);
router.post("/login", loginController); //
router.post("/verify-email", verifyEmailWithOTPController); //
router.post("/resend-otp", resendOTPController); //
router.post("/refresh-token", refreshTokenController);
router.post("/forgot-password", forgotPasswordController); //
router.post("/reset-password", resetPasswordController); //

// Protected routes
router.post("/logout", authenticateToken, logoutController); //
router.get("/profile", authenticateToken, getProfileController); //
router.put("/profile", authenticateToken, updateProfileController); //
router.put("/change-password", authenticateToken, updatePasswordController); //

// Owner only routes
router.post("/rider/create", authenticateToken, createRiderAccountController); //

// Rider only routes
router.post(
  "/rider/complete-registration",
  authenticateToken,
  completeRiderRegistrationController
);

export const authRoutes = router;
