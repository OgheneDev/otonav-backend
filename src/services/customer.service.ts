import { eq, desc } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";

export interface Customer {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  registrationCompleted: boolean | null;
  registrationStatus: "pending" | "completed" | "cancelled" | "expired" | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export class CustomerService {
  /**
   * Get all customers on the platform
   */
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const customers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationCompleted: users.registrationCompleted,
          registrationStatus: users.registrationStatus,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.role, "customer"))
        .orderBy(desc(users.createdAt));

      return customers;
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error("Failed to fetch customers");
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const [customer] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationCompleted: users.registrationCompleted,
          registrationStatus: users.registrationStatus,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.id, customerId))
        .limit(1);

      return customer || null;
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw new Error("Failed to fetch customer");
    }
  }

  /**
   * Search customers by email or name
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const customers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          registrationCompleted: users.registrationCompleted,
          registrationStatus: users.registrationStatus,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.role, "customer"))
        .orderBy(desc(users.createdAt));

      // Filter by query (email or name contains query)
      return customers.filter(
        (customer) =>
          customer.email.toLowerCase().includes(query.toLowerCase()) ||
          (customer.name &&
            customer.name.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error("Error searching customers:", error);
      throw new Error("Failed to search customers");
    }
  }

  /**
   * Get customer stats
   */
  async getCustomerStats(): Promise<{
    total: number;
    verified: number;
    pending: number;
    active: number;
  }> {
    try {
      const customers = await this.getAllCustomers();

      const total = customers.length;
      const verified = customers.filter((c) => c.emailVerified).length;
      const pending = customers.filter(
        (c) => c.registrationStatus === "pending"
      ).length;
      const active = customers.filter(
        (c) =>
          c.registrationStatus === "completed" &&
          c.emailVerified &&
          c.registrationCompleted
      ).length;

      return {
        total,
        verified,
        pending,
        active,
      };
    } catch (error) {
      console.error("Error getting customer stats:", error);
      throw new Error("Failed to get customer stats");
    }
  }
}

export const customerService = new CustomerService();
