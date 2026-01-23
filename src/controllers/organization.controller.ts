import { Request, Response } from "express";
import { db } from "../config/database.js";
import { organizations } from "../models/schema.js";
import { eq } from "drizzle-orm";

export class OrganizationController {
  /**
   * Get organization by ID
   */
  async getOrganizationById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id as string)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID format",
        });
      }

      // Get organization
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id as string))
        .limit(1);

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
