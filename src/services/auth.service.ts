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
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// --- JWT Utilities ---
export const generateAccessToken = (
  payload: Omit<TokenPayload, "type">
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
    { expiresIn: REFRESH_EXPIRES_IN } as SignOptions
  );
};

export const verifyToken = <T = TokenPayload>(token: string): T => {
  return jwt.verify(token, JWT_SECRET) as T;
};

// --- Token Generation for Registration/Invitation ---
const generateRegistrationToken = (
  email: string,
  orgId: string = "", // Make orgId optional with a default value
  role: string,
  name?: string // Add name parameter
): string => {
  if (role === "customer") {
    // Customers don't belong to specific orgs, so don't include orgId
    return jwt.sign(
      {
        email,
        name, // Include name in the token
        role,
        type: "registration",
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
  }

  // Riders need orgId
  if (!orgId) {
    throw new Error("orgId is required for rider registration tokens");
  }

  return jwt.sign(
    {
      email,
      name, // Include name for riders too
      orgId,
      role,
      type: "registration",
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const generateInvitationToken = (
  email: string,
  orgId: string,
  role: string
): string => {
  return jwt.sign(
    {
      email,
      orgId,
      role,
      type: "invitation",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// --- Link Generation ---
const getRegistrationLink = (
  token: string,
  type: "rider" | "customer"
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
  dbClient?: any
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
    .returning({ id: users.id, email: users.email });

  if (!result || result.length === 0) {
    throw new Error(`No user found with ID: ${userId}`);
  }

  return result[0];
};

// --- Email Templates ---
const sendVerificationOTPEmail = async (
  email: string,
  otp: string,
  name: string
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
  riderName: string
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
  riderName: string
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
  businessName: string
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
  name: string
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

/**
 * Register a Business (Owner)
 */
export const registerBusiness = async (
  email: string,
  password: string,
  name: string,
  businessName: string,
  phoneNumber: string
) => {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);

  return await db
    .transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: businessName,
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          email,
          password: passwordHash,
          name,
          phoneNumber: phoneNumber,
          role: "owner", // Global role
          // Remove orgId from users table insertion
          emailVerified: false,
          tokenVersion: 1,
        })
        .returning();

      // Add user to user_organizations as owner
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

/**
 * Register a Customer (Public registration)
 */
export const registerCustomer = async (
  email: string,
  password: string,
  name: string,
  phoneNumber: string
) => {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
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

/**
 * Verify Email with OTP - FIXED VERSION
 */
export const verifyEmailWithOTP = async (
  email: string,
  otp: string
): Promise<boolean> => {
  // Normalize email: trim whitespace and convert to lowercase
  const normalizedEmail = email.trim().toLowerCase();

  console.log("=== Debug: Email Verification ===");
  console.log("Original email:", email);
  console.log("Normalized email:", normalizedEmail);
  console.log("OTP received:", otp);

  const user = await db.query.users.findFirst({
    where: sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`,
  });

  console.log("User found:", user ? "Yes" : "No");
  if (user) {
    console.log("User ID:", user.id);
    console.log("Stored OTP:", user.otpCode);
    console.log("OTP Type:", user.otpType);
    console.log("OTP Expires:", user.otpExpires);
    console.log("Email Verified:", user.emailVerified);
  }

  if (!user) {
    throw new Error("User not found");
  }

  // FIXED: If already verified, just return true without requiring OTP
  if (user.emailVerified) {
    console.log("Email already verified, returning success");
    return true;
  }

  // Verify OTP
  if (
    !verifyOTP(otp, user.otpCode || "", user.otpExpires || new Date()) ||
    user.otpType !== "verify"
  ) {
    throw new Error("Invalid or expired OTP");
  }

  // Update user - set emailVerified to true
  await db
    .update(users)
    .set({
      emailVerified: true,
      otpCode: null,
      otpExpires: null,
      otpType: null,
    })
    .where(eq(users.id, user.id));

  console.log("Email verified successfully for user:", user.id);
  return true;
};

/**
 * Authenticate User (Login)
 */
export const authenticateUser = async (email: string, password: string) => {
  // FIXED: Normalize email for consistency
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.query.users.findFirst({
    where: sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`,
  });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  // FIXED: Check emailVerified status after fetching user
  if (!user.emailVerified) {
    const otp = generateOTP();
    await storeOTP(user.id, otp, "verify");
    await sendVerificationOTPEmail(email, otp, user.name || "");
    throw new Error(
      `Please verify your email. A new OTP has been sent. OTP for testing: ${otp}`
    );
  }

  // Get user's organizations
  const userOrgs = await db
    .select({
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, user.id),
        eq(userOrganizations.isActive, true)
      )
    );

  // If user has only one organization, use it as default
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

  return {
    user: {
      ...user,
      organizations: userOrgs,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Get User by ID
 */
export const getUserById = async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      phoneNumber: true,
      registrationCompleted: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Create Rider Account (Owner Action) - UPDATED with pending status
 */
export const createRiderAccount = async (
  ownerId: string,
  orgId: string,
  riderEmail: string,
  riderName: string
) => {
  const owner = await db.query.users.findFirst({
    where: eq(users.id, ownerId),
  });

  const ownerMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, ownerId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.role, "owner")
    ),
  });

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized: Only owners can create rider accounts");
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, riderEmail),
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

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
      // Check if rider already belongs to this organization
      const existingMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, existingUser.id),
          eq(userOrganizations.orgId, orgId)
        ),
      });

      if (existingMembership) {
        // If they already have a pending invitation, resend it
        if (existingMembership.registrationStatus === "pending") {
          throw new Error("Rider already has a pending invitation");
        }
        throw new Error("Rider already belongs to this organization");
      }

      // Send invitation to join new organization
      token = generateInvitationToken(riderEmail, orgId, "rider");
      invitationLink = getInvitationLink(token);
      emailType = "invitation";

      await sendRiderInvitationEmail(
        riderEmail,
        invitationLink,
        org.name,
        riderName
      );

      // Create pending membership for existing user
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
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ),
        })
        .where(eq(users.id, existingUser.id));
    } else {
      // New user - send registration link
      token = generateRegistrationToken(riderEmail, orgId, "rider");
      registrationLink = getRegistrationLink(token, "rider");
      emailType = "registration";

      // Generate a temporary password
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
          registrationCompleted: false,
          registrationStatus: "pending",
          registrationToken: token,
          registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tokenVersion: 1,
        })
        .returning();

      // Create pending membership for new user
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
        riderName
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

