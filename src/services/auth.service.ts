import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { db } from "../config/database.js";
import {
  users,
  organizations,
  auditLogs,
  userOrganizations,
} from "../models/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "./email.service.js";
import { generateOTP, getOTPExpiration, verifyOTP } from "./otp.service.js";
import { CloudinaryService } from "./cloudinary.service.js";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";

const JWT_SECRET: string = process.env.JWT_SECRET!;
const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// --- Types ---
export interface TokenPayload {
  userId: string;
  email: string;
  orgId?: string | null;
  role?: string;
  type?: "access" | "refresh";
  organizations?: Array<{
    orgId: string;
    role: string;
  }>;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  type: "refresh";
}

// --- Password Utilities ---
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// --- JWT Utilities ---
export const generateAccessToken = (
  payload: Omit<TokenPayload, "type">,
): string => {
  return jwt.sign({ ...payload, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  } as SignOptions);
};

export const generateRefreshToken = (payload: {
  userId: string;
  tokenVersion: number;
}): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      tokenVersion: payload.tokenVersion,
      type: "refresh",
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN } as SignOptions,
  );
};

export const verifyToken = <T = TokenPayload>(token: string): T => {
  return jwt.verify(token, JWT_SECRET) as T;
};

// --- Token Generation for Registration/Invitation ---
const generateRegistrationToken = (
  email: string,
  orgId: string = "",
  role: string,
  name?: string,
): string => {
  if (role === "customer") {
    return jwt.sign(
      {
        email,
        name,
        role,
        type: "registration",
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
  }

  if (!orgId) {
    throw new Error("orgId is required for rider registration tokens");
  }

  return jwt.sign(
    {
      email,
      name,
      orgId,
      role,
      type: "registration",
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );
};

const generateInvitationToken = (
  email: string,
  orgId: string,
  role: string,
): string => {
  return jwt.sign(
    {
      email,
      orgId,
      role,
      type: "invitation",
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// --- Link Generation ---
const getRegistrationLink = (
  token: string,
  type: "rider" | "customer",
): string => {
  return `${FRONTEND_URL}/complete-registration?token=${token}&type=${type}`;
};

const getInvitationLink = (token: string): string => {
  return `${FRONTEND_URL}/accept-invitation?token=${token}`;
};

// --- OTP Management ---
const storeOTP = async (
  userId: string,
  otp: string,
  otpType: string,
  dbClient?: any,
) => {
  const otpExpires = getOTPExpiration();
  const client = dbClient || db;

  const result = await client
    .update(users)
    .set({
      otpCode: otp,
      otpExpires: otpExpires,
      otpType: otpType,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      otpCode: users.otpCode,
      otpExpires: users.otpExpires,
      otpType: users.otpType,
    });

  if (!result || result.length === 0) {
    throw new Error(`No user found with ID: ${userId}`);
  }

  if (result[0].otpCode !== otp) {
    throw new Error("Failed to store OTP correctly");
  }

  return result[0];
};

// --- Image Upload Helper ---
async function saveUploadedImage(base64Image: string): Promise<string> {
  const matches = base64Image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!matches) {
    throw new Error(
      "Invalid base64 image format. Expected data:image/[type];base64,...",
    );
  }

  const mimeType = matches[1].toLowerCase();
  const base64Data = matches[2];

  const allowedMimeTypes = ["jpeg", "jpg", "png", "gif", "webp"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(
      `Invalid image type. Allowed: ${allowedMimeTypes.join(", ")}`,
    );
  }

  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Image size must be less than 5MB");
  }

  const tempDir = join(process.cwd(), "temp");
  try {
    await mkdir(tempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const filename = `profile_${Date.now()}_${Math.random().toString(36).substring(7)}.${mimeType === "jpg" ? "jpg" : mimeType}`;
  const filePath = join(tempDir, filename);

  await writeFile(filePath, buffer);

  return filePath;
}

// --- Email Templates ---
const sendVerificationOTPEmail = async (
  email: string,
  otp: string,
  name: string,
) => {
  await sendEmail({
    to: email,
    subject: `Verify Your Email - OtoNav`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">OtoNav</h1>
          <div style="height: 3px; width: 100px; background: #007bff; margin: 0 auto;"></div>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Hello ${name || "there"},
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          Welcome to OtoNav! Please use the following OTP to verify your email address:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 2px dashed #007bff;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; margin-bottom: 10px;">
            ${otp}
          </div>
          <div style="font-size: 14px; color: #666;">
            Valid for 10 minutes
          </div> 
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          Enter this code on the verification page to complete your registration.
        </p>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #0056b3; margin: 0; font-weight: 500;">
            💡 Tip: If you didn't register this account, please ignore this email.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} OtoNav. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
};

const sendRiderRegistrationLinkEmail = async (
  email: string,
  registrationLink: string,
  businessName: string,
  riderName: string,
) => {
  await sendEmail({
    to: email,
    subject: `Complete Your Rider Registration - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 5px;">OtoNav</h1>
          <p style="color: #666; font-size: 14px;">Delivery Management Platform</p>
          <div style="height: 3px; width: 100px; background: #28a745; margin: 10px auto;"></div>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="color: #2e7d32; margin: 0; font-weight: bold; text-align: center;">
            🚴‍♂️ Welcome to the Team!
          </p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
          ${businessName} has invited you to join as a Rider
        </h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Hello ${riderName},
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          You've been invited by <strong>${businessName}</strong> to join their delivery team on OtoNav.
          Click the link below to complete your registration:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationLink}" 
             style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Complete Registration
          </a>
        </div>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #0056b3; font-weight: bold; margin-bottom: 10px;">📋 What you'll need:</p>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Set your password</li>
            <li>Add your phone number</li>
            <li>Verify your account</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #856404; margin: 0; font-weight: bold; margin-bottom: 10px;">⚠️ Important:</p>
          <p style="color: #856404; margin: 0; font-size: 14px;">
            This link will expire in 24 hours. If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Invited by ${businessName} via OtoNav platform.
            <br>Need help? Contact ${businessName} or support@otonav.com
          </p>
        </div>
      </div>
    `,
  });
};

const sendRiderInvitationEmail = async (
  email: string,
  invitationLink: string,
  businessName: string,
  riderName: string,
) => {
  await sendEmail({
    to: email,
    subject: `Join Our Delivery Team - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b35; margin-bottom: 5px;">OtoNav</h1>
          <p style="color: #666; font-size: 14px;">Delivery Management Platform</p>
          <div style="height: 3px; width: 100px; background: #ff6b35; margin: 10px auto;"></div>
        </div>
        
        <div style="background: #ffe8e0; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="color: #d84315; margin: 0; font-weight: bold; text-align: center;">
            🤝 New Organization Invitation
          </p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
          Join ${businessName}'s Delivery Team
        </h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Hello ${riderName},
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          <strong>${businessName}</strong> has invited you to join their delivery team on OtoNav.
          You already have an OtoNav account, so you can accept this invitation to work with them.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #0056b3; font-weight: bold; margin-bottom: 10px;">ℹ️ How it works:</p>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>You'll be added to ${businessName}'s organization</li>
            <li>You can work with multiple businesses</li>
            <li>Your existing account will remain active</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This invitation will expire in 7 days.
            <br>If you don't want to accept this invitation, simply ignore this email.
          </p>
        </div>
      </div>
    `,
  });
};

const sendCustomerRegistrationLinkEmail = async (
  email: string,
  registrationLink: string,
  businessName: string,
) => {
  await sendEmail({
    to: email,
    subject: `Complete Your Registration with ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #17a2b8; margin-bottom: 5px;">OtoNav</h1>
          <p style="color: #666; font-size: 14px;">Delivery Management Platform</p>
          <div style="height: 3px; width: 100px; background: #17a2b8; margin: 10px auto;"></div>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
          Complete Your Registration with ${businessName}
        </h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          ${businessName} has added you as a customer on OtoNav. 
          Click the link below to complete your registration and start placing orders:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationLink}" 
             style="background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Complete Registration
          </a>
        </div>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #0056b3; font-weight: bold; margin-bottom: 10px;">What to expect:</p>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Set your password</li>
            <li>Add your name (optional)</li>
            <li>Verify your account</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This link will expire in 24 hours.
            <br>If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });
};

const sendPasswordResetOTPEmail = async (
  email: string,
  otp: string,
  name: string,
) => {
  await sendEmail({
    to: email,
    subject: `Reset Your Password`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin-bottom: 10px;">🔒 Password Reset</h1>
          <div style="height: 3px; width: 100px; background: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Hello ${name || "there"},
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          You requested to reset your password. Use this OTP to proceed:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 2px dashed #dc3545;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #dc3545; margin-bottom: 10px;">
            ${otp}
          </div>
          <div style="font-size: 14px; color: #666;">
            Valid for 10 minutes
          </div>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          Enter this OTP on the password reset page to create a new password.
        </p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #856404; margin: 0; font-weight: 500;">
            🔒 Security Notice:
          </p>
          <ul style="color: #856404; margin: 10px 0 0 20px; padding: 0;">
            <li>Never share this OTP with anyone</li>
            <li>The OTP expires in 10 minutes</li>
            <li>If you didn't request this, ignore this email</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            For your security, this OTP will expire shortly.
          </p>
        </div>
      </div>
    `,
  });
};

// --- Core Auth Logic ---
const isCustomerProfileComplete = (user: any): boolean => {
  if (user.role === "customer") {
    return Array.isArray(user.locations) && user.locations.length > 0;
  }
  return user.registrationStatus === "completed";
};

// --- Helper: Explicit column selection to avoid registration_completed errors ---
const selectUserColumns = {
  id: users.id,
  email: users.email,
  password: users.password,
  name: users.name,
  locations: users.locations,
  isProfileComplete: users.isProfileComplete,
  currentLocation: users.currentLocation,
  role: users.role,
  registrationStatus: users.registrationStatus,
  emailVerified: users.emailVerified,
  verificationToken: users.verificationToken,
  tokenVersion: users.tokenVersion,
  resetPasswordToken: users.resetPasswordToken,
  resetPasswordExpires: users.resetPasswordExpires,
  lastPasswordChange: users.lastPasswordChange,
  otpCode: users.otpCode,
  otpExpires: users.otpExpires,
  otpType: users.otpType,
  registrationToken: users.registrationToken,
  registrationTokenExpires: users.registrationTokenExpires,
  invitationToken: users.invitationToken,
  invitationTokenExpires: users.invitationTokenExpires,
  phoneNumber: users.phoneNumber,
  profileImage: users.profileImage,
  profileImagePublicId: users.profileImagePublicId,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

export const registerBusiness = async (
  email: string,
  password: string,
  name: string,
  businessName: string,
  phoneNumber: string,
  businessAddress: string,
) => {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);

  return await db
    .transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: businessName,
          address: businessAddress,
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          email,
          password: passwordHash,
          name,
          phoneNumber: phoneNumber,
          role: "owner",
          emailVerified: false,
          registrationStatus: "pending",
          tokenVersion: 1,
        })
        .returning();

      await tx.insert(userOrganizations).values({
        userId: user.id,
        orgId: org.id,
        role: "owner",
        isActive: true,
        isSuspended: false,
      });

      await tx
        .update(organizations)
        .set({ ownerUserId: user.id })
        .where(eq(organizations.id, org.id));

      const otp = generateOTP();
      await storeOTP(user.id, otp, "verify", tx);

      await tx.insert(auditLogs).values({
        orgId: org.id,
        userId: user.id,
        action: "business.registered",
        severity: "info",
        timestamp: new Date(),
      });

      return {
        user,
        org,
        otp,
      };
    })
    .then(async (result) => {
      await sendVerificationOTPEmail(email, result.otp, name || "");
      return {
        user: result.user,
        org: result.org,
        otp: result.otp,
      };
    });
};

export const registerCustomer = async (
  email: string,
  password: string,
  name: string,
  phoneNumber: string,
) => {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);

  const [customer] = await db
    .insert(users)
    .values({
      email,
      password: passwordHash,
      name,
      phoneNumber: phoneNumber,
      role: "customer",
      emailVerified: false,
      registrationStatus: "pending",
      isProfileComplete: false,
      tokenVersion: 1,
    })
    .returning();

  const otp = generateOTP();
  await storeOTP(customer.id, otp, "verify");
  await sendVerificationOTPEmail(email, otp, name || "");

  return {
    ...customer,
    otp: otp,
  };
};

export const verifyEmailWithOTP = async (
  email: string,
  otp: string,
): Promise<boolean> => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOTP = otp.trim();

  return await db.transaction(async (tx) => {
    const user = await tx
      .select(selectUserColumns)
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.emailVerified) {
      await tx
        .update(users)
        .set({
          otpCode: null,
          otpExpires: null,
          otpType: null,
        })
        .where(eq(users.id, user.id));
      return true;
    }

    if (!user.otpCode || !user.otpExpires || !user.otpType) {
      throw new Error("No OTP found. Please request a new verification code.");
    }

    if (user.otpType !== "verify") {
      throw new Error(
        "Invalid OTP type. This OTP is not for email verification.",
      );
    }

    const now = new Date();
    const expiresAt = new Date(user.otpExpires);
    const isExpired = now > expiresAt;

    if (isExpired) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    const otpMatch = normalizedOTP === user.otpCode.trim();

    if (!otpMatch) {
      throw new Error("Invalid OTP code.");
    }

    await tx
      .update(users)
      .set({
        emailVerified: true,
        registrationStatus: "completed",
        otpCode: null,
        otpExpires: null,
        otpType: null,
      })
      .where(eq(users.id, user.id));

    return true;
  });
};

export const authenticateUser = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
    .limit(1)
    .then((rows) => rows[0]);

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  if (!user.emailVerified) {
    const otp = generateOTP();
    await storeOTP(user.id, otp, "verify");
    await sendVerificationOTPEmail(email, otp, user.name || "");
    throw new Error(`Please verify your email. A new OTP has been sent.`);
  }

  const userOrgs = await db
    .select({
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, user.id),
        eq(userOrganizations.isActive, true),
      ),
    );

  const defaultOrgId = userOrgs.length === 1 ? userOrgs[0].orgId : null;
  const defaultRole = userOrgs.length === 1 ? userOrgs[0].role : user.role;

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: defaultOrgId,
    role: defaultRole,
    organizations: userOrgs,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenVersion: user.tokenVersion || 1,
  });

  const profileComplete = isCustomerProfileComplete(user);

  return {
    user: {
      ...user,
      organizations: userOrgs,
      isProfileComplete: profileComplete,
    },
    accessToken,
    refreshToken,
  };
};

