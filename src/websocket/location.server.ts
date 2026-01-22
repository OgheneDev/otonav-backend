import WebSocket, { WebSocketServer } from "ws";
import { db } from "../config/database.js";
import { orders, userOrganizations } from "../models/schema.js";
import { eq, and } from "drizzle-orm";

interface OrderConnection {
  riderWs: WebSocket | null;
  customerWs: WebSocket | null;
  ownerWs: WebSocket | null;
}

export class LocationWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, OrderConnection>;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.connections = new Map();

    this.wss.on("connection", (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  private async handleConnection(ws: WebSocket, req: any) {
    const url = req.url || "";
    const params = new URLSearchParams(url.split("?")[1]);
    const orderId = params.get("orderId");
    const userId = params.get("userId");
    const role = params.get("role");

    if (!orderId || !userId || !role) {
      ws.close(1008, "Missing parameters");
      return;
    }

    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        ws.close(1008, "Order not found");
        return;
      }

      if (role === "rider" && order.riderId !== userId) {
        ws.close(1008, "Unauthorized");
        return;
      }

      if (role === "customer" && order.customerId !== userId) {
        ws.close(1008, "Unauthorized");
        return;
      }

      if (role === "owner") {
        const ownerMembership = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, userId),
            eq(userOrganizations.orgId, order.orgId),
            eq(userOrganizations.role, "owner"),
            eq(userOrganizations.isActive, true),
          ),
        });

        if (!ownerMembership) {
          ws.close(1008, "Unauthorized");
          return;
        }
      }

      if (!this.connections.has(orderId)) {
        this.connections.set(orderId, {
          riderWs: null,
          customerWs: null,
          ownerWs: null,
        });
      }

      const orderConnections = this.connections.get(orderId)!;

      if (role === "rider") {
        orderConnections.riderWs = ws;
      } else if (role === "customer") {
        orderConnections.customerWs = ws;
      } else if (role === "owner") {
        orderConnections.ownerWs = ws;
      }

      ws.on("message", async (data) => {
        if (role === "rider") {
          await this.handleRiderLocationUpdate(
            orderId,
            userId,
            data.toString(),
          );
        }
      });

      ws.on("close", () => {
        if (role === "rider") {
          orderConnections.riderWs = null;
        } else if (role === "customer") {
          orderConnections.customerWs = null;
        } else if (role === "owner") {
          orderConnections.ownerWs = null;
        }

        if (
          !orderConnections.riderWs &&
          !orderConnections.customerWs &&
          !orderConnections.ownerWs
        ) {
          this.connections.delete(orderId);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    } catch (error) {
      console.error("Connection error:", error);
      ws.close(1011, "Internal server error");
    }
  }

  private async handleRiderLocationUpdate(
    orderId: string,
    riderId: string,
    locationData: string,
  ) {
    try {
      const location = JSON.parse(locationData);

      await db
        .update(orders)
        .set({
          riderCurrentLocation: location.coords,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      const orderConnections = this.connections.get(orderId);

      const locationUpdate = JSON.stringify({
        type: "location_update",
        location: location.coords,
        timestamp: new Date().toISOString(),
      });

      // Send to rider too
      if (orderConnections?.riderWs?.readyState === WebSocket.OPEN) {
        orderConnections.riderWs.send(locationUpdate);
      }

      if (orderConnections?.customerWs?.readyState === WebSocket.OPEN) {
        orderConnections.customerWs.send(locationUpdate);
      }

      if (orderConnections?.ownerWs?.readyState === WebSocket.OPEN) {
        orderConnections.ownerWs.send(locationUpdate);
      }
    } catch (error) {
      console.error("Error handling location update:", error);
    }
  }

  public sendOrderStatusUpdate(orderId: string, status: string) {
    const orderConnections = this.connections.get(orderId);
    if (!orderConnections) return;

    const update = JSON.stringify({
      type: "status_update",
      status,
      timestamp: new Date().toISOString(),
    });

    if (orderConnections.customerWs?.readyState === WebSocket.OPEN) {
      orderConnections.customerWs.send(update);
    }
    if (orderConnections.riderWs?.readyState === WebSocket.OPEN) {
      orderConnections.riderWs.send(update);
    }
    if (orderConnections.ownerWs?.readyState === WebSocket.OPEN) {
      orderConnections.ownerWs.send(update);
    }
  }

  public close() {
    this.wss.close();
    this.connections.clear();
  }
}
