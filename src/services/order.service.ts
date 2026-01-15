import { db } from "../config/database.js";
import { orders, users, userOrganizations } from "../models/schema.js";
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
      // Verify owner belongs to organization
      const ownerMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, ownerUserId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "owner"),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!ownerMembership) {
        throw new Error("Only organization owners can create orders");
      }

      // Verify customer exists (customers don't need org membership)
      const customer = await tx.query.users.findFirst({
        where: and(
          eq(users.id, dto.customerId),
          eq(users.role, "customer"),
          eq(users.emailVerified, true) // Customer should be verified
        ),
      });

      if (!customer) {
        throw new Error("Customer not found or not verified");
      }

      // Verify rider belongs to organization and is a rider
      const riderMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, dto.riderId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "rider"),
          eq(userOrganizations.isActive, true)
        ),
        with: {
          user: true,
        },
      });

      if (!riderMembership) {
        throw new Error("Rider is not a member of this organization");
      }

      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: this.generateOrderNumber(),
          orgId,
          packageDescription: dto.packageDescription,
          customerId: dto.customerId,
          riderId: dto.riderId,
          status: "assigned",
          assignedAt: new Date(),
        })
        .returning();

      // Send email notifications
      await this.sendAssignmentNotifications(
        order,
        customer,
        riderMembership.user
      );

      return order;
    });
  }

  // Fix the getOrders method to handle relations properly
  async getOrders(userId: string, userRole: string, orgId?: string) {
    let conditions: any[] = [];

    if (userRole === "customer") {
      // Customers see all their orders
      conditions.push(eq(orders.customerId, userId));
    } else if (userRole === "rider") {
      // Riders see their orders in current org
      if (!orgId) throw new Error("Organization context required for riders");
      conditions.push(eq(orders.orgId, orgId));
      conditions.push(eq(orders.riderId, userId));
    } else {
      // Owners see all orders in their org
      if (!orgId) throw new Error("Organization context required for owners");
      conditions.push(eq(orders.orgId, orgId));
    }

    // Use raw query to avoid Drizzle relation issues
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
        cancelledAt: orders.cancelledAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    // Get customer and rider details separately
    const enhancedOrders = await Promise.all(
      ordersList.map(async (order) => {
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
          customer,
          rider,
        };
      })
    );

    return enhancedOrders;
  }

  // Also fix the getOrderById method:
  async getOrderById(
    orderId: string,
    userId: string,
    userRole: string,
    orgId?: string
  ) {
    let conditions: any[] = [eq(orders.id, orderId)];

    if (userRole === "customer") {
      // Customers can only see their own orders
      conditions.push(eq(orders.customerId, userId));
    } else if (userRole === "rider") {
      // Riders need org context
      if (!orgId) throw new Error("Organization context required for riders");
      conditions.push(eq(orders.orgId, orgId));
      conditions.push(eq(orders.riderId, userId));
    } else {
      // Owners need org context
      if (!orgId) throw new Error("Organization context required for owners");
      conditions.push(eq(orders.orgId, orgId));
    }

    const order = await db
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
        cancelledAt: orders.cancelledAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...conditions));

    if (order.length === 0) {
      throw new Error("Order not found");
    }

    // Get customer and rider details
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
      customer,
      rider,
    };
  }

  async riderAcceptOrder(
    orderId: string,
    riderId: string,
    currentLocation: string
  ) {
    return await db.transaction(async (tx) => {
      // Find order assigned to this rider
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.riderId, riderId),
          eq(orders.status, "assigned")
        ),
      });

      if (!order) {
        throw new Error("Order not found or not assigned to this rider");
      }

      // Update order
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: "rider_accepted",
          riderCurrentLocation: currentLocation,
          riderAcceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Update rider's current location in users table
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
    dto: AssignLocationDTO
  ) {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.customerId, customerId),
        eq(orders.status, "rider_accepted")
      ),
    });

    if (!order) {
      throw new Error("Order not found or rider hasn't accepted yet");
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        customerLocationLabel: dto.locationLabel,
        customerLocationPrecise: dto.locationPrecise,
        status: "customer_location_set",
        customerLocationSetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  async ownerSetCustomerLocation(
    orderId: string,
    ownerId: string,
    orgId: string,
    dto: AssignLocationDTO
  ) {
    return await db.transaction(async (tx) => {
      // Verify owner belongs to organization
      const ownerMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, ownerId),
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.role, "owner"),
          eq(userOrganizations.isActive, true)
        ),
      });

      if (!ownerMembership) {
        throw new Error("Only organization owners can set locations");
      }

      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.orgId, orgId),
          eq(orders.status, "rider_accepted")
        ),
      });

      if (!order) {
        throw new Error("Order not found or rider hasn't accepted yet");
      }

      // Get customer's saved locations to validate label
      const customer = await tx.query.users.findFirst({
        where: eq(users.id, order.customerId),
        columns: {
          locations: true,
        },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Type assertion for customer.locations
      const customerLocations = customer.locations as
        | Array<{
            label: string;
            preciseLocation: string;
          }>
        | undefined;

      // Find the precise location from customer's saved locations
      const savedLocation = customerLocations?.find(
        (loc) => loc.label === dto.locationLabel
      );

      if (!savedLocation) {
        throw new Error(
          "Location label not found in customer's saved locations"
        );
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          customerLocationLabel: dto.locationLabel,
          customerLocationPrecise: savedLocation.preciseLocation,
          status: "customer_location_set",
          customerLocationSetAt: new Date(),
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
    ownerId: string
  ) {
    // Verify owner belongs to organization
    const ownerMembership = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, ownerId),
        eq(userOrganizations.orgId, orgId),
        eq(userOrganizations.role, "owner"),
        eq(userOrganizations.isActive, true)
      ),
    });

    if (!ownerMembership) {
      throw new Error(
        "Only organization owners can view customer location labels"
      );
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.orgId, orgId)),
      with: {
        customer: {
          columns: {
            locations: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Type assertion for customer.locations
    const customerLocations = (order.customer as any)?.locations as
      | Array<{
          label: string;
          preciseLocation: string;
        }>
      | undefined;

    // Return only location labels (not precise locations)
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
    orgId?: string // Optional for customers
  ) {
    let conditions: any[] = [eq(orders.id, orderId)];

    if (userRole === "customer") {
      // Customers can only cancel their own orders
      conditions.push(eq(orders.customerId, userId));
    } else {
      // Owners/riders need org context
      if (!orgId) throw new Error("Organization context required");
      conditions.push(eq(orders.orgId, orgId));
    }

    const order = await db.query.orders.findFirst({
      where: and(...conditions),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check permissions for riders
    if (userRole === "rider" && order.riderId !== userId) {
      throw new Error("You can only cancel orders assigned to you");
    }

    // Check if order can be cancelled
    if (!["pending", "assigned", "rider_accepted"].includes(order.status)) {
      throw new Error("Order cannot be cancelled in its current state");
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  private async sendAssignmentNotifications(
    order: any,
    customer: any,
    rider: any
  ) {
    try {
      // Send email to customer
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

      // Send email to rider
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
      // Don't throw error - email failure shouldn't break order creation
    }
  }
}

export const orderService = new OrderService();
