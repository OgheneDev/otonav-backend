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
import { sql } from "drizzle-orm";

// Enums
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
  slug: text("slug").unique(), // For clean URLs/Subdomains
  ownerUserId: uuid("owner_user_id"), // Reference to the creator
  stripeCustomerId: text("stripe_customer_id"), // For billing integration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// 2. Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull(),
  orgId: uuid("org_id").references(() => organizations.id), // Context for Owners/Riders

  // Security & Auth State
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  tokenVersion: integer("token_version").default(1).notNull(), // For global logout/revocation

  // Password Reset
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  lastPasswordChange: timestamp("last_password_change"),

  otpCode: varchar("otp_code", { length: 6 }),
  otpExpires: timestamp("otp_expires"),
  otpType: varchar("otp_type", { length: 20 }),

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Audit Logs (Compliance & Debugging)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g., "auth.login", "order.created"
  resourceType: text("resource_type"), // e.g., "user", "order"
  resourceId: text("resource_id"),
  details: jsonb("details"), // For flexible metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: auditSeverityEnum("severity").default("info").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