export const getUserById = async (userId: string) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }

  const profileComplete = isCustomerProfileComplete(user);

  const response: any = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    phoneNumber: user.phoneNumber,
    isProfileComplete: profileComplete,
    registrationStatus: user.registrationStatus,
    profileImage: user.profileImage,
  };

  if (user.role === "customer") {
    response.locations = user.locations || [];
  } else if (user.role === "rider") {
    response.currentLocation = user.currentLocation;
  }

  return response;
};

export const createRiderAccount = async (
  ownerId: string,
  orgId: string,
  riderEmail: string,
  riderName: string,
) => {
  const owner = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1)
    .then((rows) => rows[0]);

  const ownerMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized: Only owners can create rider accounts");
  }

  const existingUser = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.email, riderEmail))
    .limit(1)
    .then((rows) => rows[0]);

  const org = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!org) {
    throw new Error("Organization not found");
  }

  return await db.transaction(async (tx) => {
    let rider;
    let token;
    let emailType;
    let registrationLink = "";
    let invitationLink = "";

    if (existingUser) {
      const existingMembership = await tx
        .select({
          userId: userOrganizations.userId,
          orgId: userOrganizations.orgId,
          registrationStatus: userOrganizations.registrationStatus,
        })
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, existingUser.id),
            eq(userOrganizations.orgId, orgId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existingMembership) {
        if (existingMembership.registrationStatus === "pending") {
          throw new Error("Rider already has a pending invitation");
        }
        throw new Error("Rider already belongs to this organization");
      }

      token = generateInvitationToken(riderEmail, orgId, "rider");
      invitationLink = getInvitationLink(token);
      emailType = "invitation";

      await sendRiderInvitationEmail(
        riderEmail,
        invitationLink,
        org.name,
        riderName,
      );

      await tx.insert(userOrganizations).values({
        userId: existingUser.id,
        orgId: orgId,
        role: "rider",
        isActive: false,
        isSuspended: false,
        registrationStatus: "pending",
        invitedAt: new Date(),
        invitationSentAt: new Date(),
        joinedAt: null,
      });

      await tx
        .update(users)
        .set({
          invitationToken: token,
          invitationTokenExpires: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ),
        })
        .where(eq(users.id, existingUser.id));
    } else {
      token = generateRegistrationToken(riderEmail, orgId, "rider");
      registrationLink = getRegistrationLink(token, "rider");
      emailType = "registration";

      const tempPassword = `temp_${Math.random().toString(36).slice(2, 12)}`;
      const tempPasswordHash = await hashPassword(tempPassword);

      [rider] = await tx
        .insert(users)
        .values({
          email: riderEmail,
          password: tempPasswordHash,
          name: riderName,
          role: "rider",
          emailVerified: false,
          registrationStatus: "pending",
          registrationToken: token,
          registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tokenVersion: 1,
        })
        .returning();

      await tx.insert(userOrganizations).values({
        userId: rider.id,
        orgId: orgId,
        role: "rider",
        isActive: false,
        isSuspended: false,
        registrationStatus: "pending",
        invitedAt: new Date(),
        invitationSentAt: new Date(),
        joinedAt: null,
      });

      await sendRiderRegistrationLinkEmail(
        riderEmail,
        registrationLink,
        org.name,
        riderName,
      );
    }

    await tx.insert(auditLogs).values({
      orgId: orgId,
      userId: ownerId,
      action:
        emailType === "invitation" ? "rider.invited" : "rider.account_created",
      severity: "info",
      details: {
        riderEmail,
        riderName,
        emailType,
        status: "pending",
        createdBy: owner.email,
      },
      timestamp: new Date(),
    });

    return {
      id: rider?.id || existingUser?.id,
      email: riderEmail,
      name: riderName,
      emailSent: true,
      emailType,
      status: "pending",
      token: token,
      registrationLink: registrationLink || null,
      invitationLink: invitationLink || null,
    };
  });
};

