import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { customerService } from "../services/customer.service.js";

export class CustomerController {
  /**
   * Get all customers on the platform
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

      // Only owners/admins should be able to see all customers
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can view all customers",
        });
      }

      const customers = await customerService.getAllCustomers();

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
   * Get customer by ID
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

      const { customerId } = req.params;
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      // Cast to string to handle the TypeScript error
      const customer = await customerService.getCustomerById(
        String(customerId)
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
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
   * Search customers
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

      // Only owners/admins should be able to search all customers
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can search customers",
        });
      }

      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const customers = await customerService.searchCustomers(query);

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

  /**
   * Get customer statistics
   */
  async getCustomerStats(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Only owners/admins should be able to see customer stats
      if (user.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only owners can view customer stats",
        });
      }

      const stats = await customerService.getCustomerStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("Error in getCustomerStats:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get customer statistics",
      });
    }
  }
}

export const customerController = new CustomerController();
