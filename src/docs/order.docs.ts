/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management with real-time tracking and status updates
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     CreateOrderDTO:
 *       type: object
 *       required:
 *         - packageDescription
 *         - customerId
 *         - riderId
 *       properties:
 *         packageDescription:
 *           type: string
 *           example: "Large box containing electronics"
 *         customerId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         riderId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *
 *     AssignLocationDTO:
 *       type: object
 *       required:
 *         - locationLabel
 *       properties:
 *         locationLabel:
 *           type: string
 *           example: "Home"
 *         locationPrecise:
 *           type: string
 *           nullable: true
 *           example: "123 Main St, Apt 4B"
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           nullable: true
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *         locations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               preciseLocation:
 *                 type: string
 *                 nullable: true
 *         currentLocation:
 *           type: string
 *           nullable: true
 *
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         orderNumber:
 *           type: string
 *           example: "ORD123456"
 *         orgId:
 *           type: string
 *           format: uuid
 *         packageDescription:
 *           type: string
 *         customerId:
 *           type: string
 *           format: uuid
 *         riderId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         riderCurrentLocation:
 *           type: string
 *           nullable: true
 *         customerLocationLabel:
 *           type: string
 *           nullable: true
 *         customerLocationPrecise:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, rider_accepted, customer_location_set, confirmed, package_picked_up, in_transit, arrived_at_location, delivered, cancelled]
 *         assignedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         riderAcceptedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         customerLocationSetAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         packagePickedUpAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         deliveryStartedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         arrivedAtLocationAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         deliveredAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancelledBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         customer:
 *           $ref: '#/components/schemas/User'
 *         rider:
 *           $ref: '#/components/schemas/User'
 *         websocketInfo:
 *           $ref: '#/components/schemas/WebSocketConnectionInfo'
 *         statusFlow:
 *           $ref: '#/components/schemas/OrderStatusFlowDiagram'
 *
 *     LocationLabel:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           example: "Home"
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Order created successfully"
 *         data:
 *           type: object
 *           nullable: true
 *
 *     OrdersListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Order'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *
 *     RiderLocationUpdate:
 *       type: object
 *       description: Message sent by rider to update location via WebSocket
 *       required:
 *         - coords
 *       properties:
 *         coords:
 *           type: string
 *           description: "Latitude and longitude coordinates"
 *           example: "40.7128,-74.0060"
 *
 *     LocationUpdateBroadcast:
 *       type: object
 *       description: Location update broadcast to all connected clients via WebSocket
 *       required:
 *         - type
 *         - location
 *         - timestamp
 *       properties:
 *         type:
 *           type: string
 *           enum: [location_update]
 *           example: "location_update"
 *         location:
 *           type: string
 *           description: "Latitude and longitude coordinates"
 *           example: "40.7128,-74.0060"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     StatusUpdateBroadcast:
 *       type: object
 *       description: Status update broadcast to all connected clients via WebSocket
 *       required:
 *         - type
 *         - status
 *         - timestamp
 *       properties:
 *         type:
 *           type: string
 *           enum: [status_update]
 *           example: "status_update"
 *         status:
 *           type: string
 *           enum: [pending, rider_accepted, customer_location_set, confirmed, package_picked_up, in_transit, arrived_at_location, delivered, cancelled]
 *           example: "in_transit"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     WebSocketConnectionInfo:
 *       type: object
 *       description: |
 *         Real-time WebSocket connection information for order tracking.
 *
 *         **How to Connect:**
 *         - Rider: `ws://server?orderId=xxx&userId=xxx&role=rider`
 *         - Customer: `ws://server?orderId=xxx&userId=xxx&role=customer`
 *         - Owner: `ws://server?orderId=xxx&userId=xxx&role=owner`
 *
 *         **Rider sends location updates:**
 *         ```json
 *         {"coords": "40.7128,-74.0060"}
 *         ```
 *
 *         **All clients receive:**
 *         ```json
 *         {"type": "location_update", "location": "40.7128,-74.0060", "timestamp": "2024-01-22T10:30:00Z"}
 *         {"type": "status_update", "status": "in_transit", "timestamp": "2024-01-22T10:30:00Z"}
 *         ```
 *       properties:
 *         url:
 *           type: string
 *           description: WebSocket server URL
 *           example: "ws://localhost:5000"
 *         connectionParameters:
 *           type: object
 *           required:
 *             - orderId
 *             - userId
 *             - role
 *           properties:
 *             orderId:
 *               type: string
 *               format: uuid
 *               description: Order ID to track
 *             userId:
 *               type: string
 *               format: uuid
 *               description: User ID (rider, customer, or owner)
 *             role:
 *               type: string
 *               enum: [rider, customer, owner]
 *               description: User role for connection
 *         messageFormats:
 *           type: object
 *           properties:
 *             riderSends:
 *               $ref: '#/components/schemas/RiderLocationUpdate'
 *             allReceive:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/LocationUpdateBroadcast'
 *                   - $ref: '#/components/schemas/StatusUpdateBroadcast'
 *
 *     OrderStatusFlowDiagram:
 *       type: object
 *       description: |
 *         **Complete Order Status Flow:**
 *
 *         1. **pending** → Order created
 *         2. **rider_accepted** OR **customer_location_set** → Can happen in any order
 *         3. **confirmed** → Both rider accepted AND customer location set
 *         4. **package_picked_up** → Rider picks up from org address
 *         5. **in_transit** → Delivery started (WebSocket tracking active)
 *         6. **arrived_at_location** → Rider at customer location
 *         7. **delivered** → Final state
 *
 *         **Cancellation:** Available from any state except "delivered"
 *
 *         **WebSocket Tracking:** Active during confirmed → package_picked_up → in_transit → arrived_at_location
 *       properties:
 *         currentStatus:
 *           type: string
 *           enum: [pending, rider_accepted, customer_location_set, confirmed, package_picked_up, in_transit, arrived_at_location, delivered, cancelled]
 *           description: Current order status
 *         possibleTransitions:
 *           type: array
 *           items:
 *             type: string
 *           description: Next possible statuses from current state
 *           example: ["package_picked_up", "cancelled"]
 *         trackingAvailable:
 *           type: boolean
 *           description: Whether real-time WebSocket tracking is available for current status
 *           example: true
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Authentication token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     ForbiddenError:
 *       description: User does not have required role permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     BadRequestError:
 *       description: Invalid request parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     OrderNotFoundError:
 *       description: Order not found or user doesn't have access
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *   parameters:
 *     orderIdPath:
 *       name: orderId
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: Order ID
 *
 *     authorizationHeader:
 *       name: Authorization
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *       description: Bearer token for authentication
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     description: |
 *       Create a new delivery order. **Only organization owners can create orders.**
 *       Requires organization context (orgId in user session).
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
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get orders list
 *     description: |
 *       Get orders based on user role with automatic filtering.
 *       - **Customers:** See all their own orders
 *       - **Riders:** See their orders in current organization
 *       - **Owners:** See all orders in their organization
 *
 *       **Note:** Each order includes WebSocket connection info and status flow for real-time tracking.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdersListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get single order by ID
 *     description: |
 *       Get details of a specific order with role-based access control.
 *
 *       **Response includes:**
 *       - Full order details
 *       - WebSocket connection information for real-time tracking
 *       - Status flow diagram showing possible next steps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/OrderNotFoundError'
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

