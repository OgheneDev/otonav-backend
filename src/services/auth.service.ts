import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { db } from "../config/database.js";
import { users, organizations, auditLogs } from "../models/schema.js";
import { eq, gt, sql, and } from "drizzle-orm";
import { sendEmail } from "./email.service.js";
import { generateOTP, getOTPExpiration, verifyOTP } from "./otp.service.js";

const JWT_SECRET: string = process.env.JWT_SECRET!;
const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";
const APP_DOWNLOAD_URL =
  process.env.APP_DOWNLOAD_URL || "https://your-app-download-link.com";

// --- Types ---
export interface TokenPayload {
  userId: string;
  email: string;
  orgId?: string | null;
  role?: string;
  type?: "access" | "refresh";
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

// --- OTP Management ---
const storeOTP = async (
  userId: string,
  otp: string,
  otpType: string,
  dbClient?: any // Add optional database client parameter
) => {
  const otpExpires = getOTPExpiration();

  // Use provided dbClient or default to global db
  const client = dbClient || db;

  console.log("=== STORE OTP DEBUG ===");
  console.log("User ID:", userId);
  console.log("Using client:", dbClient ? "Transaction" : "Global DB");

  const result = await client
    .update(users)
    .set({
      otpCode: otp,
      otpExpires: otpExpires,
      otpType: otpType,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email });

  console.log("Update result:", result);

  if (!result || result.length === 0) {
    throw new Error(`No user found with ID: ${userId}`);
  }

  console.log("SUCCESS: OTP stored for user:", result[0].email);
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

const sendRiderAccountCreatedEmail = async (
  email: string,
  tempPassword: string,
  businessName: string
) => {
  await sendEmail({
    to: email,
    subject: `You've been added as a Rider - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 5px;">OtoNav</h1>
          <p style="color: #666; font-size: 14px;">Delivery Management Platform</p>
          <div style="height: 3px; width: 100px; background: #28a745; margin: 10px auto;"></div>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="color: #2e7d32; margin: 0; font-weight: bold; text-align: center;">
            🚀 Welcome to the Team!
          </p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
          ${businessName} has added you as a Rider
        </h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Your rider account has been created by <strong>${businessName}</strong>. 
          You can now access the OtoNav platform.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
          <p style="color: #333; font-weight: bold; margin-bottom: 15px;">📋 Your Login Details:</p>
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #dc3545; font-size: 14px; margin-top: 10px;">
            ⚠️ Please change your password after first login
          </p>
        </div>
        
        <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #007bff; margin-bottom: 15px;">📱 Get Started</h3>
          
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;">
            <div style="font-size: 24px; margin-right: 15px;">1️⃣</div>
            <div>
              <p style="font-weight: bold; margin: 0; color: #333;">Download the App</p>
              <a href="${APP_DOWNLOAD_URL}" style="color: #007bff; text-decoration: none; font-weight: 500;">
                Click here to download OtoNav Rider App
              </a>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;">
            <div style="font-size: 24px; margin-right: 15px;">2️⃣</div>
            <div>
              <p style="font-weight: bold; margin: 0; color: #333;">Login with Temporary Credentials</p>
              <p style="margin: 5px 0; color: #666;">Use the email and temporary password above</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 6px;">
            <div style="font-size: 24px; margin-right: 15px;">3️⃣</div>
            <div>
              <p style="font-weight: bold; margin: 0; color: #333;">Complete Your Registration</p>
              <p style="margin: 5px 0; color: #666;">Set your name, email, and new password. Verify your email with OTP.</p>
            </div>
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #856404; margin: 0; font-weight: bold; margin-bottom: 10px;">🔒 Security Notes:</p>
          <ul style="color: #856404; margin: 0; padding-left: 20px;">
            <li>Never share your login credentials</li>
            <li>Change your password immediately after first login</li>
            <li>Contact ${businessName} if you didn't expect this invitation</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This account was created by ${businessName} via OtoNav platform.
            <br>Need help? Contact ${businessName} or support@otonav.com
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
  businessName: string
) => {
  // Check if email already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);

  return await db
    .transaction(async (tx) => {
      // 1. Create Organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: businessName,
        })
        .returning();

      // 2. Create Owner User
      const [user] = await tx
        .insert(users)
        .values({
          email,
          password: passwordHash,
          name,
          role: "owner",
          orgId: org.id,
          emailVerified: false,
          tokenVersion: 1,
        })
        .returning();

      // 3. Update organization with owner reference
      await tx
        .update(organizations)
        .set({ ownerUserId: user.id })
        .where(eq(organizations.id, org.id));

      // 4. Generate and store OTP - PASS THE TRANSACTION
      const otp = generateOTP();
      await storeOTP(user.id, otp, "verify", tx); // Pass tx as 4th parameter

      // 5. Audit Log
      await tx.insert(auditLogs).values({
        orgId: org.id,
        userId: user.id,
        action: "business.registered",
        severity: "info",
        timestamp: new Date(),
      });

      // Send email (this can be outside transaction)
      // We'll send it after transaction commits

      return {
        user,
        org,
        otp, // Return OTP to send email after transaction
      };
    })
    .then(async (result) => {
      // After transaction commits successfully, send the email
      await sendVerificationOTPEmail(email, result.otp, name || "");

      // Return only user and org (not otp)
      return { user: result.user, org: result.org };
    });
};

/**
 * Register a Customer
 */
export const registerCustomer = async (
  email: string,
  password: string,
  name: string
) => {
  // Check if email already exists
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
      role: "customer",
      orgId: null,
      emailVerified: false,
      tokenVersion: 1,
    })
    .returning();

  // Generate and send OTP
  const otp = generateOTP();
  await storeOTP(customer.id, otp, "verify");
  await sendVerificationOTPEmail(email, otp, name || "");

  return customer;
};

/**
 * Verify Email with OTP
 */
export const verifyEmailWithOTP = async (
  email: string,
  otp: string
): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.emailVerified) {
    return true;
  }

  // ADD DEBUGGING LOGS
  console.log("=== DEBUG OTP VERIFICATION ===");
  console.log("User OTP from DB:", user.otpCode);
  console.log("Input OTP:", otp);
  console.log("OTP Type from DB:", user.otpType);
  console.log("OTP Expires from DB:", user.otpExpires);
  console.log("Current time:", new Date());

  // Debug the verifyOTP function
  const otpMatches = user.otpCode === otp;
  const isExpired = user.otpExpires ? user.otpExpires < new Date() : true;

  console.log("OTP matches:", otpMatches);
  console.log("OTP expired:", isExpired);
  console.log("OTP Type correct:", user.otpType === "verify");
  console.log("=== END DEBUG ===");

  if (
    !verifyOTP(otp, user.otpCode || "", user.otpExpires || new Date()) ||
    user.otpType !== "verify"
  ) {
    throw new Error("Invalid or expired OTP");
  }

  await db
    .update(users)
    .set({
      emailVerified: true,
      otpCode: null,
      otpExpires: null,
      otpType: null,
    })
    .where(eq(users.id, user.id));

  return true;
};

/**
 * Authenticate User (Login)
 */
/**
 * Authenticate User (Login) - Updated with registrationCompleted check
 */
export const authenticateUser = async (email: string, password: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  // Check if rider needs to complete registration
  const needsRegistrationCompletion =
    user.role === "rider" && !user.registrationCompleted; // ← Make sure this field exists in your users table

  // For riders who haven't completed registration, allow login without email verification
  if (needsRegistrationCompletion) {
    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion || 1,
    });

    return {
      user,
      accessToken,
      refreshToken,
      requiresRegistrationCompletion: true,
    };
  }

  // For all other users (including riders who have completed registration), require email verification
  if (!user.emailVerified) {
    // Resend verification OTP if not verified
    const otp = generateOTP();
    await storeOTP(user.id, otp, "verify");
    await sendVerificationOTPEmail(email, otp, user.name || "");
    throw new Error("Please verify your email. A new OTP has been sent.");
  }

  // Update last login for verified users
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenVersion: user.tokenVersion || 1,
  });

  return {
    user,
    accessToken,
    refreshToken,
    requiresRegistrationCompletion: false,
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
      orgId: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Generate a random temporary password
 */
const generateTemporaryPassword = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Create Rider Account (Owner Action) - Creates account and sends login details
 */
export const createRiderAccount = async (
  ownerId: string,
  orgId: string,
  riderEmail: string,
  riderName: string
) => {
  // Check if owner belongs to the organization
  const owner = await db.query.users.findFirst({
    where: and(eq(users.id, ownerId), eq(users.orgId, orgId)),
  });

  if (!owner || owner.role !== "owner") {
    throw new Error("Unauthorized: Only owners can create rider accounts");
  }

  // Check if email is already a verified user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, riderEmail),
  });

  if (existingUser) {
    if (existingUser.emailVerified) {
      throw new Error("Email already registered and verified");
    }
    // If user exists but not verified, we can update it
  }

  // Get organization name
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  return await db.transaction(async (tx) => {
    let rider;

    if (existingUser && !existingUser.emailVerified) {
      // Update existing unverified user
      [rider] = await tx
        .update(users)
        .set({
          name: riderName,
          password: passwordHash,
          role: "rider",
          orgId: orgId,
          emailVerified: false,
          registrationCompleted: false, // Rider hasn't completed registration yet
          otpCode: null,
          otpExpires: null,
          otpType: null,
          tokenVersion: 1,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
    } else {
      // Create new rider account
      [rider] = await tx
        .insert(users)
        .values({
          email: riderEmail,
          password: passwordHash,
          name: riderName,
          role: "rider",
          orgId: orgId,
          emailVerified: false,
          registrationCompleted: false, // Rider hasn't completed registration yet
          tokenVersion: 1,
        })
        .returning();
    }

    // Send email with login details
    await sendRiderAccountCreatedEmail(riderEmail, temporaryPassword, org.name);

    // Audit Log
    await tx.insert(auditLogs).values({
      orgId: orgId,
      userId: ownerId,
      action: "rider.account_created",
      severity: "info",
      details: {
        riderEmail,
        riderName,
        createdBy: owner.email,
      },
      timestamp: new Date(),
    });

    return {
      id: rider.id,
      email: rider.email,
      name: rider.name,
      role: rider.role,
      orgId: rider.orgId,
      emailVerified: rider.emailVerified,
      registrationCompleted: rider.registrationCompleted,
    };
  });
};

/**
 * Complete Rider Registration - Fixed version (no transaction issues)
 */
/**
 * Complete Rider Registration - Fixed OTP issue
 */
export const completeRiderRegistration = async (
  riderId: string,
  email: string,
  name: string,
  password: string
) => {
  // 1. Check if rider exists
  const rider = await db.query.users.findFirst({
    where: and(eq(users.id, riderId), eq(users.role, "rider")),
  });

  if (!rider) {
    throw new Error("Rider not found");
  }

  // 2. Check if registration already completed
  if (rider.registrationCompleted) {
    throw new Error("Registration already completed");
  }

  // 3. Check if email is available (if changing email)
  if (email !== rider.email) {
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.email, email), sql`${users.id} != ${riderId}`),
    });

    if (existingUser) {
      throw new Error("Email already in use by another account");
    }
  }

  // 4. Hash the new password
  const passwordHash = await hashPassword(password);

  // 5. Generate NEW OTP for verification
  const otp = generateOTP();
  const otpExpires = getOTPExpiration();

  // 6. SINGLE database update - Update all fields including clearing old OTP
  const [updatedRider] = await db
    .update(users)
    .set({
      email: email,
      name: name,
      password: passwordHash,
      registrationCompleted: true,
      emailVerified: false,
      // Clear any existing OTPs and set new one
      otpCode: otp,
      otpExpires: otpExpires,
      otpType: "verify",
      // Also clear any other auth tokens
      verificationToken: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    })
    .where(eq(users.id, riderId))
    .returning();

  if (!updatedRider) {
    throw new Error("Failed to update rider");
  }

  // 7. Send verification email ASYNC
  sendVerificationOTPEmail(email, otp, name || "").catch((error) =>
    console.error("Failed to send verification email:", error)
  );

  // 8. Create audit log (async)
  db.insert(auditLogs)
    .values({
      orgId: rider.orgId,
      userId: riderId,
      action: "rider.registration_completed",
      severity: "info",
      details: {
        oldEmail: rider.email,
        newEmail: email,
      },
      timestamp: new Date(),
    })
    .catch((error) => console.error("Failed to create audit log:", error));

  return {
    id: updatedRider.id,
    email: updatedRider.email,
    name: updatedRider.name,
    role: updatedRider.role,
    orgId: updatedRider.orgId,
    emailVerified: updatedRider.emailVerified,
    registrationCompleted: updatedRider.registrationCompleted,
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

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
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
  updates: { name?: string | null; email?: string }
) => {
  const updateData: any = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.email) {
    // Check if email is already in use by another user
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.email, updates.email), sql`${users.id} != ${userId}`),
    });

    if (existingUser) {
      throw new Error("Email already in use");
    }

    updateData.email = updates.email;
    updateData.emailVerified = false;

    // Generate and send verification OTP for new email
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

  // Send verification OTP if email was changed
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
  // Get the user with password
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and timestamp
  const [updatedUser] = await db
    .update(users)
    .set({
      password: passwordHash,
      lastPasswordChange: new Date(),
      tokenVersion: sql`${users.tokenVersion} + 1`, // Invalidate all sessions
    })
    .where(eq(users.id, userId))
    .returning();

  // Create audit log
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

  // Verify OTP
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
      tokenVersion: sql`${users.tokenVersion} + 1`, // Invalidate all sessions
    })
    .where(eq(users.id, user.id))
    .returning();

  // Create audit log
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
    // Don't reveal if user exists for security
    return;
  }

  const otp = generateOTP();
  await storeOTP(user.id, otp, "reset");
  await sendPasswordResetOTPEmail(email, otp, user.name || "");

  // Create audit log
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
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
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

  return true;
};
