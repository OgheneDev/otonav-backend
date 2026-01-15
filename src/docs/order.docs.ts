/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management operations with role-based access control
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
 *           nullable: true
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
 *           enum: [assigned, rider_accepted, customer_location_set, cancelled, delivered]
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
 *         cancelledAt:
 *           type: string
 *           format: date-time
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
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     description: |
 *       Create a new delivery order. **Only organization owners can create orders.**
 *
 *       **Permissions:** `owner` role in current organization context
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["owner"])` - Verifies user is owner in org context
 *
 *       **Business Logic:**
 *       1. Verifies customer exists and is verified
 *       2. Verifies rider belongs to same organization
 *       3. Creates order with status "assigned"
 *       4. Sends email notifications to customer and rider
 *
 *       **Note:** Organization context must be set in user's session via `x-org-id` header.
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
 *         examples:
 *           Customer not found:
 *             value:
 *               success: false
 *               message: "Customer not found or not verified"
 *           Rider not found:
 *             value:
 *               success: false
 *               message: "Rider is not a member of this organization"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *         example:
 *           success: false
 *           message: "Insufficient permissions in this organization. Required roles: owner"
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get orders list
 *     description: |
 *       Get orders based on user role with automatic filtering:
 *
 *       - **Customers:** See all their own orders (no org context required)
 *       - **Riders:** See their orders in current organization
 *       - **Owners:** See all orders in their organization
 *
 *       **Permissions:** `customer`, `owner`, or `rider` role
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["customer", "owner", "rider"])` - Verifies user has appropriate role
 *
 *       **Note:** Organization context is automatically handled by middleware.
 *       For owners/riders, org context must be set in user's session.
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
 *         examples:
 *           Org context missing:
 *             value:
 *               success: false
 *               message: "Organization context required for riders"
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
 *       Get details of a specific order with role-based access control:
 *
 *       - **Customers:** Can only see their own orders
 *       - **Riders:** Can only see orders assigned to them in current org
 *       - **Owners:** Can see any order in their organization
 *
 *       **Permissions:** `customer`, `owner`, or `rider` role
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["customer", "owner", "rider"])` - Verifies user has appropriate role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
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
 *       Cancel an order with role-based permissions:
 *
 *       - **Customers:** Can only cancel their own orders
 *       - **Riders:** Can cancel orders assigned to them
 *       - **Owners:** Can cancel any order in their organization
 *
 *       **Permissions:** `customer`, `owner`, or `rider` role
 *
 *       **Status Restrictions:** Only orders with status "pending", "assigned", or "rider_accepted" can be cancelled.
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["customer", "owner", "rider"])` - Verifies user has appropriate role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *         examples:
 *           Cannot cancel:
 *             value:
 *               success: false
 *               message: "Order cannot be cancelled in its current state"
 *           Rider permission:
 *             value:
 *               success: false
 *               message: "You can only cancel orders assigned to you"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/OrderNotFoundError'
 */

/**
 * @swagger
 * /orders/{orderId}/accept:
 *   post:
 *     tags: [Orders]
 *     summary: Rider accept order
 *     description: |
 *       Rider accepts an assigned order and provides current location.
 *
 *       **Permissions:** `rider` role in current organization
 *       **Order Status:** Must be "assigned"
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["rider"])` - Verifies user is rider in org context
 *
 *       **Actions:**
 *       1. Updates order status to "rider_accepted"
 *       2. Sets rider's current location in order
 *       3. Updates rider's location in user profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
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
 *         examples:
 *           Location required:
 *             value:
 *               success: false
 *               message: "Current location is required"
 *           Order not assigned:
 *             value:
 *               success: false
 *               message: "Order not found or not assigned to this rider"
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
 *       Customer sets their delivery location after rider has accepted.
 *
 *       **Permissions:** `customer` role (global, no org context)
 *       **Order Status:** Must be "rider_accepted"
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["customer"])` - Verifies user is customer
 *
 *       **Note:** No organization context required for customers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
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
 *         examples:
 *           Validation errors:
 *             value:
 *               success: false
 *               message: "Location label is required"
 *           Rider not accepted:
 *             value:
 *               success: false
 *               message: "Order not found or rider hasn't accepted yet"
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
 *
 *       **Permissions:** `owner` role in current organization
 *       **Order Status:** Must be "rider_accepted"
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["owner"])` - Verifies user is owner in org context
 *
 *       **Flow:**
 *       1. Validates location label exists in customer's saved locations
 *       2. Uses precise location from customer's saved data
 *       3. Updates order status to "customer_location_set"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
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
 *         examples:
 *           Label required:
 *             value:
 *               success: false
 *               message: "Location label is required"
 *           Label not found:
 *             value:
 *               success: false
 *               message: "Location label not found in customer's saved locations"
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
 *
 *       **Permissions:** `owner` role in current organization
 *
 *       **Purpose:** Used by owners to see available location labels when setting customer location.
 *
 *       **Middleware Chain:**
 *       1. `authenticateToken` - Validates JWT token
 *       2. `authorizeRole(["owner"])` - Verifies user is owner in org context
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
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
