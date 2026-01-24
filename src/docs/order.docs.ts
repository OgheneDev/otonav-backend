/**
 * @swagger
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     description: |
 *       Create a new delivery order. **Only organization owners can create orders.**
 *       Requires organization context (orgId in user session).
 *
 *       **Push Notifications Sent:**
 *       - Customer receives: "📦 New Package Assigned - Order {orderNumber}: {packageDescription}"
 *       - Rider receives: "🚴 New Delivery Assignment - Order {orderNumber}: {packageDescription}"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderDTO'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/accept:
 *   post:
 *     tags: [Orders]
 *     summary: Rider accept order
 *     description: |
 *       Rider accepts an assigned order and provides current location.
 *       Order must be in "pending" or "customer_location_set" status.
 *
 *       **Push Notification Sent:**
 *       - Customer receives: "✅ Rider Accepted Order - {riderName} has accepted your delivery ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentLocation
 *             properties:
 *               currentLocation:
 *                 type: string
 *                 example: "40.7128,-74.0060"
 *     responses:
 *       200:
 *         description: Order accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/set-location:
 *   post:
 *     tags: [Orders]
 *     summary: Customer set delivery location
 *     description: |
 *       Customer sets their delivery location.
 *       Order must be in "pending" or "rider_accepted" status.
 *
 *       **Push Notification Sent:**
 *       - Rider receives: "📍 Delivery Location Set - Customer set location to: {locationLabel} ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignLocationDTO'
 *     responses:
 *       200:
 *         description: Location set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/package-picked-up:
 *   post:
 *     tags: [Orders]
 *     summary: Rider mark package picked up
 *     description: |
 *       Rider marks package as picked up from organization address.
 *       Order must be in "confirmed" status.
 *
 *       **Push Notification Sent:**
 *       - Customer receives: "📦 Package Picked Up - {riderName} has picked up your package ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Package picked up successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/start-delivery:
 *   post:
 *     tags: [Orders]
 *     summary: Rider start delivery trip
 *     description: |
 *       Rider starts delivery trip to customer location.
 *       Order must be in "package_picked_up" status.
 *
 *       **Real-time tracking begins from this point.**
 *       Connect via WebSocket to receive location updates.
 *       See WebSocketConnectionInfo schema for connection details.
 *
 *       **Push Notification Sent:**
 *       - Customer receives: "🚴 Delivery Started - {riderName} is on the way with your package ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Delivery started successfully. WebSocket tracking is now active.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     websocketInfo:
 *                       $ref: '#/components/schemas/WebSocketConnectionInfo'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/mark-arrived:
 *   post:
 *     tags: [Orders]
 *     summary: Rider mark arrived at location
 *     description: |
 *       Rider marks arrival at customer delivery address.
 *       Order must be in "in_transit" status.
 *       Real-time tracking stops after this.
 *
 *       **Push Notification Sent:**
 *       - Customer receives: "🎯 Rider Arrived - {riderName} has arrived at your location ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Arrived at location successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/confirm-delivery:
 *   post:
 *     tags: [Orders]
 *     summary: Rider confirm delivery
 *     description: |
 *       Rider confirms package has been delivered.
 *       Order must be in "arrived_at_location" status.
 *
 *       **Push Notification Sent:**
 *       - Customer receives: "✅ Delivery Completed - Your package has been delivered ({orderNumber})"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Delivery confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}/cancel:
 *   delete:
 *     tags: [Orders]
 *     summary: Cancel an order
 *     description: |
 *       Cancel an order with role-based permissions.
 *       Orders can be cancelled from any state except "delivered".
 *
 *       **Push Notification Sent:**
 *       - All parties (customer, rider, owner) receive: "❌ Order Cancelled - Order {orderNumber} has been cancelled by {role}"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
