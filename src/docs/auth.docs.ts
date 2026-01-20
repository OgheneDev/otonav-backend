/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & user management with multi-organization support
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     # Basic Auth Schemas
 *     RegisterBusiness:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *         - businessName
 *         - phoneNumber
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "owner@company.com"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "password123"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         businessName:
 *           type: string
 *           example: "Acme Logistics"
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *
 *     RegisterCustomer:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *         - phoneNumber
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "customer@email.com"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "password123"
 *         name:
 *           type: string
 *           example: "Jane Smith"
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *
 *     # Login & Token Schemas
 *     Login:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "password123"
 *
 *     # Organization-based Schemas
 *     CreateRider:
 *       type: object
 *       required:
 *         - riderEmail
 *         - riderName
 *       properties:
 *         riderEmail:
 *           type: string
 *           format: email
 *           example: "rider@company.com"
 *         riderName:
 *           type: string
 *           example: "Mike Johnson"
 *
 *     CreateCustomer:
 *       type: object
 *       required:
 *         - customerEmail
 *       properties:
 *         customerEmail:
 *           type: string
 *           format: email
 *           example: "customer@company.com"
 *         customerName:
 *           type: string
 *           example: "Sarah Wilson"
 *           nullable: true
 *
 *     # Token-based Registration Schemas
 *     CompleteRiderRegistrationViaToken:
 *       type: object
 *       required:
 *         - token
 *         - password
 *         - phoneNumber
 *       properties:
 *         token:
 *           type: string
 *           description: Registration token from email (includes orgId)
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "newpassword123"
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *
 *     CompleteCustomerRegistrationViaToken:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Registration token from email (NO orgId for customers)
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "newpassword123"
 *         name:
 *           type: string
 *           example: "Sarah Wilson"
 *           nullable: true
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *           nullable: true
 *
 *     AcceptInvitation:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Invitation token for existing riders to join new organizations
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *     # Profile Image Schemas
 *     UpdateProfile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           nullable: true
 *           example: "John Smith"
 *         email:
 *           type: string
 *           format: email
 *           example: "newemail@example.com"
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *           nullable: true
 *         profileImage:
 *           type: string
 *           description: |
 *             Base64 encoded image string (data:image/[type];base64,...) or null to remove.
 *             Supported formats: jpeg, jpg, png, gif, webp.
 *             Max size: 5MB.
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
 *           nullable: true
 *         locations:
 *           type: array
 *           description: Replace all locations with new array
 *           items:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Home"
 *               preciseLocation:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *         addLocation:
 *           type: object
 *           description: Add a new location
 *           properties:
 *             label:
 *               type: string
 *               example: "Office"
 *             preciseLocation:
 *               type: string
 *               example: "456 Work Ave, City, Country"
 *         removeLocation:
 *           type: string
 *           description: Label or index of location to remove
 *           example: "Home"
 *         updateLocation:
 *           type: object
 *           description: Update location by index
 *           properties:
 *             index:
 *               type: integer
 *               example: 0
 *             label:
 *               type: string
 *               example: "Updated Home"
 *             preciseLocation:
 *               type: string
 *               example: "789 New St, City, Country"
 *
 *     # Invitation Management Schemas
 *     ResendRiderInvitation:
 *       type: object
 *       required:
 *         - riderId
 *       properties:
 *         riderId:
 *           type: string
 *           format: uuid
 *           description: ID of the rider with pending invitation
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     CancelRiderInvitation:
 *       type: object
 *       required:
 *         - riderId
 *       properties:
 *         riderId:
 *           type: string
 *           format: uuid
 *           description: ID of the rider with pending invitation
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     # Other Auth Schemas
 *     VerifyEmail:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           example: "123456"
 *
 *     ResendOTP:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *
 *     ChangePassword:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           example: "oldpassword123"
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "newpassword456"
 *
 *     ForgotPassword:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *
 *     ResetPassword:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - newPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           example: "654321"
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "newsecurepassword"
 *
 *     RefreshToken:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token (can also be sent as cookie)
 *
 *     # Response Schemas
 *     UserProfile:
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
 *         role:
 *           type: string
 *           enum: [owner, rider, customer]
 *         emailVerified:
 *           type: boolean
 *         registrationStatus:
 *           type: string
 *           enum: [pending, completed, cancelled, expired]
 *           description: Registration status (replaces registrationCompleted)
 *         isProfileComplete:
 *           type: boolean
 *           description: |
 *             Profile completion status:
 *             - For customers: true if they have at least one location saved
 *             - For riders/owners: true when registrationStatus is "completed"
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *         profileImage:
 *           type: string
 *           nullable: true
 *           description: Cloudinary URL for the user's profile image
 *           example: "https://res.cloudinary.com/cloudname/image/upload/v1234567890/profile_images/user123.jpg"
 *         locations:
 *           type: array
 *           description: Customer saved locations (only for customers)
 *           items:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               preciseLocation:
 *                 type: string
 *         currentLocation:
 *           type: string
 *           nullable: true
 *           description: For riders only - real-time location
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     OrganizationMembership:
 *       type: object
 *       properties:
 *         orgId:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [owner, rider]
 *         isActive:
 *           type: boolean
 *         registrationStatus:
 *           type: string
 *           enum: [pending, completed, cancelled, expired]
 *         invitedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: "owner"
 *                 emailVerified:
 *                   type: boolean
 *                 registrationStatus:
 *                   type: string
 *                   example: "completed"
 *                 isProfileComplete:
 *                   type: boolean
 *                   description: Profile completion status
 *                 phoneNumber:
 *                   type: string
 *                   nullable: true
 *                 profileImage:
 *                   type: string
 *                   nullable: true
 *                   description: User's profile image URL
 *                 locations:
 *                   type: array
 *                   description: Customer saved locations (only for customers)
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       preciseLocation:
 *                         type: string
 *                 currentLocation:
 *                   type: string
 *                   nullable: true
 *                   description: Rider current location (only for riders)
 *                 organizations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrganizationMembership'
 *                 defaultOrgId:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                   description: Present only if user has exactly one organization
 *                 defaultOrgRole:
 *                   type: string
 *                   nullable: true
 *                   description: Role in the default organization
 *             accessToken:
 *               type: string
 *               description: JWT access token with organizations array
 *             expiresIn:
 *               type: integer
 *               description: Access token expiry in seconds
 *               example: 604800
 *
 *     BusinessRegistrationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Business registration successful. Please check your email for OTP to verify your account."
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: "owner"
 *                 emailVerified:
 *                   type: boolean
 *                 registrationStatus:
 *                   type: string
 *                   enum: [pending, completed, cancelled, expired]
 *                 isProfileComplete:
 *                   type: boolean
 *                   description: Profile completion status
 *                 otp:
 *                   type: string
 *                   description: OTP for email verification (testing only)
 *             organization:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *
 *     CustomerRegistrationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Customer registration successful. Please check your email for OTP to verify your account."
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               format: email
 *             name:
 *               type: string
 *             role:
 *               type: string
 *               example: "customer"
 *             emailVerified:
 *               type: boolean
 *             registrationStatus:
 *               type: string
 *               enum: [pending, completed, cancelled, expired]
 *             isProfileComplete:
 *               type: boolean
 *               description: Profile completion status
 *             otp:
 *               type: string
 *               description: OTP for email verification (only for testing)
 *
 *     RiderCreationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Rider invitation sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               nullable: true
 *               description: Only for new riders, null for existing riders
 *             email:
 *               type: string
 *               format: email
 *             name:
 *               type: string
 *             emailSent:
 *               type: boolean
 *               example: true
 *             emailType:
 *               type: string
 *               enum: [registration, invitation]
 *               description: |
 *                 registration: New rider needs to complete registration
 *                 invitation: Existing rider invited to join organization
 *             status:
 *               type: string
 *               enum: [pending, completed, cancelled, expired]
 *               example: "pending"
 *             token:
 *               type: string
 *               description: Registration/invitation token (for testing)
 *             registrationLink:
 *               type: string
 *               nullable: true
 *               description: Only for registration type
 *             invitationLink:
 *               type: string
 *               nullable: true
 *               description: Only for invitation type
 *
 *     InvitationManagementResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Invitation resent successfully"
 *         emailType:
 *           type: string
 *           enum: [registration, invitation]
 *           description: Type of email sent
 *
 *     CustomerCreationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Customer registration link sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               format: email
 *             name:
 *               type: string
 *               nullable: true
 *             emailSent:
 *               type: boolean
 *               example: true
 *             status:
 *               type: string
 *               enum: [pending, completed, cancelled, expired]
 *               example: "pending"
 *             token:
 *               type: string
 *               description: Registration token (for testing)
 *             registrationLink:
 *               type: string
 *               description: Registration link for customer
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description"
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
 *     NoOrgContextError:
 *       description: User token does not have organization context
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "Organization context is required"
 *     NotOrgMemberError:
 *       description: User is not a member of the current organization
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "You are not a member of this organization"
 *     NotOrgOwnerError:
 *       description: User is not an owner of the current organization
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "Only organization owners can perform this action"
 */

