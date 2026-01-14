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
 *           example: owner@company.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: password123
 *         name:
 *           type: string
 *           example: John Doe
 *         businessName:
 *           type: string
 *           example: Acme Logistics
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
 *           example: customer@email.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: password123
 *         name:
 *           type: string
 *           example: Jane Smith
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
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
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
 *           example: rider@company.com
 *         riderName:
 *           type: string
 *           example: Mike Johnson
 *
 *     CreateCustomer:
 *       type: object
 *       required:
 *         - customerEmail
 *       properties:
 *         customerEmail:
 *           type: string
 *           format: email
 *           example: customer@company.com
 *         customerName:
 *           type: string
 *           example: Sarah Wilson
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
 *           example: newpassword123
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
 *           example: newpassword123
 *         name:
 *           type: string
 *           example: Sarah Wilson
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
 *           example: user@example.com
 *         otp:
 *           type: string
 *           example: 123456
 *
 *     ResendOTP:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *
 *     UpdateProfile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           nullable: true
 *           example: John Smith
 *         email:
 *           type: string
 *           format: email
 *           example: newemail@example.com
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *           nullable: true
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
 *           example: oldpassword123
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: newpassword456
 *
 *     ForgotPassword:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
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
 *           example: user@example.com
 *         otp:
 *           type: string
 *           example: 654321
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: newsecurepassword
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
 *         role:
 *           type: string
 *           enum: [owner, rider, customer]
 *         emailVerified:
 *           type: boolean
 *         registrationCompleted:
 *           type: boolean
 *         phoneNumber:
 *           type: string
 *           nullable: true
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
 *         joinedAt:
 *           type: string
 *           format: date-time
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Login successful
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
 *                   example: owner
 *                 emailVerified:
 *                   type: boolean
 *                 registrationCompleted:
 *                   type: boolean
 *                 phoneNumber:
 *                   type: string
 *                   nullable: true
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
 *           example: Business registration successful
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
 *                   example: owner
 *                 emailVerified:
 *                   type: boolean
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
 *     RiderCreationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Rider invitation sent successfully
 *         data:
 *           type: object
 *           properties:
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
 *             token:
 *               type: string
 *               description: Registration/invitation token (for testing)
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error description
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
 *       - Organization is created with the provided business name
 *       - User is added to user_organizations as owner of the new org
 *       - JWT token will include organizations array
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
 *       - Do NOT belong to any organization (no entry in user_organizations)
 *       - Are independent users who can order from multiple businesses
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer registration successful. Please check your email for OTP to verify your account.
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
 *                       example: customer
 *                     emailVerified:
 *                       type: boolean
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
 *               example: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
 *       400:
 *         description: Bad request
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
 *     description: Public endpoint - No authentication required
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
 *                   example: Email verified successfully. You can now login.
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
 *                   example: New OTP sent to your email.
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
 *                   example: Token refreshed successfully
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
 *                   example: If an account exists with this email, you will receive a password reset OTP.
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
 *                   example: Password reset successful. You can now login with your new password.
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
 *                   example: Logged out successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
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
 *                   example: Profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     description: Protected endpoint - Requires valid JWT token
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
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     locationLabel:
 *                       type: string
 *                       nullable: true
 *                     preciseLocation:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
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
 *                   example: Password updated successfully
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
 *          - Sends registration link with orgId in token
 *          - On completion, adds rider to user_organizations
 *
 *       2. **Existing Rider (invitation)**:
 *          - Rider exists but not in this organization
 *          - Sends invitation to join organization
 *          - On acceptance, adds rider to user_organizations
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
 *       3. Adds user to user_organizations for the specified orgId
 *       4. Sends OTP for email verification
 *
 *       Note: Rider's global role becomes "rider"
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
 *                   example: Registration completed. Please check your email for OTP to verify your account.
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
 *                       example: rider
 *                     emailVerified:
 *                       type: boolean
 *                     registrationCompleted:
 *                       type: boolean
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
 *       2. Adds user to user_organizations for the new organization
 *       3. User can now work with multiple organizations
 *
 *       Note: User's global role remains "rider"
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
 *                   example: Invitation accepted successfully. You are now part of the organization.
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
 *                       example: rider
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
 *       2. Sends registration link WITHOUT orgId in token
 *       3. Customer completes registration independently
 *       4. Customer can order from any business later
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer registration link sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     emailSent:
 *                       type: boolean
 *                       example: true
 *                     token:
 *                       type: string
 *                       description: Registration token (for testing)
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
 *       2. Sets password and optional name
 *       3. Sends OTP for email verification
 *       4. Returns access token for immediate login
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
 *                   example: Registration completed. Please check your email for OTP to verify your account.
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
 *                       example: customer
 *                     emailVerified:
 *                       type: boolean
 *                     registrationCompleted:
 *                       type: boolean
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
