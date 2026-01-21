import { db } from "../config/database.js";
import {
  orders,
  users,
  userOrganizations,
  organizations,
} from "../models/schema.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { sendEmail } from "./email.service.js";

export interface CreateOrderDTO {
  packageDescription: string;
  customerId: string;
  riderId: string;
}

export interface AssignLocationDTO {
  locationLabel: string;
  locationPrecise?: string;
}

// Order status transition map
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["rider_accepted", "customer_location_set", "cancelled"],
  rider_accepted: ["confirmed", "cancelled"],
  customer_location_set: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export class OrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `ORD${timestamp}${random}`;
  }

  /**
   * Validate if status transition is allowed
   */
  private canTransitionTo(currentStatus: string, newStatus: string): boolean {
    return (
      ORDER_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
    );
  }

  /**
   * Validate rider can perform order actions
   */
  private async validateRiderForOrder(
    tx: any,
    riderId: string,
    orgId: string,
    action: string,
  ): Promise<void> {
    // Check global rider activity
    const rider = await tx.query.users.findFirst({
      where: eq(users.id, riderId),
      columns: {
        id: true,
        isActive: true,
        role: true,
      },
    });

    if (!rider) {
      throw new Error("Rider not found");
    }

    if (rider.role !== "rider") {
      throw new Error("User is not a rider");
    }

    if (!rider.isActive) {
      throw new Error(
        `You must be active to ${action}. Please toggle your activity status in the app.`,
      );
    }

    // Check organization-specific status
    const riderMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, riderId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "rider"),
      ),
      columns: {
        isActive: true,
        isSuspended: true,
        suspensionReason: true,
      },
    });

    if (!riderMembership) {
      throw new Error("Rider membership not found in this organization");
    }

    if (!riderMembership.isActive) {
      throw new Error(
        `Your membership in this organization is inactive. Contact your administrator to ${action}.`,
      );
    }

    if (riderMembership.isSuspended) {
      const reason = riderMembership.suspensionReason || "policy violation";
      throw new Error(`Cannot ${action} while suspended. Reason: ${reason}`);
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orgId: string, ownerUserId: string, dto: CreateOrderDTO) {
    return await db.transaction(async (tx) => {
      // Verify owner has permission
      const ownerMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, ownerUserId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "owner"),
          eq(userOrganizations.isActive, true),
        ),
      });

      if (!ownerMembership) {
        throw new Error("Only organization owners can create orders");
      }

      // Verify customer exists and is verified
      const customer = await tx.query.users.findFirst({
        where: and(
          eq(users.id, dto.customerId),
          eq(users.role, "customer"),
          eq(users.emailVerified, true),
        ),
      });

      if (!customer) {
        throw new Error("Customer not found or not verified");
      }

      // Verify rider membership in organization
      const riderMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, dto.riderId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "rider"),
          eq(userOrganizations.isActive, true),
        ),
      });

      if (!riderMembership) {
        throw new Error("Rider is not an active member of this organization");
      }

      if (riderMembership.isSuspended) {
        throw new Error("Cannot assign orders to suspended riders");
      }

      // Verify rider exists and is globally active
      const rider = await tx.query.users.findFirst({
        where: eq(users.id, dto.riderId),
        columns: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          role: true,
        },
      });

      if (!rider) {
        throw new Error("Rider not found");
      }

      if (rider.role !== "rider") {
        throw new Error("Assigned user is not a rider");
      }

      if (!rider.isActive) {
        throw new Error(
          "Rider is currently inactive and cannot be assigned orders",
        );
      }

      // Create the order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: this.generateOrderNumber(),
          orgId,
          packageDescription: dto.packageDescription,
          customerId: dto.customerId,
          riderId: dto.riderId,
          status: "pending",
          assignedAt: new Date(),
        })
        .returning();

      // Send notifications
      await this.sendAssignmentNotifications(order, customer, rider);

      return order;
    });
  }

  /**
   * Get all orders with optimized queries
   */
  async getOrders(userId: string, userRole: string, orgId?: string) {
    let conditions: any[] = [];

    if (userRole === "customer") {
      conditions.push(eq(orders.customerId, userId));
    } else if (userRole === "rider") {
      if (!orgId) throw new Error("Organization context required for riders");
      conditions.push(eq(orders.orgId, orgId));
      conditions.push(eq(orders.riderId, userId));
    } else {
      if (!orgId) throw new Error("Organization context required for owners");
      conditions.push(eq(orders.orgId, orgId));
    }

    // Optimized query with joins
    const ordersList = await db
      .select({
        // Order fields
        id: orders.id,
        orderNumber: orders.orderNumber,
        orgId: orders.orgId,
        packageDescription: orders.packageDescription,
        customerId: orders.customerId,
        riderId: orders.riderId,
        riderCurrentLocation: orders.riderCurrentLocation,
        customerLocationLabel: orders.customerLocationLabel,
        customerLocationPrecise: orders.customerLocationPrecise,
        status: orders.status,
        assignedAt: orders.assignedAt,
        riderAcceptedAt: orders.riderAcceptedAt,
        customerLocationSetAt: orders.customerLocationSetAt,
        deliveredAt: orders.deliveredAt,
        cancelledAt: orders.cancelledAt,
        cancelledBy: orders.cancelledBy,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,

        // Organization fields
        orgName: organizations.name,
        orgOwnerUserId: organizations.ownerUserId,

        // Customer fields (from join)
        customerEmail: users.email,
        customerName: users.name,
        customerPhone: users.phoneNumber,
        customerLocations: users.locations,
      })
      .from(orders)
      .innerJoin(organizations, eq(orders.orgId, organizations.id))
      .innerJoin(users, eq(orders.customerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    // Batch fetch riders and owners
    const riderIds = [
      ...new Set(
        ordersList
          .map((o) => o.riderId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const ownerIds = [
      ...new Set(
        ordersList
          .map((o) => o.orgOwnerUserId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [riders, owners] = await Promise.all([
      riderIds.length > 0
        ? db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              phoneNumber: users.phoneNumber,
              currentLocation: users.currentLocation,
              isActive: users.isActive,
            })
            .from(users)
            .where(inArray(users.id, riderIds))
        : Promise.resolve([]),
      ownerIds.length > 0
        ? db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, ownerIds))
        : Promise.resolve([]),
    ]);

    const riderMap = new Map(riders.map((r) => [r.id, r]));
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    return ordersList.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orgId: order.orgId,
      packageDescription: order.packageDescription,
      customerId: order.customerId,
      riderId: order.riderId,
      riderCurrentLocation: order.riderCurrentLocation,
      customerLocationLabel: order.customerLocationLabel,
      customerLocationPrecise: order.customerLocationPrecise,
      status: order.status,
      assignedAt: order.assignedAt,
      riderAcceptedAt: order.riderAcceptedAt,
      customerLocationSetAt: order.customerLocationSetAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancelledBy: order.cancelledBy,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      organization: {
        id: order.orgId,
        name: order.orgName,
        owner: order.orgOwnerUserId
          ? ownerMap.get(order.orgOwnerUserId) || null
          : null,
      },
      customer: {
        id: order.customerId,
        email: order.customerEmail,
        name: order.customerName,
        phoneNumber: order.customerPhone,
        locations: order.customerLocations,
      },
      rider: order.riderId ? riderMap.get(order.riderId) || null : null,
    }));
  }

  /**
   * Get single order by ID with optimized query
   */
  async getOrderById(
    orderId: string,
    userId: string,
    userRole: string,
    orgId?: string,
  ) {
    let conditions: any[] = [eq(orders.id, orderId)];

    if (userRole === "customer") {
      conditions.push(eq(orders.customerId, userId));
    } else if (userRole === "rider") {
      if (!orgId) throw new Error("Organization context required for riders");
      conditions.push(eq(orders.orgId, orgId));
      conditions.push(eq(orders.riderId, userId));
    } else {
      if (!orgId) throw new Error("Organization context required for owners");
      conditions.push(eq(orders.orgId, orgId));
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .limit(1);

    if (!order) {
      throw new Error("Order not found or you don't have access to it");
    }

    // Fetch related data
    const [org, customer, rider] = await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, order.orgId),
        columns: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      }),
      db.query.users.findFirst({
        where: eq(users.id, order.customerId),
        columns: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          locations: true,
        },
      }),
      order.riderId
        ? db.query.users.findFirst({
            where: eq(users.id, order.riderId),
            columns: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              currentLocation: true,
              isActive: true,
            },
          })
        : Promise.resolve(null),
    ]);

    // Get owner details if needed
    let owner = null;
    if (org?.ownerUserId) {
      owner = await db.query.users.findFirst({
        where: eq(users.id, org.ownerUserId),
        columns: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    return {
      ...order,
      organization: {
        id: org?.id,
        name: org?.name,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
            }
          : null,
      },
      customer,
      rider,
    };
  }

  /**
   * Rider accepts an order
   */
  async riderAcceptOrder(
    orderId: string,
    riderId: string,
    currentLocation: string,
  ) {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.riderId, riderId),
          sql`${orders.status} IN ('pending', 'customer_location_set')`,
        ),
      });

      if (!order) {
        throw new Error(
          "Order not found or not in a state that can be accepted",
        );
      }

      // Validate rider can perform this action
      await this.validateRiderForOrder(
        tx,
        riderId,
        order.orgId,
        "accept orders",
      );

      // Determine next status based on current state
      let nextStatus: "rider_accepted" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "rider_accepted";
      } else if (order.status === "customer_location_set") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Order cannot be accepted in current state");
      }

      // Validate status transition
      if (!this.canTransitionTo(order.status, nextStatus)) {
        throw new Error(
          `Cannot transition from ${order.status} to ${nextStatus}`,
        );
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: nextStatus,
          riderCurrentLocation: currentLocation,
          riderAcceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Update rider's current location
      await tx
        .update(users)
        .set({
          currentLocation: currentLocation,
        })
        .where(eq(users.id, riderId));

      return updatedOrder;
    });
  }

  /**
   * Customer sets their delivery location
   */
  async setCustomerLocation(
    orderId: string,
    customerId: string,
    dto: AssignLocationDTO,
  ) {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.customerId, customerId),
          sql`${orders.status} IN ('pending', 'rider_accepted')`,
        ),
      });

      if (!order) {
        throw new Error(
          "Order not found or not in a state that can have location set",
        );
      }

      // Determine next status
      let nextStatus: "customer_location_set" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "customer_location_set";
      } else if (order.status === "rider_accepted") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Location cannot be set in current state");
      }

      // Validate status transition
      if (!this.canTransitionTo(order.status, nextStatus)) {
        throw new Error(
          `Cannot transition from ${order.status} to ${nextStatus}`,
        );
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          customerLocationLabel: dto.locationLabel,
          customerLocationPrecise: dto.locationPrecise || dto.locationLabel,
          status: nextStatus,
          customerLocationSetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updatedOrder;
    });
  }

  /**
   * Owner sets customer location from saved locations
   */
  async ownerSetCustomerLocation(
    orderId: string,
    ownerId: string,
    orgId: string,
    dto: AssignLocationDTO,
  ) {
    return await db.transaction(async (tx) => {
      const ownerMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, ownerId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "owner"),
          eq(userOrganizations.isActive, true),
        ),
      });

      if (!ownerMembership) {
        throw new Error("Only organization owners can set locations");
      }

      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.orgId, orgId),
          sql`${orders.status} IN ('pending', 'rider_accepted')`,
        ),
      });

      if (!order) {
        throw new Error(
          "Order not found or not in a state that can have location set",
        );
      }

      const customer = await tx.query.users.findFirst({
        where: eq(users.id, order.customerId),
        columns: {
          locations: true,
        },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      const customerLocations = customer.locations as
        | Array<{
            label: string;
            preciseLocation: string;
          }>
        | undefined;

      const savedLocation = customerLocations?.find(
        (loc) => loc.label === dto.locationLabel,
      );

      if (!savedLocation) {
        throw new Error(
          "Location label not found in customer's saved locations",
        );
      }

      // Determine next status
      let nextStatus: "customer_location_set" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "customer_location_set";
      } else if (order.status === "rider_accepted") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Location cannot be set in current state");
      }

      // Validate status transition
      if (!this.canTransitionTo(order.status, nextStatus)) {
        throw new Error(
          `Cannot transition from ${order.status} to ${nextStatus}`,
        );
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          customerLocationLabel: dto.locationLabel,
          customerLocationPrecise: savedLocation.preciseLocation,
          status: nextStatus,
          customerLocationSetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updatedOrder;
    });
  }

  /**
   * Rider confirms delivery
   */
  async confirmDelivery(orderId: string, riderId: string) {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.riderId, riderId),
          eq(orders.status, "confirmed"),
        ),
      });

      if (!order) {
        throw new Error("Order not found or not confirmed");
      }

      // Validate rider can perform this action
      await this.validateRiderForOrder(
        tx,
        riderId,
        order.orgId,
        "confirm deliveries",
      );

      // Validate status transition
      if (!this.canTransitionTo(order.status, "delivered")) {
        throw new Error(`Cannot transition from ${order.status} to delivered`);
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: "delivered",
          deliveredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updatedOrder;
    });
  }

  /**
   * Get customer location labels for an order
   */
  async getCustomerLocationLabels(
    orderId: string,
    orgId: string,
    ownerId: string,
  ) {
    const ownerMembership = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
        eq(userOrganizations.isActive, true),
      ),
    });

    if (!ownerMembership) {
      throw new Error(
        "Only organization owners can view customer location labels",
      );
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.orgId, orgId)),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const customer = await db.query.users.findFirst({
      where: eq(users.id, order.customerId),
      columns: {
        locations: true,
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const customerLocations = customer.locations as
      | Array<{
          label: string;
          preciseLocation: string;
        }>
      | undefined;

    return (
      customerLocations?.map((loc) => ({
        label: loc.label,
      })) || []
    );
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    userRole: string,
    orgId?: string,
  ) {
    let conditions: any[] = [eq(orders.id, orderId)];

    if (userRole === "customer") {
      conditions.push(eq(orders.customerId, userId));
    } else {
      if (!orgId) throw new Error("Organization context required");
      conditions.push(eq(orders.orgId, orgId));
    }

    const order = await db.query.orders.findFirst({
      where: and(...conditions),
    });

    if (!order) {
      throw new Error("Order not found or you don't have access to it");
    }

    if (userRole === "rider" && order.riderId !== userId) {
      throw new Error("You can only cancel orders assigned to you");
    }

    if (order.status === "delivered") {
      throw new Error("Delivered orders cannot be cancelled");
    }

    if (order.status === "cancelled") {
      throw new Error("Order is already cancelled");
    }

    // Validate status transition
    if (!this.canTransitionTo(order.status, "cancelled")) {
      throw new Error(`Orders in ${order.status} status cannot be cancelled`);
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: `Cancelled by ${userRole}`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  /**
   * Send assignment notifications to customer and rider
   */
  private async sendAssignmentNotifications(
    order: any,
    customer: any,
    rider: any,
  ) {
    try {
      const notifications = [];

      if (customer.email) {
        notifications.push(
          sendEmail({
            to: customer.email,
            subject: `New Package Assigned - ${order.orderNumber}`,
            html: `
            <h2>New Package Assigned</h2>
            <p>Hello ${customer.name || "Customer"},</p>
            <p>A new package has been assigned to you:</p>
            <ul>
              <li><strong>Order Number:</strong> ${order.orderNumber}</li>
              <li><strong>Package:</strong> ${order.packageDescription}</li>
              <li><strong>Assigned Rider:</strong> ${rider.name || "Rider"}</li>
            </ul>
            <p>Please go to the mobile app to set your delivery location.</p>
          `,
          }),
        );
      }

      if (rider.email) {
        notifications.push(
          sendEmail({
            to: rider.email,
            subject: `New Delivery Assignment - ${order.orderNumber}`,
            html: `
            <h2>New Delivery Assignment</h2>
            <p>Hello ${rider.name || "Rider"},</p>
            <p>You have been assigned a new delivery:</p>
            <ul>
              <li><strong>Order Number:</strong> ${order.orderNumber}</li>
              <li><strong>Package:</strong> ${order.packageDescription}</li>
              <li><strong>Customer:</strong> ${customer.name || "Customer"}</li>
            </ul>
            <p>Please go to the mobile app to accept this delivery.</p>
          `,
          }),
        );
      }

      await Promise.all(notifications);
    } catch (error) {
      console.error("Failed to send assignment notifications:", error);
      // Don't throw - we don't want email failures to block order creation
    }
  }
}

export const orderService = new OrderService();