/**
 * @swagger
 * /api/auth/register/business:
 *   post:
 *     summary: Register a business owner
 *     tags: [Auth]
 *     description: |
 *       Creates a business owner account and their first organization.
 *       - User is created with global role "owner"
 *       - User has registrationStatus "pending" until email verification
 *       - Organization is created with the provided business name
 *       - User is added to user_organizations as owner of the new org
 *       - JWT token will include organizations array
 *       - isProfileComplete will be false initially
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBusiness'
 *     responses:
 *       200:
 *         description: Business registered successfully. OTP sent for email verification.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessRegistrationResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/register/customer:
 *   post:
 *     summary: Register a customer (Public registration)
 *     tags: [Auth]
 *     description: |
 *       Public customer registration. Customers:
 *       - Have global role "customer"
 *       - Have registrationStatus "pending" until email verification
 *       - Do NOT belong to any organization (no entry in user_organizations)
 *       - Are independent users who can order from multiple businesses
 *       - isProfileComplete will be false until they add at least one location
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCustomer'
 *     responses:
 *       200:
 *         description: Customer registered successfully. OTP sent for email verification.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerRegistrationResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     description: |
 *       Authenticates user and returns JWT token with organizations array.
 *       Token includes:
 *       - userId, email, role (global role)
 *       - orgId (if user has exactly one organization)
 *       - organizations array (list of all org memberships)
 *       Response includes user's organizations for UI to show organization switcher
 *       Response includes isProfileComplete field based on user role:
 *       - Customers: true if they have at least one saved location
 *       - Riders/Owners: true when registrationStatus is "completed"
 *       Response includes profileImage URL if user has uploaded one
 *
 *       **Important**: If email is not verified, a new OTP will be sent and login will fail.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Email not verified (new OTP sent)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     description: |
 *       Public endpoint - No authentication required
 *       Verifies email and updates registrationStatus to "completed"
 *       Clears OTP from database after successful verification
 *       Note: isProfileComplete status may remain false for customers without locations
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmail'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully. You can now login."
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend verification OTP
 *     tags: [Auth]
 *     description: Public endpoint - No authentication required
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOTP'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "New OTP sent to your email."
 *                 otp:
 *                   type: string
 *                   description: OTP code (only in development environment)
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     description: |
 *       Refreshes access token using refresh token.
 *       New token will include updated organizations array.
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 604800
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     description: Public endpoint - No authentication required
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPassword'
 *     responses:
 *       200:
 *         description: OTP sent if account exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If an account exists with this email, you will receive a password reset OTP."
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Auth]
 *     description: Public endpoint - No authentication required
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successful. You can now login with your new password."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     description: Protected endpoint - Requires valid JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     description: |
 *       Protected endpoint - Returns user profile WITHOUT organizations.
 *       Use separate organization endpoints to get user's organizations.
 *       Returns different data based on user role:
 *       - Customers: locations array
 *       - Riders: currentLocation
 *       - Owners: neither location field
 *       Always includes isProfileComplete and profileImage fields
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile (including profile image)
 *     tags: [Auth]
 *     description: |
 *       Protected endpoint - Requires valid JWT token
 *       Supports profile image upload, location management, and profile updates.
 *
 *       **Profile Images**:
 *       - Accepts base64 encoded image strings (data:image/[type];base64,...)
 *       - Supported formats: jpeg, jpg, png, gif, webp
 *       - Max size: 5MB
 *       - Set to null to remove profile image
 *       - Images are uploaded to Cloudinary and optimized (400x400, face detection)
 *       - Old images are automatically deleted when uploading new ones
 *
 *       **Location Management**:
 *       - Replace all locations with new array
 *       - Add a new location (validates unique label)
 *       - Remove location by index or label
 *       - Update location by index
 *
 *       **Important**: When updating locations for customers, isProfileComplete is automatically updated:
 *       - Set to true if customer has at least one location
 *       - Set to false if customer has no locations
 *
 *       If email is changed, sends verification OTP and sets emailVerified to false
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfile'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                       nullable: true
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     profileImage:
 *                       type: string
 *                       nullable: true
 *                       description: Updated profile image URL
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           preciseLocation:
 *                             type: string
 *                     currentLocation:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     registrationStatus:
 *                       type: string
 *                       enum: [pending, completed, cancelled, expired]
 *                     isProfileComplete:
 *                       type: boolean
 *                       description: Profile completion status
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     description: Protected endpoint - Requires valid JWT token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/rider/create:
 *   post:
 *     summary: Create a rider account (Owner only)
 *     tags: [Auth]
 *     description: |
 *       **REQUIRES ORGANIZATION CONTEXT**
 *
 *       Creates a rider account for the current organization.
 *       Two possible flows:
 *
 *       1. **New Rider (registration)**:
 *          - Rider doesn't exist in system
 *          - Creates account with temporary password
 *          - Sets registrationStatus to "pending"
 *          - Sends registration link with orgId in token
 *          - On completion, adds rider to user_organizations
 *
 *       2. **Existing Rider (invitation)**:
 *          - Rider exists but not in this organization
 *          - Sends invitation to join organization
 *          - Creates pending membership in user_organizations
 *          - On acceptance, updates registrationStatus to "completed"
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgContext - Token has orgId
 *       3. requireOrgMember - User belongs to this org
 *       4. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRider'
 *     responses:
 *       200:
 *         description: Rider invitation/registration sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RiderCreationResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: |
 *           Forbidden - User doesn't have required permissions.
 *           Possible reasons:
 *           - User token doesn't have orgId (NoOrgContextError)
 *           - User is not a member of the organization (NotOrgMemberError)
 *           - User is not an owner of the organization (NotOrgOwnerError)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/rider/resend-invitation:
 *   post:
 *     summary: Resend rider invitation (Owner only)
 *     tags: [Auth]
 *     description: |
 *       **REQUIRES ORGANIZATION CONTEXT**
 *
 *       Resends invitation/registration email to rider with pending status.
 *       Determines email type based on rider's registration status.
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgContext - Token has orgId
 *       3. requireOrgMember - User belongs to this org
 *       4. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendRiderInvitation'
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationManagementResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/auth/rider/cancel-invitation:
 *   post:
 *     summary: Cancel rider invitation (Owner only)
 *     tags: [Auth]
 *     description: |
 *       **REQUIRES ORGANIZATION CONTEXT**
 *
 *       Cancels pending rider invitation.
 *       Removes user from user_organizations.
 *       If user has no other organization memberships and is unverified, deletes user.
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgContext - Token has orgId
 *       3. requireOrgMember - User belongs to this org
 *       4. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelRiderInvitation'
 *     responses:
 *       200:
 *         description: Invitation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Invitation cancelled successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/auth/rider/complete-registration:
 *   post:
 *     summary: Complete rider registration via token (Public)
 *     tags: [Auth]
 *     description: |
 *       **PUBLIC ENDPOINT** - No authentication required
 *
 *       Completes rider registration using token from email.
 *       Token includes orgId, so rider is automatically added to the organization.
 *
 *       Steps:
 *       1. Validates registration token (includes email, orgId, role=rider)
 *       2. Sets password and phone number
 *       3. Updates registrationStatus to "completed" in user_organizations
 *       4. Sends OTP for email verification
 *
 *       Note: Rider's global role becomes "rider"
 *       Note: isProfileComplete will be true (registrationStatus = completed for non-customers)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteRiderRegistrationViaToken'
 *     responses:
 *       200:
 *         description: Registration completed. OTP sent for email verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration completed. Please check your email for OTP to verify your account."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: "rider"
 *                     emailVerified:
 *                       type: boolean
 *                     registrationStatus:
 *                       type: string
 *                       enum: [pending, completed, cancelled, expired]
 *                     isProfileComplete:
 *                       type: boolean
 *                       description: Profile completion status (true for riders when registration is completed)
 *                     otp:
 *                       type: string
 *                       description: OTP for email verification (only for testing)
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/invitation/accept:
 *   post:
 *     summary: Accept invitation to join organization (Public)
 *     tags: [Auth]
 *     description: |
 *       **PUBLIC ENDPOINT** - No authentication required
 *
 *       Allows existing riders to join new organizations via invitation.
 *       Token includes orgId, email, and role=rider.
 *
 *       Steps:
 *       1. Validates invitation token
 *       2. Updates registrationStatus to "completed" in user_organizations
 *       3. User can now work with multiple organizations
 *
 *       Note: User's global role remains "rider"
 *       Note: isProfileComplete remains unchanged (true if previously completed)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcceptInvitation'
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Invitation accepted successfully. You are now part of the organization."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: "rider"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/customer/create:
 *   post:
 *     summary: Create a customer account (Owner only)
 *     tags: [Auth]
 *     description: |
 *       **REQUIRES ORGANIZATION CONTEXT**
 *
 *       Business owners can create customer accounts for their business.
 *       Customers are NOT added to user_organizations - they remain independent.
 *
 *       Flow:
 *       1. Creates customer account with temporary password
 *       2. Sets registrationStatus to "pending" and isProfileComplete to false
 *       3. Sends registration link WITHOUT orgId in token
 *       4. Customer completes registration independently
 *       5. Customer can order from any business later
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgContext - Token has orgId
 *       3. requireOrgMember - User belongs to this org
 *       4. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomer'
 *     responses:
 *       200:
 *         description: Customer registration link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerCreationResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: |
 *           Forbidden - User doesn't have required permissions.
 *           Possible reasons:
 *           - User token doesn't have orgId (NoOrgContextError)
 *           - User is not a member of the organization (NotOrgMemberError)
 *           - User is not an owner of the organization (NotOrgOwnerError)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/customer/complete-registration:
 *   post:
 *     summary: Complete customer registration via token (Public)
 *     tags: [Auth]
 *     description: |
 *       **PUBLIC ENDPOINT** - No authentication required
 *
 *       Completes customer registration using token from email.
 *       Token does NOT include orgId - customers are independent users.
 *
 *       Steps:
 *       1. Validates registration token (includes email, role=customer, NO orgId)
 *       2. Sets password and optional name/phoneNumber
 *       3. Updates registrationStatus to "completed"
 *       4. Sets isProfileComplete to false (until they add locations)
 *       5. Sends OTP for email verification
 *
 *       Note: Customer's global role is "customer"
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteCustomerRegistrationViaToken'
 *     responses:
 *       200:
 *         description: Registration completed. OTP sent for email verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration completed. Please check your email for OTP to verify your account."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       example: "customer"
 *                     emailVerified:
 *                       type: boolean
 *                     registrationStatus:
 *                       type: string
 *                       enum: [pending, completed, cancelled, expired]
 *                     isProfileComplete:
 *                       type: boolean
 *                       description: Profile completion status (false until locations are added)
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     otp:
 *                       type: string
 *                       description: OTP for email verification (only for testing)
 *                     token:
 *                       type: string
 *                       description: Access token for immediate login
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/customer/resend-registration-link:
 *   post:
 *     summary: Resend customer registration link (Owner only)
 *     tags: [Auth]
 *     description: |
 *       **REQUIRES ORGANIZATION CONTEXT**
 *
 *       Resends registration link to customer with pending status.
 *       Only works for customers who are not yet verified.
 *
 *       **Middleware Chain:**
 *       1. authenticateToken - Valid JWT
 *       2. requireOrgContext - Token has orgId
 *       3. requireOrgMember - User belongs to this org
 *       4. requireOrgOwner - User is owner in this org
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the customer with pending registration
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Registration link resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration link resent to customer@email.com"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
