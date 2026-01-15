import { Request, Response } from "express";
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

      // Middleware already verified user is owner with orgId
      const order = await orderService.createOrder(
        user!.orgId!, // orgId is guaranteed by middleware for owners
        user!.userId,
        dto
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
      const orgId = user?.orgId || undefined; // orgId may be undefined for customers

      const order = await orderService.getOrderById(
        orderIdString,
        user!.userId,
        user!.role || "",
        orgId
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

      const orgId = user?.orgId || undefined; // orgId may be undefined for customers

      const orders = await orderService.getOrders(
        user!.userId,
        user!.role || "",
        orgId
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

      // Middleware already verified user is rider
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
        currentLocation
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

      // Middleware already verified user is customer
      if (!dto.locationLabel) {
        return res.status(400).json({
          success: false,
          message: "Location label is required",
        });
      }

      if (!dto.locationPrecise) {
        return res.status(400).json({
          success: false,
          message: "Precise location is required",
        });
      }

      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const order = await orderService.setCustomerLocation(
        orderIdString,
        user!.userId,
        dto
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

      // Middleware already verified user is owner with orgId
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
        user!.orgId!, // orgId is guaranteed by middleware for owners
        dto
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

      // Middleware already verified user is owner with orgId
      const orderIdString = Array.isArray(orderId) ? orderId[0] : orderId;

      const locations = await orderService.getCustomerLocationLabels(
        orderIdString,
        user!.orgId!, // orgId is guaranteed by middleware for owners
        user!.userId
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
      const orgId = user?.orgId || undefined; // orgId may be undefined for customers

      const order = await orderService.cancelOrder(
        orderIdString,
        user!.userId,
        user!.role || "",
        orgId
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
}

export const orderController = new OrderController();