export const completeRiderRegistrationViaToken = async (
  token: string,
  password: string,
  phoneNumber?: string,
) => {
  let cleanToken = token;
  if (token.includes("&")) {
    cleanToken = token.split("&")[0];
  }

  if (cleanToken.includes("token=")) {
    const match = cleanToken.match(/token=([^&]+)/);
    if (match) {
      cleanToken = match[1];
    }
  }

  let payload;
  try {
    const decoded = jwt.decode(cleanToken) as any;
    if (!decoded || !decoded.email) {
      throw new Error("Invalid token structure");
    }

    payload = jwt.verify(cleanToken, JWT_SECRET) as any;
  } catch (error: any) {
    throw new Error(`Invalid token: ${error.message}`);
  }

  if (payload.type !== "registration") {
    throw new Error(
      `Invalid token type. Expected "registration", got "${payload.type}"`,
    );
  }

  if (payload.role !== "rider") {
    throw new Error(`Invalid role. Expected "rider", got "${payload.role}"`);
  }

  const { email, orgId } = payload;

  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error(`No user found with email: ${email}`);
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOTP();
  const otpExpires = getOTPExpiration();

  const [updatedUser] = await db
    .update(users)
    .set({
      password: passwordHash,
      phoneNumber: phoneNumber || null,
      registrationStatus: "completed",
      registrationToken: null,
      registrationTokenExpires: null,
      otpCode: otp,
      otpExpires: otpExpires,
      otpType: "verify",
    })
    .where(eq(users.id, user.id))
    .returning();

  await db
    .update(userOrganizations)
    .set({
      isActive: true,
      registrationStatus: "completed",
      joinedAt: new Date(),
    })
    .where(
      and(
        eq(userOrganizations.userId, updatedUser.id),
        eq(userOrganizations.orgId, orgId),
      ),
    );

  await sendVerificationOTPEmail(user.email, otp, updatedUser.name || "");

  await db.insert(auditLogs).values({
    orgId: orgId,
    userId: updatedUser.id,
    action: "rider.registration_completed",
    severity: "info",
    details: {
      viaToken: true,
      status: "completed",
      completedAt: new Date().toISOString(),
    },
    timestamp: new Date(),
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    emailVerified: updatedUser.emailVerified,
    registrationStatus: updatedUser.registrationStatus,
    otp: otp,
  };
};

export const acceptInvitation = async (token: string) => {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }

  if (payload.type !== "invitation" || payload.role !== "rider") {
    throw new Error("Invalid token type");
  }

  const { email, orgId } = payload;

  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(
      and(
        eq(users.email, email),
        eq(users.invitationToken, token),
        sql`${users.invitationTokenExpires} > NOW()`,
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("Invalid invitation token or token expired");
  }

  const existingMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      registrationStatus: userOrganizations.registrationStatus,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, user.id),
        eq(userOrganizations.orgId, orgId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existingMembership) {
    if (existingMembership.registrationStatus === "pending") {
      await db
        .update(userOrganizations)
        .set({
          isActive: true,
          registrationStatus: "completed",
          joinedAt: new Date(),
        })
        .where(
          and(
            eq(userOrganizations.userId, user.id),
            eq(userOrganizations.orgId, orgId),
          ),
        );
    } else {
      throw new Error("User already belongs to this organization");
    }
  } else {
    await db.insert(userOrganizations).values({
      userId: user.id,
      orgId: orgId,
      role: "rider",
      isActive: true,
      isSuspended: false,
      registrationStatus: "completed",
      joinedAt: new Date(),
    });
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      invitationToken: null,
      invitationTokenExpires: null,
    })
    .where(eq(users.id, user.id))
    .returning();

  const org = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  await db.insert(auditLogs).values({
    orgId: orgId,
    userId: updatedUser.id,
    action: "rider.invitation_accepted",
    severity: "info",
    details: {
      organizationName: org?.name,
    },
    timestamp: new Date(),
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
  };
};

