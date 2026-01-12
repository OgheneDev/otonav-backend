import { Request, Response } from "express";
import {
  registerBusiness,
  registerCustomer,
  authenticateUser,
  verifyEmailWithOTP,
  createRiderAccount,
  completeRiderRegistration,
  refreshAccessToken,
  logoutUser,
  getUserById,
  updateUserProfile,
  resetPassword,
  updateUserPassword,
  initiatePasswordReset,
  resendVerificationOTP,
} from "../services/auth.service.js";

// Helper functions
const handleError = (res: Response, error: any) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "An error occurred";
  return res.status(400).json({
    success: false,
    message,
  });
};

const successResponse = (
  res: Response,
  data: any,
  message: string = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

/**
 * Register a Business (Owner)
 */
export const registerBusinessController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password, name, businessName } = req.body;

    if (!email || !password || !name || !businessName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: email, password, name, businessName",
      });
    }

    const result = await registerBusiness(email, password, name, businessName);

    return successResponse(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          orgId: result.user.orgId,
          emailVerified: result.user.emailVerified,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
        },
      },
      "Business registration successful. Please check your email for OTP to verify your account."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Register a Customer
 */
export const registerCustomerController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: email, password, name",
      });
    }

    const customer = await registerCustomer(email, password, name);

    return successResponse(
      res,
      {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: customer.role,
        emailVerified: customer.emailVerified,
      },
      "Customer registration successful. Please check your email for OTP to verify your account."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Login User
 */
export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authenticateUser(email, password);

    // Set refresh token as HTTP-only cookie (30 days = 30 * 24 * 60 * 60 * 1000 ms)
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    });

    const responseData: any = {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        orgId: result.user.orgId,
        emailVerified: result.user.emailVerified,
        registrationCompleted: result.user.registrationCompleted,
      },
      accessToken: result.accessToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds (604800 seconds)
      // REMOVED: refreshToken: result.refreshToken, // Don't expose in response body
      // REMOVED: refreshTokenExpiresIn: 30 * 24 * 60 * 60, // Only include if needed, and use seconds
    };

    // Optional: If you need to inform the client about refresh token expiry, use seconds
    // responseData.refreshTokenExpiresIn = 30 * 24 * 60 * 60; // 30 days in seconds

    // Add registration completion flag
    if (result.requiresRegistrationCompletion !== undefined) {
      responseData.requiresRegistrationCompletion =
        result.requiresRegistrationCompletion;
    }

    let message = "Login successful";
    if (responseData.requiresRegistrationCompletion) {
      message = "Login successful. Please complete your registration.";
    }

    return successResponse(res, responseData, message);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Verify Email with OTP
 */
export const verifyEmailWithOTPController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    await verifyEmailWithOTP(email, otp);

    return successResponse(
      res,
      null,
      "Email verified successfully. You can now login."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Resend Verification OTP
 */
export const resendOTPController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await resendVerificationOTP(email);

    return successResponse(res, null, "New OTP sent to your email.");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Refresh Access Token
 */
export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    return successResponse(
      res,
      {
        accessToken: result.accessToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds (604800 seconds)
      },
      "Token refreshed successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Logout User
 */
export const logoutController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in request",
      });
    }

    await logoutUser(userId);

    res.clearCookie("refreshToken");

    return successResponse(res, null, "Logged out successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Get Current User Profile
 */
export const getProfileController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await getUserById(userId);

    return successResponse(res, user, "Profile retrieved successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Update User Profile
 */
export const updateProfileController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided",
      });
    }

    const updatedUser = await updateUserProfile(userId, updates);

    return successResponse(
      res,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
      },
      updates.email
        ? "Profile updated successfully. Please check your email for OTP to verify your new email address."
        : "Profile updated successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Create Rider Account (Owner only) - Creates account and sends login details
 */
export const createRiderAccountController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { riderEmail, riderName } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!riderEmail || !riderName) {
      return res.status(400).json({
        success: false,
        message: "Rider email and name are required",
      });
    }

    const rider = await createRiderAccount(
      userId,
      orgId,
      riderEmail,
      riderName
    );

    return successResponse(
      res,
      {
        id: rider.id,
        email: rider.email,
        name: rider.name,
        role: rider.role,
        orgId: rider.orgId,
        emailVerified: rider.emailVerified,
      },
      "Rider account created successfully. Login details have been sent to the rider's email."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Complete Rider Registration (Rider only) - After login, rider completes registration
 */
export const completeRiderRegistrationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user?.userId;
    const { email, name, password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const rider = await completeRiderRegistration(
      userId,
      email,
      name,
      password
    );

    return successResponse(
      res,
      {
        id: rider.id,
        email: rider.email,
        name: rider.name,
        role: rider.role,
        orgId: rider.orgId,
        emailVerified: rider.emailVerified,
      },
      "Registration completed. Please check your email for OTP to verify your account."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Update Password
 */
export const updatePasswordController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const updatedUser = await updateUserPassword(
      userId,
      currentPassword,
      newPassword
    );

    return successResponse(
      res,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      "Password updated successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Forgot Password - Sends OTP
 */
export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await initiatePasswordReset(email);

    // Always return success even if email doesn't exist (security best practice)
    return successResponse(
      res,
      null,
      "If an account exists with this email, you will receive a password reset OTP."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Reset Password with OTP
 */
export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const updatedUser = await resetPassword(email, otp, newPassword);

    return successResponse(
      res,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      "Password reset successful. You can now login with your new password."
    );
  } catch (error) {
    return handleError(res, error);
  }
};
