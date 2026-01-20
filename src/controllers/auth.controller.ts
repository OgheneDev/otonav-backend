import { Request, Response } from "express";
import {
  registerBusiness,
  registerCustomer,
  authenticateUser,
  verifyEmailWithOTP,
  createRiderAccount,
  completeRiderRegistrationViaToken,
  acceptInvitation,
  createCustomerAccount,
  completeCustomerRegistrationViaToken,
  refreshAccessToken,
  logoutUser,
  getUserById,
  updateUserProfile,
  resetPassword,
  updateUserPassword,
  initiatePasswordReset,
  resendVerificationOTP,
  cancelRiderInvitation,
  resendRiderInvitation,
  resendCustomerRegistrationLink,
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
  message: string = "Success",
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

export const registerBusinessController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, password, name, phoneNumber, businessName } = req.body;

    if (!email || !password || !name || !businessName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: email, password, name, businessName, phoneNumber",
      });
    }

    const result = await registerBusiness(
      email,
      password,
      name,
      businessName,
      phoneNumber,
    );

    return successResponse(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          registrationStatus: result.user.registrationStatus,
          otp: result.otp,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
        },
      },
      "Business registration successful. Please check your email for OTP to verify your account.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const registerCustomerController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, password, name, phoneNumber } = req.body;

    if (!email || !password || !name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: email, password, name, phoneNumber",
      });
    }

    const customer = await registerCustomer(email, password, name, phoneNumber);

    return successResponse(
      res,
      {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: customer.role,
        emailVerified: customer.emailVerified,
        registrationStatus: customer.registrationStatus,
        isProfileComplete: customer.isProfileComplete,
        otp: customer.otp,
      },
      "Customer registration successful. Please check your email for OTP to verify your account.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userOrgs = result.user.organizations || [];
    const defaultOrgId = userOrgs.length === 1 ? userOrgs[0].orgId : null;
    const defaultRole =
      userOrgs.length === 1 ? userOrgs[0].role : result.user.role;

    const responseData: any = {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        registrationStatus: result.user.registrationStatus,
        phoneNumber: result.user.phoneNumber,
        isProfileComplete: result.user.isProfileComplete,
        profileImage: result.user.profileImage,
        organizations: userOrgs,
      },
      accessToken: result.accessToken,
      expiresIn: 7 * 24 * 60 * 60,
    };

    if (result.user.role === "customer") {
      responseData.user.locations = result.user.locations || [];
    } else if (result.user.role === "rider") {
      responseData.user.currentLocation = result.user.currentLocation;
    }

    if (defaultOrgId) {
      responseData.user.defaultOrgId = defaultOrgId;
      responseData.user.defaultOrgRole = defaultRole;
    }

    return successResponse(res, responseData, "Login successful");
  } catch (error) {
    return handleError(res, error);
  }
};