/**
 * Complete Rider Registration via Token (Public) - UPDATED
 */
export const completeRiderRegistrationViaToken = async (
  token: string,
  password: string,
  phoneNumber?: string
) => {
  console.log("=== Debug: Rider Registration ===");
  console.log("Received token:", token);
  console.log("Token length:", token.length);

  if (!token || token.trim() === "") {
    throw new Error("Token is required");
  }

  let cleanToken = token;
  if (token.includes("&")) {
    cleanToken = token.split("&")[0];
    console.log("Cleaned token from URL params:", cleanToken);
  }

  if (cleanToken.includes("token=")) {
    const match = cleanToken.match(/token=([^&]+)/);
    if (match) {
      cleanToken = match[1];
      console.log("Extracted token from token= param:", cleanToken);
    }
  }

  let payload;
  try {
    const decoded = jwt.decode(cleanToken) as any;
    console.log("Decoded token payload:", decoded);

    if (!decoded || !decoded.email) {
      console.error("Invalid token structure. Decoded:", decoded);
      throw new Error("Invalid token structure");
    }

    payload = jwt.verify(cleanToken, JWT_SECRET) as any;
    console.log("Verified JWT payload:", payload);
  } catch (error: any) {
    console.error("JWT error:", error.message);
    console.error("Error name:", error.name);
    console.error("Clean token used:", cleanToken.substring(0, 50) + "...");
    throw new Error(`Invalid token: ${error.message}`);
  }

  if (payload.type !== "registration") {
    throw new Error(
      `Invalid token type. Expected "registration", got "${payload.type}"`
    );
  }

  if (payload.role !== "rider") {
    throw new Error(`Invalid role. Expected "rider", got "${payload.role}"`);
  }

  const { email, orgId } = payload;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

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
      registrationCompleted: true,
      registrationStatus: "completed",
      registrationToken: null,
      registrationTokenExpires: null,
      otpCode: otp,
      otpExpires: otpExpires,
      otpType: "verify",
    })
    .where(eq(users.id, user.id))
    .returning();

  // Update user_organizations to mark as completed and active
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
        eq(userOrganizations.orgId, orgId)
      )
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
    registrationCompleted: updatedUser.registrationCompleted,
    registrationStatus: updatedUser.registrationStatus,
    otp: otp,
  };
};

