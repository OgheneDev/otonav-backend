import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";

export class UserController {
  /**
   * Update user's FCM token for push notifications
   * POST /api/users/fcm-token
   */
  async updateFcmToken(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: "FCM token is required",
        });
      }

      await db
        .update(users)
        .set({
          fcmToken: fcmToken,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user!.userId));

      return res.status(200).json({
        success: true,
        message: "FCM token updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating FCM token:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update FCM token",
      });
    }
  }

  /**
   * Remove user's FCM token (on logout)
   * DELETE /api/users/fcm-token
   */
  async removeFcmToken(req: AuthRequest, res: Response) {
    try {
      const { user } = req;

      await db
        .update(users)
        .set({
          fcmToken: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user!.userId));

      return res.status(200).json({
        success: true,
        message: "FCM token removed successfully",
      });
    } catch (error: any) {
      console.error("Error removing FCM token:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove FCM token",
      });
    }
  }
}

export const userController = new UserController();
