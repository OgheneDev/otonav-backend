import { db } from "../config/database.js";
import {
  orders,
  users,
  userOrganizations,
  organizations,
} from "../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
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

export class OrderService {
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `ORD${timestamp}${random}`;
  }

  async createOrder(orgId: string, ownerUserId: string, dto: CreateOrderDTO) {
    return await db.transaction(async (tx) => {
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

      const riderMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, dto.riderId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "rider"),
          eq(userOrganizations.isActive, true),
        ),
      });

      if (!riderMembership) {
        throw new Error("Rider is not a member of this organization");
      }

      const rider = await tx.query.users.findFirst({
        where: eq(users.id, dto.riderId),
      });

      if (!rider) {
        throw new Error("Rider not found");
      }

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

      await this.sendAssignmentNotifications(order, customer, rider);

      return order;
    });
  }

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

    const ordersList = await db
      .select({
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
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    const enhancedOrders = await Promise.all(
      ordersList.map(async (order) => {
        // Get organization details
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, order.orgId),
          columns: {
            id: true,
            name: true,
            ownerUserId: true,
          },
        });

        // Get owner details if ownerUserId exists
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

        const [customer, rider] = await Promise.all([
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
                },
              })
            : Promise.resolve(null),
        ]);

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
      }),
    );

    return enhancedOrders;
  }

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

    const order = await db
      .select()
      .from(orders)
      .where(and(...conditions));

    if (order.length === 0) {
      throw new Error("Order not found");
    }

    // Get organization details
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, order[0].orgId),
      columns: {
        id: true,
        name: true,
        ownerUserId: true,
      },
    });

    // Get owner details if ownerUserId exists
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

    const [customer, rider] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, order[0].customerId),
        columns: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          locations: true,
        },
      }),
      order[0].riderId
        ? db.query.users.findFirst({
            where: eq(users.id, order[0].riderId),
            columns: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              currentLocation: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...order[0],
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

      let nextStatus: "rider_accepted" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "rider_accepted";
      } else if (order.status === "customer_location_set") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Order cannot be accepted in current state");
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

      await tx
        .update(users)
        .set({
          currentLocation: currentLocation,
        })
        .where(eq(users.id, riderId));

      return updatedOrder;
    });
  }

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

      let nextStatus: "customer_location_set" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "customer_location_set";
      } else if (order.status === "rider_accepted") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Location cannot be set in current state");
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

      let nextStatus: "customer_location_set" | "confirmed";
      if (order.status === "pending") {
        nextStatus = "customer_location_set";
      } else if (order.status === "rider_accepted") {
        nextStatus = "confirmed";
      } else {
        throw new Error("Location cannot be set in current state");
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
      throw new Error("Order not found");
    }

    if (userRole === "rider" && order.riderId !== userId) {
      throw new Error("You can only cancel orders assigned to you");
    }

    if (order.status === "delivered") {
      throw new Error("Delivered orders cannot be cancelled");
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  private async sendAssignmentNotifications(
    order: any,
    customer: any,
    rider: any,
  ) {
    try {
      if (customer.email) {
        await sendEmail({
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
        });
      }

      if (rider.email) {
        await sendEmail({
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
        });
      }
    } catch (error) {
      console.error("Failed to send assignment notifications:", error);
    }
  }
}

export const orderService = new OrderService();