export const resendRiderInvitation = async (
  ownerId: string,
  orgId: string,
  riderId: string,
) => {
  const owner = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1)
    .then((rows) => rows[0]);

  const ownerMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized");
  }

  const rider = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, riderId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!rider) {
    throw new Error("Rider not found");
  }

  const membership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      registrationStatus: userOrganizations.registrationStatus,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.registrationStatus, "pending"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!membership) {
    throw new Error("No pending invitation found");
  }

  const org = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  let token;
  let emailType;

  if (rider.emailVerified && rider.registrationStatus === "completed") {
    token = generateInvitationToken(rider.email, orgId, "rider");
    emailType = "invitation";
    await sendRiderInvitationEmail(
      rider.email,
      getInvitationLink(token),
      org!.name,
      rider.name || rider.email,
    );

    await db
      .update(users)
      .set({
        invitationToken: token,
        invitationTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, riderId));
  } else {
    token = generateRegistrationToken(rider.email, orgId, "rider");
    emailType = "registration";
    await sendRiderRegistrationLinkEmail(
      rider.email,
      getRegistrationLink(token, "rider"),
      org!.name,
      rider.name || rider.email,
    );

    await db
      .update(users)
      .set({
        registrationToken: token,
        registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, riderId));
  }

  await db
    .update(userOrganizations)
    .set({
      invitationSentAt: new Date(),
    })
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId),
      ),
    );

  return {
    success: true,
    message: `Invitation resent to ${rider.email}`,
    emailType,
  };
};