export const verifyEmailWithOTPController = async (
  req: Request,
  res: Response,
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
      "Email verified successfully. You can now login.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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
        expiresIn: 7 * 24 * 60 * 60,
      },
      "Token refreshed successfully",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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

    const allowedFields = [
      "name",
      "email",
      "phoneNumber",
      "profileImage",
      "locations",
      "addLocation",
      "removeLocation",
      "updateLocation",
    ];

    const invalidFields = Object.keys(updates).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidFields.join(
          ", ",
        )}. Allowed fields: ${allowedFields.join(", ")}`,
      });
    }

    if (updates.profileImage !== undefined) {
      if (updates.profileImage !== null && updates.profileImage !== "") {
        if (
          !updates.profileImage.startsWith("data:image/") &&
          !updates.profileImage.startsWith("http")
        ) {
          return res.status(400).json({
            success: false,
            message: "profileImage must be a base64 image string or a URL",
          });
        }

        if (updates.profileImage.startsWith("data:image/")) {
          const base64Size = Buffer.from(updates.profileImage).length;
          if (base64Size > 7 * 1024 * 1024) {
            return res.status(400).json({
              success: false,
              message: "Image size must be less than 5MB",
            });
          }
        }
      }
    }

    if (updates.locations && !Array.isArray(updates.locations)) {
      return res.status(400).json({
        success: false,
        message: "Locations must be an array",
      });
    }

    if (updates.addLocation) {
      if (!updates.addLocation.label || !updates.addLocation.preciseLocation) {
        return res.status(400).json({
          success: false,
          message: "addLocation must contain label and preciseLocation",
        });
      }
    }

    if (updates.updateLocation) {
      if (typeof updates.updateLocation.index !== "number") {
        return res.status(400).json({
          success: false,
          message: "updateLocation must contain an index",
        });
      }
    }

    const updatedUser = await updateUserProfile(userId, updates);

    const responseData: any = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      registrationStatus: updatedUser.registrationStatus,
      isProfileComplete: updatedUser.isProfileComplete,
      profileImage: updatedUser.profileImage,
    };

    if (updatedUser.role === "customer") {
      responseData.locations = updatedUser.locations || [];
    } else if (updatedUser.role === "rider") {
      responseData.currentLocation = updatedUser.currentLocation;
    }

    return successResponse(
      res,
      responseData,
      updates.email
        ? "Profile updated successfully. Please check your email for OTP to verify your new email address."
        : "Profile updated successfully",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const createRiderAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { riderEmail, riderName } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and organization context required",
      });
    }

    if (!riderEmail || !riderName) {
      return res.status(400).json({
        success: false,
        message: "Rider email and name are required",
      });
    }

    const result = await createRiderAccount(
      userId,
      orgId,
      riderEmail,
      riderName,
    );

    let message = "Rider invitation sent successfully";
    if (!result.id) {
      message = "Invitation sent to existing rider to join your organization";
    }

    return successResponse(
      res,
      {
        email: result.email,
        name: result.name,
        emailSent: result.emailSent,
        emailType: result.emailType,
        token: result.token,
      },
      message,
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const completeRiderRegistrationViaTokenController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token, password, phoneNumber } = req.body;

    if (!token || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Token, phoneNumber and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const rider = await completeRiderRegistrationViaToken(
      token,
      password,
      phoneNumber,
    );

    return successResponse(
      res,
      {
        id: rider.id,
        email: rider.email,
        name: rider.name,
        role: rider.role,
        emailVerified: rider.emailVerified,
        registrationStatus: rider.registrationStatus,
      },
      "Registration completed. Please check your email for OTP to verify your account.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const acceptInvitationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const result = await acceptInvitation(token);

    return successResponse(
      res,
      {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
      "Invitation accepted successfully. You are now part of the organization.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const resendRiderInvitationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { riderId } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    const result = await resendRiderInvitation(userId, orgId, riderId);

    return successResponse(res, result, result.message);
  } catch (error) {
    return handleError(res, error);
  }
};

export const cancelRiderInvitationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { riderId } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    const result = await cancelRiderInvitation(userId, orgId, riderId);

    return successResponse(res, result, result.message);
  } catch (error) {
    return handleError(res, error);
  }
};

export const createCustomerAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { customerEmail, customerName } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and organization context required",
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    const result = await createCustomerAccount(
      userId,
      orgId,
      customerEmail,
      customerName,
    );

    return successResponse(
      res,
      {
        email: result.email,
        name: result.name,
        emailSent: result.emailSent,
        token: result.token,
      },
      "Customer registration link sent successfully",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const resendCustomerRegistrationLinkController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const orgId = (req as any).user?.orgId;
    const { customerId } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const result = await resendCustomerRegistrationLink(
      userId,
      orgId,
      customerId,
    );

    return successResponse(res, result, result.message);
  } catch (error) {
    return handleError(res, error);
  }
};

export const completeCustomerRegistrationViaTokenController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token, password, name, phoneNumber } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const customer = await completeCustomerRegistrationViaToken(
      token,
      password,
      phoneNumber,
      name,
    );

    return successResponse(
      res,
      {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: customer.role,
        emailVerified: customer.emailVerified,
        registrationStatus: customer.registrationStatus,
        phoneNumber: customer.phoneNumber,
      },
      "Registration completed. Please check your email for OTP to verify your account.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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
      newPassword,
    );

    return successResponse(
      res,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      "Password updated successfully",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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

    return successResponse(
      res,
      null,
      "If an account exists with this email, you will receive a password reset OTP.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

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
      "Password reset successful. You can now login with your new password.",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const switchOrganizationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as any).user;
    const { orgId } = req.body;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    return successResponse(
      res,
      {
        message: "Organization switching functionality to be implemented",
        requestedOrgId: orgId,
      },
      "Organization switching endpoint",
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Optional: Separate endpoint for profile image upload only
export const uploadProfileImageController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;
    const { image } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!image.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Must be base64 encoded image",
      });
    }

    const updatedUser = await updateUserProfile(userId, {
      profileImage: image,
    });

    return successResponse(
      res,
      {
        profileImage: updatedUser.profileImage,
      },
      "Profile image updated successfully",
    );
  } catch (error) {
    return handleError(res, error);
  }
};
