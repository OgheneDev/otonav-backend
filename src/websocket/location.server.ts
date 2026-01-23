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

    console.log("🔌 LocationWebSocketServer initialized");

    this.wss.on("connection", (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  private async handleConnection(ws: WebSocket, req: any) {
    const connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = req.url || "";
    const params = new URLSearchParams(url.split("?")[1]);
    const orderId = params.get("orderId");
    const userId = params.get("userId");
    const role = params.get("role");

    console.log(`\n[WS-${connectionId}] 🔵 NEW CONNECTION ATTEMPT`);
    console.log(`[WS-${connectionId}]    URL: ${url}`);
    console.log(`[WS-${connectionId}]    Order ID: ${orderId}`);
    console.log(`[WS-${connectionId}]    User ID: ${userId}`);
    console.log(`[WS-${connectionId}]    Role: ${role}`);
    console.log(`[WS-${connectionId}]    IP: ${req.socket.remoteAddress}`);

    if (!orderId || !userId || !role) {
      console.log(`[WS-${connectionId}] ❌ REJECTED: Missing parameters`);
      ws.close(1008, "Missing parameters");
      return;
    }

    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        console.log(`[WS-${connectionId}] ❌ REJECTED: Order not found`);
        ws.close(1008, "Order not found");
        return;
      }

      if (role === "rider" && order.riderId !== userId) {
        console.log(`[WS-${connectionId}] ❌ REJECTED: Unauthorized rider`);
        ws.close(1008, "Unauthorized");
        return;
      }

      if (role === "customer" && order.customerId !== userId) {
        console.log(`[WS-${connectionId}] ❌ REJECTED: Unauthorized customer`);
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
          console.log(`[WS-${connectionId}] ❌ REJECTED: Unauthorized owner`);
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
        console.log(
          `[WS-${connectionId}] 🆕 Created new connection group for order: ${orderId}`,
        );
      }

      const orderConnections = this.connections.get(orderId)!;

      if (role === "rider") {
        orderConnections.riderWs = ws;
        console.log(
          `[WS-${connectionId}] ✅ CONNECTED: Rider for order ${orderId}`,
        );
      } else if (role === "customer") {
        orderConnections.customerWs = ws;
        console.log(
          `[WS-${connectionId}] ✅ CONNECTED: Customer for order ${orderId}`,
        );
      } else if (role === "owner") {
        orderConnections.ownerWs = ws;
        console.log(
          `[WS-${connectionId}] ✅ CONNECTED: Owner for order ${orderId}`,
        );
      }

      // Log current connection status
      this.logConnectionStatus(orderId, connectionId);

      ws.on("message", async (data) => {
        console.log(`[WS-${connectionId}] 📨 MESSAGE RECEIVED from ${role}`);
        console.log(
          `[WS-${connectionId}]    Data: ${data.toString().substring(0, 200)}${data.toString().length > 200 ? "..." : ""}`,
        );

        if (role === "rider") {
          await this.handleRiderLocationUpdate(
            orderId,
            userId,
            data.toString(),
            connectionId,
          );
        } else {
          console.log(
            `[WS-${connectionId}] ℹ️  Message from ${role} - no handler configured`,
          );
        }
      });

      ws.on("close", () => {
        console.log(
          `[WS-${connectionId}] 🔴 DISCONNECTED: ${role} for order ${orderId}`,
        );

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
          console.log(
            `[WS-${connectionId}] 🗑️  All connections closed for order ${orderId} - removing connection group`,
          );
          this.connections.delete(orderId);
        } else {
          this.logConnectionStatus(orderId, connectionId);
        }
      });

      ws.on("error", (error) => {
        console.error(
          `[WS-${connectionId}] ❌ WebSocket error for ${role}:`,
          error.message,
        );
      });
    } catch (error) {
      console.error(`[WS-${connectionId}] ❌ Connection error:`, error);
      ws.close(1011, "Internal server error");
    }
  }

  private async handleRiderLocationUpdate(
    orderId: string,
    riderId: string,
    locationData: string,
    connectionId: string,
  ) {
    try {
      console.log(`[WS-${connectionId}] 📍 PROCESSING LOCATION UPDATE`);
      const location = JSON.parse(locationData);
      console.log(`[WS-${connectionId}]    Coordinates:`, location.coords);

      await db
        .update(orders)
        .set({
          riderCurrentLocation: location.coords,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      console.log(`[WS-${connectionId}] ✅ Database updated with new location`);

      const orderConnections = this.connections.get(orderId);

      const locationUpdate = JSON.stringify({
        type: "location_update",
        location: location.coords,
        timestamp: new Date().toISOString(),
      });

      let sentCount = 0;

      // Send to rider too
      if (orderConnections?.riderWs?.readyState === WebSocket.OPEN) {
        orderConnections.riderWs.send(locationUpdate);
        console.log(`[WS-${connectionId}] 📤 Sent location update to RIDER`);
        sentCount++;
      }

      if (orderConnections?.customerWs?.readyState === WebSocket.OPEN) {
        orderConnections.customerWs.send(locationUpdate);
        console.log(`[WS-${connectionId}] 📤 Sent location update to CUSTOMER`);
        sentCount++;
      }

      if (orderConnections?.ownerWs?.readyState === WebSocket.OPEN) {
        orderConnections.ownerWs.send(locationUpdate);
        console.log(`[WS-${connectionId}] 📤 Sent location update to OWNER`);
        sentCount++;
      }

      console.log(
        `[WS-${connectionId}] ✅ Location broadcast complete - sent to ${sentCount} client(s)`,
      );
    } catch (error) {
      console.error(
        `[WS-${connectionId}] ❌ Error handling location update:`,
        error,
      );
    }
  }

  public sendOrderStatusUpdate(orderId: string, status: string) {
    console.log(`\n📢 SENDING STATUS UPDATE for order ${orderId}`);
    console.log(`   Status: ${status}`);

    const orderConnections = this.connections.get(orderId);
    if (!orderConnections) {
      console.log(`   ⚠️  No active connections for order ${orderId}`);
      return;
    }

    const update = JSON.stringify({
      type: "status_update",
      status,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;

    if (orderConnections.customerWs?.readyState === WebSocket.OPEN) {
      orderConnections.customerWs.send(update);
      console.log(`   📤 Sent to CUSTOMER`);
      sentCount++;
    }
    if (orderConnections.riderWs?.readyState === WebSocket.OPEN) {
      orderConnections.riderWs.send(update);
      console.log(`   📤 Sent to RIDER`);
      sentCount++;
    }
    if (orderConnections.ownerWs?.readyState === WebSocket.OPEN) {
      orderConnections.ownerWs.send(update);
      console.log(`   📤 Sent to OWNER`);
      sentCount++;
    }

    console.log(`   ✅ Status update sent to ${sentCount} client(s)\n`);
  }

  private logConnectionStatus(orderId: string, connectionId: string) {
    const orderConnections = this.connections.get(orderId);
    if (!orderConnections) return;

    console.log(
      `[WS-${connectionId}] 📊 CONNECTION STATUS for order ${orderId}:`,
    );
    console.log(
      `[WS-${connectionId}]    Rider: ${orderConnections.riderWs ? "🟢 Connected" : "🔴 Disconnected"}`,
    );
    console.log(
      `[WS-${connectionId}]    Customer: ${orderConnections.customerWs ? "🟢 Connected" : "🔴 Disconnected"}`,
    );
    console.log(
      `[WS-${connectionId}]    Owner: ${orderConnections.ownerWs ? "🟢 Connected" : "🔴 Disconnected"}`,
    );
    console.log(
      `[WS-${connectionId}]    Total active connections: ${this.connections.size}\n`,
    );
  }

  public close() {
    console.log("🔴 Closing LocationWebSocketServer");
    console.log(`   Active connection groups: ${this.connections.size}`);
    this.wss.close();
    this.connections.clear();
    console.log("✅ LocationWebSocketServer closed");
  }
}