/**
 * Accept Invitation (Public) - UPDATED
 */
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

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.email, email),
      eq(users.invitationToken, token),
      sql`${users.invitationTokenExpires} > NOW()`
    ),
  });

  if (!user) {
    throw new Error("Invalid invitation token or token expired");
  }

  const existingMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, user.id),
      eq(userOrganizations.orgId, orgId)
    ),
  });

  if (existingMembership) {
    if (existingMembership.registrationStatus === "pending") {
      // Update pending invitation to completed
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
            eq(userOrganizations.orgId, orgId)
          )
        );
    } else {
      throw new Error("User already belongs to this organization");
    }
  } else {
    // Create new membership
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

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

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

/**
 * Resend Rider Invitation
 */
export const resendRiderInvitation = async (
  ownerId: string,
  orgId: string,
  riderId: string
) => {
  const owner = await db.query.users.findFirst({
    where: eq(users.id, ownerId),
  });

  const ownerMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, ownerId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.role, "owner")
    ),
  });

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized");
  }

  const rider = await db.query.users.findFirst({
    where: eq(users.id, riderId),
  });

  if (!rider) {
    throw new Error("Rider not found");
  }

  const membership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, riderId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.registrationStatus, "pending")
    ),
  });

  if (!membership) {
    throw new Error("No pending invitation found");
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  let token;
  let emailType;

  if (rider.registrationCompleted) {
    // Existing user - resend invitation
    token = generateInvitationToken(rider.email, orgId, "rider");
    emailType = "invitation";
    await sendRiderInvitationEmail(
      rider.email,
      getInvitationLink(token),
      org!.name,
      rider.name || rider.email
    );

    await db
      .update(users)
      .set({
        invitationToken: token,
        invitationTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, riderId));
  } else {
    // New user - resend registration link
    token = generateRegistrationToken(rider.email, orgId, "rider");
    emailType = "registration";
    await sendRiderRegistrationLinkEmail(
      rider.email,
      getRegistrationLink(token, "rider"),
      org!.name,
      rider.name || rider.email
    );

    await db
      .update(users)
      .set({
        registrationToken: token,
        registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, riderId));
  }

  // Update invitation sent timestamp
  await db
    .update(userOrganizations)
    .set({
      invitationSentAt: new Date(),
    })
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId)
      )
    );

  return {
    success: true,
    message: `Invitation resent to ${rider.email}`,
    emailType,
  };
};

/**
 * Cancel Rider Invitation
 */
export const cancelRiderInvitation = async (
  ownerId: string,
  orgId: string,
  riderId: string
) => {
  const owner = await db.query.users.findFirst({
    where: eq(users.id, ownerId),
  });

  const ownerMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, ownerId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.role, "owner")
    ),
  });

  if (!owner || !ownerMembership) {
    throw new Error("Unauthorized");
  }

  const membership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, riderId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.registrationStatus, "pending")
    ),
  });

  if (!membership) {
    throw new Error("No pending invitation found");
  }

  // Remove from user_organizations
  await db
    .delete(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId)
      )
    );

  const rider = await db.query.users.findFirst({
    where: and(
      eq(users.id, riderId),
      eq(users.registrationCompleted, false),
      eq(users.emailVerified, false)
    ),
  });

  if (rider) {
    // Check if user has any other organization memberships
    const otherMemberships = await db.query.userOrganizations.findMany({
      where: eq(userOrganizations.userId, riderId),
    });

    if (otherMemberships.length === 0) {
      // Delete user if no other memberships
      await db.delete(users).where(eq(users.id, riderId));
    }
  }

  return {
    success: true,
    message: "Invitation cancelled successfully",
  };
};

/**
 * Create Customer Account (Business Owner Action)
 */