export const cancelRiderInvitation = async (
  ownerId: string,
  orgId: string,
  riderId: string,
) => {
  const owner = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1)
    .then((rows) => rows[0]);

  const ownerMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized");
  }

  const membership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      registrationStatus: userOrganizations.registrationStatus,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.registrationStatus, "pending"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!membership) {
    throw new Error("No pending invitation found");
  }

  await db
    .delete(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId),
      ),
    );

  const rider = await db
    .select(selectUserColumns)
    .from(users)
    .where(
      and(
        eq(users.id, riderId),
        eq(users.registrationStatus, "pending"),
        eq(users.emailVerified, false),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (rider) {
    const otherMemberships = await db
      .select({ id: userOrganizations.id })
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, riderId))
      .then((rows) => rows);

    if (otherMemberships.length === 0) {
      await db.delete(users).where(eq(users.id, riderId));
    }
  }

  return {
    success: true,
    message: "Invitation cancelled successfully",
  };
};

export const createCustomerAccount = async (
  ownerId: string,
  orgId: string,
  customerEmail: string,
  customerName?: string,
) => {
  const ownerMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!ownerMembership) {
    throw new Error("Unauthorized: Only owners can create customer accounts");
  }

  const existingUser = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.email, customerEmail))
    .limit(1)
    .then((rows) => rows[0]);

  const org = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!org) {
    throw new Error("Organization not found");
  }

  if (
    existingUser &&
    existingUser.emailVerified &&
    existingUser.registrationStatus === "completed" &&
    existingUser.role === "customer"
  ) {
    throw new Error("Customer already exists and is verified");
  }

  return await db.transaction(async (tx) => {
    let customer;
    const token = generateRegistrationToken(
      customerEmail,
      "",
      "customer",
      customerName,
    );
    const registrationLink = getRegistrationLink(token, "customer");

    if (existingUser && !existingUser.emailVerified) {
      [customer] = await tx
        .update(users)
        .set({
          name: customerName || existingUser.name,
          role: "customer",
          registrationToken: token,
          registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          registrationStatus: "pending",
          isProfileComplete: false,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
    } else {
      const tempPassword = `temp_${Math.random().toString(36).slice(2, 12)}`;
      const tempPasswordHash = await hashPassword(tempPassword);

      [customer] = await tx
        .insert(users)
        .values({
          email: customerEmail,
          password: tempPasswordHash,
          name: customerName || null,
          role: "customer",
          emailVerified: false,
          registrationToken: token,
          registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          registrationStatus: "pending",
          isProfileComplete: false,
          tokenVersion: 1,
        })
        .returning();
    }

    await sendCustomerRegistrationLinkEmail(
      customerEmail,
      registrationLink,
      org.name,
    );

    await tx.insert(auditLogs).values({
      orgId: orgId,
      userId: ownerId,
      action: "customer.account_created",
      severity: "info",
      details: {
        customerEmail,
        customerName: customerName || "Not provided",
        createdBy: ownerMembership.userId,
        status: "pending",
      },
      timestamp: new Date(),
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      emailSent: true,
      status: "pending",
      token: token,
      registrationLink: registrationLink,
    };
  });
};

export const resendCustomerRegistrationLink = async (
  ownerId: string,
  orgId: string,
  customerId: string,
) => {
  const owner = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1)
    .then((rows) => rows[0]);

  const ownerMembership = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized");
  }

  const customer = await db
    .select(selectUserColumns)
    .from(users)
    .where(
      and(
        eq(users.id, customerId),
        eq(users.role, "customer"),
        eq(users.emailVerified, false),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!customer) {
    throw new Error("Customer not found or already verified");
  }

  const org = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  const token = generateRegistrationToken(
    customer.email,
    "",
    "customer",
    customer.name || undefined,
  );

  const registrationLink = getRegistrationLink(token, "customer");

  await db
    .update(users)
    .set({
      registrationToken: token,
      registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .where(eq(users.id, customerId));

  await sendCustomerRegistrationLinkEmail(
    customer.email,
    registrationLink,
    org!.name,
  );

  return {
    success: true,
    message: `Registration link resent to ${customer.email}`,
  };
};

export const completeCustomerRegistrationViaToken = async (
  token: string,
  password: string,
  phoneNumber?: string,
  name?: string,
) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.registrationToken, token))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("Invalid registration token");
  }

  if (
    !user.registrationTokenExpires ||
    user.registrationTokenExpires < new Date()
  ) {
    throw new Error("Registration token has expired");
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    console.error("JWT verification error:", error);
    throw new Error("Invalid or expired token");
  }

  if (payload.type !== "registration" || payload.role !== "customer") {
    throw new Error("Invalid token type");
  }

  if (payload.email !== user.email) {
    throw new Error("Token email mismatch");
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOTP();
  const otpExpires = getOTPExpiration();

  const updateData: any = {
    password: passwordHash,
    phoneNumber: phoneNumber || null,
    registrationStatus: "completed",
    registrationToken: null,
    registrationTokenExpires: null,
    isProfileComplete: false,
    otpCode: otp,
    otpExpires: otpExpires,
    otpType: "verify",
  };

  if (name) {
    updateData.name = name;
  } else if (payload.name) {
    updateData.name = payload.name;
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id))
    .returning();

  await sendVerificationOTPEmail(user.email, otp, updatedUser.name || "");

  const accessToken = generateAccessToken({
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    emailVerified: updatedUser.emailVerified,
    registrationStatus: updatedUser.registrationStatus,
    phoneNumber: updatedUser.phoneNumber,
    otp: otp,
    token: accessToken,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const payload = verifyToken<RefreshTokenPayload>(refreshToken);
  if (payload.type !== "refresh") throw new Error("Invalid token type");

  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new Error("Token revoked or user not found");
  }

  const userOrgs = await db
    .select({
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, user.id),
        eq(userOrganizations.isActive, true),
      ),
    );

  const defaultOrgId = userOrgs.length === 1 ? userOrgs[0].orgId : null;
  const defaultRole = userOrgs.length === 1 ? userOrgs[0].role : user.role;

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: defaultOrgId,
    role: defaultRole,
    organizations: userOrgs,
  });

  return { accessToken };
};

