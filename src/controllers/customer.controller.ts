import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { customerService } from "../services/customer.service.js";

export class CustomerController {
  /**
   * Get all customers within the current organization (owners only)
   */
  async getAllCustomers(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Only owners can view customers
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can view customers",
        });
      }

      // Organization context required
      const orgId = user.orgId;
      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization context required",
        });
      }

      const customers = await customerService.getAllCustomers(String(orgId));

      return res.status(200).json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error: any) {
      console.error("Error in getAllCustomers:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch customers",
      });
    }
  }

  /**
   * Get customer by ID within the current organization (owners only)
   */
  async getCustomerById(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Only owners can view customer details
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can view customer details",
        });
      }

      const { customerId } = req.params;
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      // Organization context required
      const orgId = user.orgId;
      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization context required",
        });
      }

      // Cast to string to handle the TypeScript error
      const customer = await customerService.getCustomerById(
        String(customerId),
        String(orgId),
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found within your organization",
        });
      }

      return res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in getCustomerById:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch customer",
      });
    }
  }

  /**
   * Search customers within the current organization (owners only)
   */
  async searchCustomers(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Only owners can search customers
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can search customers",
        });
      }

      const orgId = user.orgId;
      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization context required",
        });
      }

      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const customers = await customerService.searchCustomers(
        String(orgId),
        query,
      );

      return res.status(200).json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error: any) {
      console.error("Error in searchCustomers:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to search customers",
      });
    }
  }
}

export const customerController = new CustomerController();
