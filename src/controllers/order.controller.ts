import { Response } from "express";
import {
  orderService,
  CreateOrderDTO,
  AssignLocationDTO,
} from "../services/order.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export class OrderController {
  async createOrder(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const dto: CreateOrderDTO = req.body;

      const order = await orderService.createOrder(
        user!.orgId!,
        user!.userId,
        dto,
      );

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getOrder(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;
      const orgId = user?.orgId || undefined;

      const order = await orderService.getOrderById(
        orderIdString,
        user!.userId,
        user!.role || "",
        orgId,
      );

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getOrders(req: AuthRequest, res: Response) {
    try {
      const { user } = req;

      const orgId = user?.orgId || undefined;

      const orders = await orderService.getOrders(
        user!.userId,
        user!.role || "",
        orgId,
      );

      return res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async riderAcceptOrder(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;
      const { currentLocation } = req.body;

      if (!currentLocation) {
        return res.status(400).json({
          success: false,
          message: "Current location is required",
        });
      }

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.riderAcceptOrder(
        orderIdString,
        user!.userId,
        currentLocation,
      );

      return res.status(200).json({
        success: true,
        message: "Order accepted successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error accepting order:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async setCustomerLocation(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;
      const dto: AssignLocationDTO = req.body;

      if (!dto.locationLabel) {
        return res.status(400).json({
          success: false,
          message: "Location label is required",
        });
      }

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.setCustomerLocation(
        orderIdString,
        user!.userId,
        dto,
      );

      return res.status(200).json({
        success: true,
        message: "Location set successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error setting customer location:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async ownerSetCustomerLocation(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;
      const dto: AssignLocationDTO = req.body;

      if (!dto.locationLabel) {
        return res.status(400).json({
          success: false,
          message: "Location label is required",
        });
      }

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.ownerSetCustomerLocation(
        orderIdString,
        user!.userId,
        user!.orgId!,
        dto,
      );

      return res.status(200).json({
        success: true,
        message: "Customer location set successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error setting customer location by owner:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getCustomerLocationLabels(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const locations = await orderService.getCustomerLocationLabels(
        orderIdString,
        user!.orgId!,
        user!.userId,
      );

      return res.status(200).json({
        success: true,
        data: locations,
      });
    } catch (error: any) {
      console.error("Error fetching customer location labels:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async cancelOrder(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;
      const orgId = user?.orgId || undefined;

      const order = await orderService.cancelOrder(
        orderIdString,
        user!.userId,
        user!.role || "",
        orgId,
      );

      return res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async confirmDelivery(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.confirmDelivery(
        orderIdString,
        user!.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Delivery confirmed successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error confirming delivery:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markPackagePickedUp(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.markPackagePickedUp(
        orderIdString,
        user!.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Package picked up successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error marking package picked up:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async startDelivery(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.startDelivery(
        orderIdString,
        user!.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Delivery started successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error starting delivery:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markArrivedAtLocation(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.markArrivedAtLocation(
        orderIdString,
        user!.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Arrived at location successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error marking arrived at location:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateRiderLocation(req: AuthRequest, res: Response) {
    try {
      const { user } = req;
      const { orderId } = req.params;
      const { currentLocation } = req.body;

      if (!currentLocation) {
        return res.status(400).json({
          success: false,
          message: "Current location is required",
        });
      }

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      await orderService.updateRiderLocation(
        orderIdString,
        user!.userId,
        currentLocation,
      );

      return res.status(200).json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating rider location:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const orderController = new OrderController();