export const logoutUser = async (userId: string) => {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
};

export const updateUserProfile = async (
  userId: string,
  updates: {
    name?: string | null;
    email?: string;
    phoneNumber?: string;
    profileImage?: string;
    locations?: Array<{ label: string; preciseLocation: string }>;
    addLocation?: { label: string; preciseLocation: string };
    removeLocation?: number | string;
    updateLocation?: {
      index: number;
      label?: string;
      preciseLocation?: string;
    };
  },
) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }

  const updateData: any = {};
  let oldProfileImagePublicId: string | null = null;
  let tempFilePath: string | null = null;

  try {
    if (updates.profileImage !== undefined) {
      if (updates.profileImage === null || updates.profileImage === "") {
        if (user.profileImagePublicId) {
          await CloudinaryService.deleteImage(user.profileImagePublicId);
          updateData.profileImage = null;
          updateData.profileImagePublicId = null;
        }
      } else if (updates.profileImage.startsWith("data:image/")) {
        if (user.profileImagePublicId) {
          oldProfileImagePublicId = user.profileImagePublicId;
        }

        tempFilePath = await saveUploadedImage(updates.profileImage);
        const uploadResult = await CloudinaryService.updateImage(
          oldProfileImagePublicId,
          tempFilePath,
          {
            folder: "user_profiles",
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          },
        );

        updateData.profileImage = uploadResult.secureUrl;
        updateData.profileImagePublicId = uploadResult.publicId;
      } else if (updates.profileImage.startsWith("http")) {
        updateData.profileImage = updates.profileImage;
        updateData.profileImagePublicId = null;
      }
    }

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.phoneNumber !== undefined) {
      if (updates.phoneNumber && updates.phoneNumber.trim() !== "") {
        const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(updates.phoneNumber)) {
          throw new Error("Invalid phone number format");
        }
      }
      updateData.phoneNumber = updates.phoneNumber || null;
    }

    const currentLocations: Array<{ label: string; preciseLocation: string }> =
      user.locations || [];

    let newLocations = currentLocations;
    let locationsChanged = false;

    if (updates.locations !== undefined) {
      newLocations = updates.locations;
      locationsChanged = true;
    } else if (updates.addLocation) {
      const newLocation = {
        label: updates.addLocation.label,
        preciseLocation: updates.addLocation.preciseLocation,
      };

      const labelExists = currentLocations.some(
        (loc) => loc.label === newLocation.label,
      );

      if (labelExists) {
        throw new Error(
          `Location with label "${newLocation.label}" already exists`,
        );
      }

      newLocations = [...currentLocations, newLocation];
      locationsChanged = true;
    } else if (updates.removeLocation !== undefined) {
      let indexToRemove: number;

      if (typeof updates.removeLocation === "string") {
        indexToRemove = currentLocations.findIndex(
          (loc) => loc.label === updates.removeLocation,
        );
        if (indexToRemove === -1) {
          throw new Error(
            `Location with label "${updates.removeLocation}" not found`,
          );
        }
      } else {
        indexToRemove = updates.removeLocation as number;
        if (indexToRemove < 0 || indexToRemove >= currentLocations.length) {
          throw new Error(`Location index ${indexToRemove} out of bounds`);
        }
      }

      newLocations = [...currentLocations];
      newLocations.splice(indexToRemove, 1);
      locationsChanged = true;
    } else if (updates.updateLocation) {
      const { index, label, preciseLocation } = updates.updateLocation;

      if (index < 0 || index >= currentLocations.length) {
        throw new Error(`Location index ${index} out of bounds`);
      }

      newLocations = [...currentLocations];

      if (label && label !== newLocations[index].label) {
        const labelExists = newLocations.some(
          (loc, i) => i !== index && loc.label === label,
        );

        if (labelExists) {
          throw new Error(`Location with label "${label}" already exists`);
        }
      }

      if (label !== undefined) {
        newLocations[index].label = label;
      }

      if (preciseLocation !== undefined) {
        newLocations[index].preciseLocation = preciseLocation;
      }

      locationsChanged = true;
    }

    if (locationsChanged) {
      updateData.locations = newLocations;

      if (user.role === "customer") {
        updateData.isProfileComplete = newLocations.length > 0;
      }
    }

    if (updates.email) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.email, updates.email), sql`${users.id} != ${userId}`),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existingUser) {
        throw new Error("Email already in use");
      }

      updateData.email = updates.email;
      updateData.emailVerified = false;

      const otp = generateOTP();
      updateData.otpCode = otp;
      updateData.otpExpires = getOTPExpiration();
      updateData.otpType = "verify";
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields to update");
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (updates.email && updateData.otpCode) {
      await sendVerificationOTPEmail(
        updates.email,
        updateData.otpCode,
        updatedUser.name || "",
      );
    }

    return updatedUser;
  } catch (error) {
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error("Failed to clean up temp file:", cleanupError);
      }
    }
    throw error;
  }
};

