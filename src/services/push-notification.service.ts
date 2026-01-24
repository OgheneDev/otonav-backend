import admin from "firebase-admin";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH not set in environment variables",
    );
  }

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: NotificationPayload,
  ): Promise<void> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          fcmToken: true,
          name: true,
        },
      });

      if (!user?.fcmToken) {
        console.log(`No FCM token found for user ${userId}`);
        return;
      }

      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        token: user.fcmToken,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "delivery_updates",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log("Successfully sent notification:", response);
    } catch (error: any) {
      console.error("Error sending push notification:", error);

      // Handle invalid or expired tokens
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        await this.removeInvalidToken(userId);
      }
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultipleUsers(
    userIds: string[],
    notification: NotificationPayload,
  ): Promise<void> {
    const promises = userIds.map((userId) =>
      this.sendToUser(userId, notification),
    );
    await Promise.allSettled(promises);
  }

  /**
   * Remove invalid FCM token from user
   */
  private async removeInvalidToken(userId: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({ fcmToken: null })
        .where(eq(users.id, userId));
      console.log(`Removed invalid FCM token for user ${userId}`);
    } catch (error) {
      console.error("Error removing invalid token:", error);
    }
  }

  /**
   * Order-specific notification methods
   */

  async notifyOrderCreated(
    customerId: string,
    riderId: string,
    orderNumber: string,
    packageDescription: string,
  ): Promise<void> {
    await Promise.allSettled([
      this.sendToUser(customerId, {
        title: "📦 New Package Assigned",
        body: `Order ${orderNumber}: ${packageDescription}`,
        data: {
          type: "order_created",
          orderNumber,
        },
      }),
      this.sendToUser(riderId, {
        title: "🚴 New Delivery Assignment",
        body: `Order ${orderNumber}: ${packageDescription}`,
        data: {
          type: "order_assigned",
          orderNumber,
        },
      }),
    ]);
  }

  async notifyRiderAccepted(
    customerId: string,
    orderNumber: string,
    riderName: string,
  ): Promise<void> {
    await this.sendToUser(customerId, {
      title: "✅ Rider Accepted Order",
      body: `${riderName} has accepted your delivery (${orderNumber})`,
      data: {
        type: "rider_accepted",
        orderNumber,
      },
    });
  }

  async notifyLocationSet(
    riderId: string,
    orderNumber: string,
    locationLabel: string,
  ): Promise<void> {
    await this.sendToUser(riderId, {
      title: "📍 Delivery Location Set",
      body: `Customer set location to: ${locationLabel} (${orderNumber})`,
      data: {
        type: "location_set",
        orderNumber,
      },
    });
  }

  async notifyPackagePickedUp(
    customerId: string,
    orderNumber: string,
    riderName: string,
  ): Promise<void> {
    await this.sendToUser(customerId, {
      title: "📦 Package Picked Up",
      body: `${riderName} has picked up your package (${orderNumber})`,
      data: {
        type: "package_picked_up",
        orderNumber,
      },
    });
  }

  async notifyDeliveryStarted(
    customerId: string,
    orderNumber: string,
    riderName: string,
  ): Promise<void> {
    await this.sendToUser(customerId, {
      title: "🚴 Delivery Started",
      body: `${riderName} is on the way with your package (${orderNumber})`,
      data: {
        type: "delivery_started",
        orderNumber,
      },
    });
  }

  async notifyRiderArrived(
    customerId: string,
    orderNumber: string,
    riderName: string,
  ): Promise<void> {
    await this.sendToUser(customerId, {
      title: "🎯 Rider Arrived",
      body: `${riderName} has arrived at your location (${orderNumber})`,
      data: {
        type: "rider_arrived",
        orderNumber,
      },
    });
  }

  async notifyDeliveryCompleted(
    customerId: string,
    orderNumber: string,
  ): Promise<void> {
    await this.sendToUser(customerId, {
      title: "✅ Delivery Completed",
      body: `Your package has been delivered (${orderNumber})`,
      data: {
        type: "delivery_completed",
        orderNumber,
      },
    });
  }

  async notifyOrderCancelled(
    userIds: string[],
    orderNumber: string,
    cancelledBy: string,
  ): Promise<void> {
    await this.sendToMultipleUsers(userIds, {
      title: "❌ Order Cancelled",
      body: `Order ${orderNumber} has been cancelled by ${cancelledBy}`,
      data: {
        type: "order_cancelled",
        orderNumber,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
