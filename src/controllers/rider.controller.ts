// controllers/rider.controller.ts
import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  riderService,
  UpdateRiderStatusInput,
} from "../services/rider.service.js";

export class RiderController {
  /**
   * Get all riders in the organization
   */
  async getRiders(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Organization context required",
        });
      }

      const { includeSuspended, includeInactive, includePending } = req.query;
      const riders = await riderService.getRidersByOrganization(
        user.orgId,
        includeSuspended === "true",
        includePending !== "false" // Default to true if not specified
      );

      // Filter out inactive riders if not specifically requested
      const filteredRiders =
        includeInactive === "true"
          ? riders
          : riders.filter((rider) => rider.orgMembership.isActive);

      return res.status(200).json({
        success: true,
        data: filteredRiders,
        count: filteredRiders.length,
        total: riders.length,
      });
    } catch (error: any) {
      console.error("Error in getRiders:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch riders",
      });
    }
  }

  /**
   * Get a single rider by ID
   */
  async getRiderById(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Organization context required",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const rider = await riderService.getRiderById(riderIdString, user.orgId);
      if (!rider) {
        return res.status(404).json({
          success: false,
          message: "Rider not found in this organization",
        });
      }

      return res.status(200).json({
        success: true,
        data: rider,
      });
    } catch (error: any) {
      console.error("Error in getRiderById:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch rider",
      });
    }
  }

  /**
   * Suspend a rider
   */
  async suspendRider(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId || !user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const { reason, notes, suspensionDurationDays } =
        req.body as UpdateRiderStatusInput;

      const suspendedRider = await riderService.suspendRider(
        riderIdString,
        user.orgId,
        user.userId,
        { reason, notes, suspensionDurationDays }
      );

      return res.status(200).json({
        success: true,
        message: "Rider suspended successfully",
        data: suspendedRider,
      });
    } catch (error: any) {
      console.error("Error in suspendRider:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("already suspended")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to suspend rider",
      });
    }
  }

  /**
   * Unsuspend a rider
   */
  async unsuspendRider(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId || !user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const unsuspendedRider = await riderService.unsuspendRider(
        riderIdString,
        user.orgId,
        user.userId
      );

      return res.status(200).json({
        success: true,
        message: "Rider unsuspended successfully",
        data: unsuspendedRider,
      });
    } catch (error: any) {
      console.error("Error in unsuspendRider:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not suspended")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to unsuspend rider",
      });
    }
  }

  /**
   * Remove a rider from organization (hard deletion from user_organizations)
   */
  async removeRider(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId || !user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const { reason, notes } = req.body as UpdateRiderStatusInput;

      const result = await riderService.removeRiderFromOrganization(
        riderIdString,
        user.orgId,
        user.userId,
        { reason, notes }
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        removedFromOrg: result.removedFromOrg,
      });
    } catch (error: any) {
      console.error("Error in removeRider:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove rider",
      });
    }
  }

  /**
   * Deactivate a rider (soft removal)
   */
  async deactivateRider(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId || !user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const { reason } = req.body;

      const deactivatedRider = await riderService.deactivateRider(
        riderIdString,
        user.orgId,
        user.userId,
        reason
      );

      return res.status(200).json({
        success: true,
        message: "Rider deactivated successfully",
        data: deactivatedRider,
      });
    } catch (error: any) {
      console.error("Error in deactivateRider:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to deactivate rider",
      });
    }
  }

  /**
   * Reactivate a rider
   */
  async reactivateRider(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId || !user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const reactivatedRider = await riderService.reactivateRider(
        riderIdString,
        user.orgId,
        user.userId
      );

      return res.status(200).json({
        success: true,
        message: "Rider reactivated successfully",
        data: reactivatedRider,
      });
    } catch (error: any) {
      console.error("Error in reactivateRider:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to reactivate rider",
      });
    }
  }

  /**
   * Check if rider is suspended
   */
  async checkSuspensionStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.orgId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Organization context required",
        });
      }

      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const isSuspended = await riderService.isRiderSuspended(
        riderIdString,
        user.orgId
      );

      return res.status(200).json({
        success: true,
        data: {
          riderId: riderIdString,
          orgId: user.orgId,
          isSuspended,
        },
      });
    } catch (error: any) {
      console.error("Error in checkSuspensionStatus:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to check suspension status",
      });
    }
  }

  /**
   * Get all organizations for a rider
   */
  async getRiderOrganizations(req: AuthRequest, res: Response) {
    try {
      const { riderId } = req.params;
      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: "Rider ID is required",
        });
      }

      // FIX: Ensure riderId is a string
      const riderIdString = Array.isArray(riderId) ? riderId[0] : riderId;

      const organizations = await riderService.getRiderOrganizations(
        riderIdString
      );

      return res.status(200).json({
        success: true,
        data: organizations,
        count: organizations.length,
      });
    } catch (error: any) {
      console.error("Error in getRiderOrganizations:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch rider organizations",
      });
    }
  }
}

export const riderController = new RiderController();