export const updateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await hashPassword(newPassword);

  const [updatedUser] = await db
    .update(users)
    .set({
      password: passwordHash,
      lastPasswordChange: new Date(),
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId))
    .returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "password.changed",
    severity: "info",
    timestamp: new Date(),
  });

  return updatedUser;
};

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }

  if (
    !verifyOTP(otp, user.otpCode || "", user.otpExpires || new Date()) ||
    user.otpType !== "reset"
  ) {
    throw new Error("Invalid or expired OTP");
  }

  const passwordHash = await hashPassword(newPassword);

  const [updatedUser] = await db
    .update(users)
    .set({
      password: passwordHash,
      otpCode: null,
      otpExpires: null,
      otpType: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      lastPasswordChange: new Date(),
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, user.id))
    .returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "password.reset",
    severity: "info",
    timestamp: new Date(),
  });

  return updatedUser;
};

export const initiatePasswordReset = async (email: string) => {
  const user = await db
    .select(selectUserColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    return;
  }

  const otp = generateOTP();
  await storeOTP(user.id, otp, "reset");
  await sendPasswordResetOTPEmail(email, otp, user.name || "");

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "password.reset_initiated",
    severity: "info",
    timestamp: new Date(),
  });
};

export const resendVerificationOTP = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  return await db
    .transaction(async (tx) => {
      const user = await tx
        .select(selectUserColumns)
        .from(users)
        .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.emailVerified) {
        throw new Error("Email already verified");
      }

      const otp = generateOTP();
      await storeOTP(user.id, otp, "verify", tx);

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        otp: otp,
      };
    })
    .then(async (data) => {
      await sendVerificationOTPEmail(data.email, data.otp, data.name || "");

      return {
        success: true,
        message: "Verification code sent successfully",
        ...(process.env.NODE_ENV === "development" && { otp: data.otp }),
      };
    });
};
