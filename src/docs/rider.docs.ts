/**
 * @swagger
 * tags:
 *   name: Riders
 *   description: Rider management within organizations
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Rider:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         email:
 *           type: string
 *           format: email
 *           example: "rider@example.com"
 *         name:
 *           type: string
 *           nullable: true
 *           example: "John Doe"
 *         globalRole:
 *           type: string
 *           example: "rider"
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           example: "+1234567890"
 *         emailVerified:
 *           type: boolean
 *           example: true
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         registrationCompleted:
 *           type: boolean
 *           nullable: true
 *         isActive:
 *           type: boolean
 *           example: true
 *           description: Global activity status (affects all organizations)
 *         orgMembership:
 *           type: object
 *           properties:
 *             orgId:
 *               type: string
 *               format: uuid
 *               example: "123e4567-e89b-12d3-a456-426614174000"
 *             orgName:
 *               type: string
 *               example: "Acme Logistics"
 *             role:
 *               type: string
 *               example: "rider"
 *             isActive:
 *               type: boolean
 *               example: true
 *               description: Organization-specific active status
 *             isSuspended:
 *               type: boolean
 *               example: false
 *             suspensionReason:
 *               type: string
 *               nullable: true
 *               example: "Violation of terms"
 *             suspensionExpires:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             joinedAt:
 *               type: string
 *               format: date-time
 *
 *     RiderSuspensionInput:
 *       type: object
 *       properties:
 *         reason:
 *           type: string
 *           example: "Violation of terms of service"
 *           nullable: true
 *         notes:
 *           type: string
 *           example: "Multiple customer complaints"
 *           nullable: true
 *         suspensionDurationDays:
 *           type: integer
 *           example: 30
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *
 *     RiderRemovalInput:
 *       type: object
 *       properties:
 *         reason:
 *           type: string
 *           example: "Organization restructuring"
 *           nullable: true
 *         notes:
 *           type: string
 *           example: "Position eliminated"
 *           nullable: true
 *
 *     RiderDeactivationInput:
 *       type: object
 *       properties:
 *         reason:
 *           type: string
 *           example: "Temporary leave"
 *           nullable: true
 *
 *     RiderToggleActivityResponse:
 *       type: object
 *       properties:
 *         isActive:
 *           type: boolean
 *           example: true
 *           description: New global activity status
 *         riderId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         affectedOrganizations:
 *           type: integer
 *           example: 3
 *           description: Number of organizations where the rider is active
 *
 *     RiderOrganizationsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               orgId:
 *                 type: string
 *                 format: uuid
 *               orgName:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isSuspended:
 *                 type: boolean
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         count:
 *           type: integer
 *           example: 2
 *
 *     RidersResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Rider'
 *         count:
 *           type: integer
 *           example: 5
 *         total:
 *           type: integer
 *           example: 7
 *
 *     SuspensionStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             riderId:
 *               type: string
 *               format: uuid
 *             orgId:
 *               type: string
 *               format: uuid
 *             isSuspended:
 *               type: boolean
 *
 *     OperationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Rider suspended successfully"
 *         data:
 *           $ref: '#/components/schemas/Rider'
 *
 *     ToggleActivityResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "You are now inactive across all organizations"
 *         data:
 *           $ref: '#/components/schemas/RiderToggleActivityResponse'
 *
 *     RemoveRiderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Rider successfully removed from organization"
 *         removedFromOrg:
 *           type: boolean
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
 *       description: User does not have permission to access this resource
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     RiderNotFoundError:
 *       description: Rider not found in the organization
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "Rider not found in this organization"
 *     RiderAlreadySuspendedError:
 *       description: Rider is already suspended
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "Rider is already suspended"
 *     RiderNotSuspendedError:
 *       description: Rider is not suspended
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "Rider is not suspended"
 */

/**
 * @swagger
 * /api/riders:
 *   get:
 *     summary: Get all riders in the organization
 *     tags: [Riders]
 *     description: |
 *       Returns all riders belonging to the current organization.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *
 *       **Query Parameters:**
 *       - `includeSuspended`: Include suspended riders (default: false)
 *       - `includeInactive`: Include deactivated riders (default: false)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeSuspended
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include suspended riders in results
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include deactivated riders in results
 *     responses:
 *       200:
 *         description: List of riders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RidersResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/riders/{riderId}:
 *   get:
 *     summary: Get a single rider by ID
 *     tags: [Riders]
 *     description: |
 *       Returns details of a specific rider in the current organization.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     responses:
 *       200:
 *         description: Rider details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Rider'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 */