export const createCustomerAccount = async (
  ownerId: string,
  orgId: string,
  customerEmail: string,
  customerName?: string
) => {
  // FIX: Check owner membership instead of orgId in users table
  const ownerMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, ownerId),
      eq(userOrganizations.orgId, orgId),
      eq(userOrganizations.role, "owner")
    ),
  });

  if (!ownerMembership) {
    throw new Error("Unauthorized: Only owners can create customer accounts");
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, customerEmail),
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // FIX: This logic needs updating - customers don't belong to orgs in user_organizations
  // They're just regular users with role "customer"
  if (
    existingUser &&
    existingUser.role === "customer" &&
    existingUser.emailVerified
  ) {
    throw new Error("Customer already exists and is verified");
  }

  return await db.transaction(async (tx) => {
    let customer;
    const token = generateRegistrationToken(
      customerEmail,
      "",
      "customer",
      customerName
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
          tokenVersion: 1,
        })
        .returning();
    }

    await sendCustomerRegistrationLinkEmail(
      customerEmail,
      registrationLink,
      org.name
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
      },
      timestamp: new Date(),
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      emailSent: true,
      token: token,
      registrationLink: registrationLink,
    };
  });
};

/**
 * Complete Customer Registration via Token (Public)
 */
export const completeCustomerRegistrationViaToken = async (
  token: string,
  password: string,
  phoneNumber?: string, // Add phoneNumber parameter
  name?: string
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.registrationToken, token),
  });

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
    phoneNumber: phoneNumber || null, // Add phone number
    registrationCompleted: true,
    registrationToken: null,
    registrationTokenExpires: null,
    otpCode: otp,
    otpExpires: otpExpires,
    otpType: "verify",
  };

  // Use the name from the token if not provided in the form
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

  // Generate access token for immediate login
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
    registrationCompleted: updatedUser.registrationCompleted,
    phoneNumber: updatedUser.phoneNumber, // Return phone number
    otp: otp,
    token: accessToken,
  };
};

/**
 * Refresh Access Token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  const payload = verifyToken<RefreshTokenPayload>(refreshToken);
  if (payload.type !== "refresh") throw new Error("Invalid token type");

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new Error("Token revoked or user not found");
  }

  // Get user's organizations to include in new token
  const userOrgs = await db
    .select({
      orgId: userOrganizations.orgId,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, user.id),
        eq(userOrganizations.isActive, true)
      )
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

/**
 * Logout
 */
export const logoutUser = async (userId: string) => {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
};

/**
 * Update User Profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    name?: string | null;
    email?: string;
    phoneNumber?: string;
    locationLabel?: string | null;
    preciseLocation?: string | null;
  }
) => {
  const updateData: any = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.phoneNumber !== undefined) {
    // Validate phone number format (optional)
    if (updates.phoneNumber && updates.phoneNumber.trim() !== "") {
      const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(updates.phoneNumber)) {
        throw new Error("Invalid phone number format");
      }
    }
    updateData.phoneNumber = updates.phoneNumber || null;
  }

  // Handle locationLabel
  if (updates.locationLabel !== undefined) {
    updateData.locationLabel = updates.locationLabel || null;
  }

  // Handle preciseLocation
  if (updates.preciseLocation !== undefined) {
    updateData.preciseLocation = updates.preciseLocation || null;
  }

  if (updates.email) {
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.email, updates.email), sql`${users.id} != ${userId}`),
    });

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
      updatedUser.name || ""
    );
  }

  return updatedUser;
};

/**
 * Update Password
 */
export const updateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

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

/**
 * Reset Password with OTP
 */
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

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

/**
 * Initiate Password Reset - Sends OTP
 */
export const initiatePasswordReset = async (email: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

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

/**
 * Resend Verification OTP
 */
export const resendVerificationOTP = async (email: string) => {
  // FIXED: Normalize email for consistency
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.query.users.findFirst({
    where: sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`,
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.emailVerified) {
    throw new Error("Email already verified");
  }

  const otp = generateOTP();
  await storeOTP(user.id, otp, "verify");
  await sendVerificationOTPEmail(email, otp, user.name || "");

  console.log("New OTP sent for user:", user.id);
  return true;
};