/**
 * @swagger
 * /orders/{orderId}/accept:
 *   post:
 *     tags: [Orders]
 *     summary: Rider accept order
 *     description: |
 *       Rider accepts an assigned order and provides current location.
 *       Order must be in "pending" or "customer_location_set" status.
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
 * /orders/{orderId}/set-customer-location:
 *   post:
 *     tags: [Orders]
 *     summary: Owner set customer location
 *     description: |
 *       Owner sets customer location from customer's saved locations.
 *       Location label must exist in customer's saved locations.
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
 *         description: Customer location set successfully
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
 * /orders/{orderId}/customer-location-labels:
 *   get:
 *     tags: [Orders]
 *     summary: Get customer's saved location labels
 *     description: |
 *       Get customer's saved location labels for an order.
 *       Used by owners to see available location labels.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/orderIdPath'
 *     responses:
 *       200:
 *         description: Customer location labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LocationLabel'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/OrderNotFoundError'
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
 * /orders/{orderId}/package-picked-up:
 *   post:
 *     tags: [Orders]
 *     summary: Rider mark package picked up
 *     description: |
 *       Rider marks package as picked up from organization address.
 *       Order must be in "confirmed" status.
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
 * /orders/{orderId}/update-location:
 *   post:
 *     tags: [Orders]
 *     summary: Update rider's current location
 *     description: |
 *       Update rider's current location during delivery.
 *       Alternative to WebSocket for location updates.
 *       Order must be in trackable status (confirmed, package_picked_up, in_transit, arrived_at_location).
 *
 *       **Note:** For real-time tracking, WebSocket is preferred. See WebSocketConnectionInfo schema.
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
 *                 example: "40.7130,-74.0062"
 *     responses:
 *       200:
 *         description: Location updated successfully
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
