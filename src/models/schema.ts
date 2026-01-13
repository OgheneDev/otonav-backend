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

  // Status within this organization
  isActive: boolean("is_active").default(true).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  suspensionReason: text("suspension_reason"),
  suspensionExpires: timestamp("suspension_expires"),

  // Timestamps
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),

  // Global user type (default role)
  role: userRoleEnum("role").default("customer").notNull(),

  // Security & Auth State (unchanged)
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  tokenVersion: integer("token_version").default(1).notNull(),

  // Password Reset (unchanged)
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  lastPasswordChange: timestamp("last_password_change"),

  otpCode: varchar("otp_code", { length: 6 }),
  otpExpires: timestamp("otp_expires"),
  otpType: varchar("otp_type", { length: 20 }),

  registrationToken: text("registration_token"),
  registrationTokenExpires: timestamp("registration_token_expires"),
  invitationToken: text("invitation_token"),
  invitationTokenExpires: timestamp("invitation_token_expires"),
  phoneNumber: text("phone_number"),
  registrationCompleted: boolean("registration_completed").default(false),

  // Metadata (unchanged)
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
