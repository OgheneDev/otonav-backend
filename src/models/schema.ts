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

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "rider_accepted",
  "customer_location_set",
  "confirmed",
  "package_picked_up",
  "in_transit",
  "arrived_at_location",
  "delivered",
  "cancelled",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  ownerUserId: uuid("owner_user_id"),
  address: text("address").notNull(),
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
  role: userRoleEnum("role").notNull(),
  registrationStatus: registrationStatusEnum("registration_status").default(
    "completed",
  ),
  invitedAt: timestamp("invited_at").defaultNow(),
  invitationSentAt: timestamp("invitation_sent_at"),
  isActive: boolean("is_active").default(true).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  suspensionReason: text("suspension_reason"),
  suspensionExpires: timestamp("suspension_expires"),
  joinedAt: timestamp("joined_at"),
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
  profileImage: text("profile_image"),
  profileImagePublicId: text("profile_image_public_id"),
  locations: jsonb("locations")
    .$type<
      Array<{
        label: string;
        preciseLocation: string;
      }>
    >()
    .default([]),
  isProfileComplete: boolean("is_profile_complete").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  currentLocation: text("current_location"),
  role: userRoleEnum("role").default("customer").notNull(),
  registrationStatus: registrationStatusEnum("registration_status")
    .default("pending")
    .notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  tokenVersion: integer("token_version").default(1).notNull(),
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
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").unique().notNull(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  packageDescription: text("package_description").notNull(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "set null" })
    .notNull(),
  riderId: uuid("rider_id").references(() => users.id, {
    onDelete: "set null",
  }),
  riderCurrentLocation: text("rider_current_location"),
  customerLocationLabel: text("customer_location_label"),
  customerLocationPrecise: text("customer_location_precise"),
  status: orderStatusEnum("status").default("pending").notNull(),
  assignedAt: timestamp("assigned_at"),
  riderAcceptedAt: timestamp("rider_accepted_at"),
  customerLocationSetAt: timestamp("customer_location_set_at"),
  packagePickedUpAt: timestamp("package_picked_up_at"),
  deliveryStartedAt: timestamp("delivery_started_at"),
  arrivedAtLocationAt: timestamp("arrived_at_location_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});
