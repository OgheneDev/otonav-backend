import { eq, desc, and } from "drizzle-orm";
import { db } from "../config/database.js";
import { users, userOrganizations } from "../models/schema.js";

export interface Customer {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  registrationStatus: "pending" | "completed" | "cancelled" | "expired" | null;
  isProfileComplete: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export class CustomerService {
  /**
   * Get all customers within a specific organization
   */
  async getAllCustomers(orgId: string): Promise<Customer[]> {
    try {
      const customers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationStatus: users.registrationStatus,
          isProfileComplete: users.isProfileComplete,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          isActive: userOrganizations.isActive,
          joinedAt: userOrganizations.joinedAt,
        })
        .from(userOrganizations)
        .innerJoin(users, eq(users.id, userOrganizations.userId))
        .where(
          and(
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.role, "customer"),
          ),
        )
        .orderBy(desc(users.createdAt));

      return customers;
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error("Failed to fetch customers");
    }
  }

  /**
   * Get customer by ID within an organization
   */
  async getCustomerById(
    customerId: string,
    orgId: string,
  ): Promise<Customer | null> {
    try {
      const [customer] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationStatus: users.registrationStatus,
          isProfileComplete: users.isProfileComplete,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(userOrganizations)
        .innerJoin(users, eq(users.id, userOrganizations.userId))
        .where(
          and(
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.userId, customerId),
            eq(userOrganizations.role, "customer"),
          ),
        )
        .limit(1);

      return customer || null;
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw new Error("Failed to fetch customer");
    }
  }

  /**
   * Search customers by email or name within an organization
   */
  async searchCustomers(orgId: string, query: string): Promise<Customer[]> {
    try {
      const customers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationStatus: users.registrationStatus,
          isProfileComplete: users.isProfileComplete,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(userOrganizations)
        .innerJoin(users, eq(users.id, userOrganizations.userId))
        .where(
          and(
            eq(userOrganizations.orgId, orgId),
            eq(userOrganizations.role, "customer"),
          ),
        )
        .orderBy(desc(users.createdAt));

      // Filter by query (email or name contains query)
      return customers.filter(
        (customer) =>
          customer.email.toLowerCase().includes(query.toLowerCase()) ||
          (customer.name &&
            customer.name.toLowerCase().includes(query.toLowerCase())),
      );
    } catch (error) {
      console.error("Error searching customers:", error);
      throw new Error("Failed to search customers");
    }
  }
}

export const customerService = new CustomerService();
