import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

// Enums - UPDATED: Add registration_status enum
export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "completed",
  "cancelled",
  "expired",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "rider",
  "customer",
  "pending_rider",
]);

export const auditSeverityEnum = pgEnum("audit_severity", [
  "info",
  "warning",
  "error",
  "critical",
]);

// 1. Organizations (Tenants)
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  ownerUserId: uuid("owner_user_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// UPDATED: userOrganizations with registrationStatus
export const userOrganizations = pgTable("user_organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),

  // User's role within this specific organization
  role: userRoleEnum("role").notNull(),

  // Status within this organization - UPDATED
  registrationStatus: registrationStatusEnum("registration_status").default(
    "completed"
  ),
  invitedAt: timestamp("invited_at").defaultNow(),
  invitationSentAt: timestamp("invitation_sent_at"),
  isActive: boolean("is_active").default(true).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  suspensionReason: text("suspension_reason"),
  suspensionExpires: timestamp("suspension_expires"),

  // Timestamps
  joinedAt: timestamp("joined_at"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// FIXED: users table with consistent defaults
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),

  // Store locations as JSONB array for customers
  locations: jsonb("locations")
    .$type<
      Array<{
        label: string;
        preciseLocation: string;
      }>
    >()
    .default([]),

  // For riders, store their current real-time location
  currentLocation: text("current_location"),

  // Global user type (default role)
  role: userRoleEnum("role").default("customer").notNull(),

  // CRITICAL FIX: Registration status should default to "pending" not "completed"
  // This aligns with emailVerified defaulting to false
  registrationStatus: registrationStatusEnum("registration_status")
    .default("pending")
    .notNull(),

  // Security & Auth State
  // CRITICAL: emailVerified must NOT be null and defaults to false
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  tokenVersion: integer("token_version").default(1).notNull(),

  // Password Reset
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  lastPasswordChange: timestamp("last_password_change"),

  // OTP
  otpCode: varchar("otp_code", { length: 6 }),
  otpExpires: timestamp("otp_expires"),
  otpType: varchar("otp_type", { length: 20 }),

  // Registration tokens
  registrationToken: text("registration_token"),
  registrationTokenExpires: timestamp("registration_token_expires"),

  // Invitation tokens
  invitationToken: text("invitation_token"),
  invitationTokenExpires: timestamp("invitation_token_expires"),

  // Phone number
  phoneNumber: text("phone_number"),

  // CRITICAL FIX: Registration completion flag should default to false
  registrationCompleted: boolean("registration_completed")
    .default(false)
    .notNull(),

  // Metadata
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Invitations (Rider Onboarding)
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  role: userRoleEnum("role").default("rider").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: registrationStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Audit Logs (Compliance & Debugging)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: auditSeverityEnum("severity").default("info").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