/**
 * @swagger
 * /api/riders/{riderId}/organizations:
 *   get:
 *     summary: Get all organizations a rider belongs to
 *     tags: [Riders]
 *     description: |
 *       Returns all organizations that a rider is a member of.
 *       **ACCESS CONTROL:**
 *       - Organization owners can view any rider's organizations
 *       - Riders can view their own organizations
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to current org
 *       3. requireRiderAccess - Either owner OR the rider themselves
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     responses:
 *       200:
 *         description: Rider's organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RiderOrganizationsResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User doesn't have access to view this rider's organizations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/riders/{riderId}/suspend:
 *   post:
 *     summary: Suspend a rider
 *     tags: [Riders]
 *     description: |
 *       Suspends a rider from the organization for a specified duration.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Actions:**
 *       1. Sets isSuspended = true in user_organizations
 *       2. Records suspension reason and expiry date
 *       3. Sends email notification to rider
 *       4. Creates audit log
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *
 *       **Note:** Suspension only affects rider's relationship with this specific organization.
 *       Rider can still work with other organizations if they are a member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RiderSuspensionInput'
 *     responses:
 *       200:
 *         description: Rider suspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperationResponse'
 *       400:
 *         description: Bad request - Rider ID is required or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 *       409:
 *         $ref: '#/components/responses/RiderAlreadySuspendedError'
 */

/**
 * @swagger
 * /api/riders/{riderId}/unsuspend:
 *   post:
 *     summary: Unsuspend a rider
 *     tags: [Riders]
 *     description: |
 *       Removes suspension from a rider.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Actions:**
 *       1. Sets isSuspended = false in user_organizations
 *       2. Clears suspension reason and expiry date
 *       3. Creates audit log
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     responses:
 *       200:
 *         description: Rider unsuspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperationResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 *       409:
 *         $ref: '#/components/responses/RiderNotSuspendedError'
 */

/**
 * @swagger
 * /api/riders/{riderId}:
 *   delete:
 *     summary: Remove a rider from organization (hard delete)
 *     tags: [Riders]
 *     description: |
 *       **PERMANENTLY** removes a rider from the organization.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Actions:**
 *       1. Deletes row from user_organizations table
 *       2. Sends removal email to rider
 *       3. Creates audit log
 *
 *       **Important Notes:**
 *       - This does NOT delete the user's account
 *       - Rider can still work with other organizations
 *       - Rider's OtoNav account remains active
 *       - Use deactivate for temporary removal
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RiderRemovalInput'
 *     responses:
 *       200:
 *         description: Rider removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoveRiderResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 */

/**
 * @swagger
 * /api/riders/{riderId}/deactivate:
 *   post:
 *     summary: Deactivate a rider (soft removal)
 *     tags: [Riders]
 *     description: |
 *       Temporarily deactivates a rider in the organization.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Actions:**
 *       1. Sets isActive = false in user_organizations
 *       2. Creates audit log
 *
 *       **Differences from DELETE:**
 *       - Does not remove from user_organizations table
 *       - Can be reactivated later
 *       - Better for temporary leaves or probation
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RiderDeactivationInput'
 *     responses:
 *       200:
 *         description: Rider deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperationResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 */

/**
 * @swagger
 * /api/riders/{riderId}/reactivate:
 *   post:
 *     summary: Reactivate a rider
 *     tags: [Riders]
 *     description: |
 *       Reactivates a previously deactivated rider.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Actions:**
 *       1. Sets isActive = true in user_organizations
 *       2. Creates audit log
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     responses:
 *       200:
 *         description: Rider reactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperationResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/RiderNotFoundError'
 */

/**
 * @swagger
 * /api/riders/{riderId}/suspension-status:
 *   get:
 *     summary: Check if rider is suspended
 *     tags: [Riders]
 *     description: |
 *       Checks if a rider is suspended in the current organization.
 *       **REQUIRES OWNER ROLE**
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgMember - User belongs to this org
 *       3. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rider's user ID
 *     responses:
 *       200:
 *         description: Suspension status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuspensionStatusResponse'
 *       400:
 *         description: Bad request - Rider ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an owner of the organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Rider not found in organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/riders/toggle-activity:
 *   post:
 *     summary: Toggle rider's global activity status
 *     tags: [Riders]
 *     description: |
 *       Allows a rider to toggle their own global activity status.
 *       This affects ALL organizations the rider belongs to.
 *       **RIDER SELF-SERVICE ONLY**
 *
 *       **Actions:**
 *       1. Toggles isActive field in users table
 *       2. Creates audit log for each organization the rider belongs to
 *       3. Returns affected organization count
 *
 *       **Important Notes:**
 *       - This is a GLOBAL toggle - affects all organizations
 *       - Organization-specific deactivation is different (see /deactivate endpoint)
 *       - Riders use this to indicate they're "available" or "unavailable" globally
 *       - Does NOT affect suspension status
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. authorizeRole - Must be a rider
 *
 *       **Use Cases:**
 *       - Rider going on vacation/unavailable temporarily
 *       - Rider wants to pause work across all organizations
 *       - Quick availability toggle from mobile app
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ToggleActivityResponse'
 *             example:
 *               success: true
 *               message: "You are now inactive across all organizations"
 *               data:
 *                 isActive: false
 *                 riderId: "550e8400-e29b-41d4-a716-446655440000"
 *                 affectedOrganizations: 3
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not a rider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Rider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
