/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & user management
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
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
 *     ResendOTP:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
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
 *     CompleteRiderRegistrationViaToken:
 *       type: object
 *       required:
 *         - token
 *         - password
 *         - phoneNumber
 *       properties:
 *         token:
 *           type: string
 *           description: Registration token from email
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: newpassword123
 *         phoneNumber:
 *           type: string
 *           example: "+1234567890"
 *     AcceptInvitation:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Invitation token from email
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *     CompleteCustomerRegistrationViaToken:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Registration token from email
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
 *     ForgotPassword:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
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
 *     RefreshToken:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token (can also be sent as cookie)
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
 *         orgId:
 *           type: string
 *           format: uuid
 *           nullable: true
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
 *               $ref: '#/components/schemas/UserProfile'
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *             expiresIn:
 *               type: integer
 *               description: Access token expiry in seconds
 *               example: 604800
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error description
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
 */

/**
 * @swagger
 * /api/auth/register/business:
 *   post:
 *     summary: Register a business owner
 *     tags: [Auth]
 *     description: Public endpoint - No authentication required
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Business registration successful. Please check your email for OTP to verify your account.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         orgId:
 *                           type: string
 *                           format: uuid
 *                         emailVerified:
 *                           type: boolean
 *                         otp:
 *                           type: string
 *                           description: OTP for email verification (only for testing)
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
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
 *     description: Public endpoint - No authentication required
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
 *     description: Public endpoint - No authentication required
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
 *     description: Public endpoint - Requires refresh token (sent via body or cookie)
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
 *     description: Protected endpoint - Requires valid JWT token
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
 *                   example: Profile updated successfully
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
 *       Protected endpoint - Requires owner role with valid JWT token.
 *       Creates a rider account with registration/invitation flow.
 *       - If rider email doesn't exist: Sends registration link
 *       - If rider exists in another org: Sends invitation to join
 *       - If rider exists in same org: Updates and sends registration link
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Rider invitation sent successfully
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
 *                     emailType:
 *                       type: string
 *                       enum: [registration, invitation]
 *                     token:
 *                       type: string
 *                       description: Registration/invitation token (for testing)
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
 *       Public endpoint - No authentication required.
 *       Complete rider registration using token from email.
 *       Sets password, phone number, and sends OTP for email verification.
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
 *                     orgId:
 *                       type: string
 *                       format: uuid
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
 *       Public endpoint - No authentication required.
 *       Accept invitation from existing rider to join a new organization.
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
 *                     orgId:
 *                       type: string
 *                       format: uuid
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
 *       Protected endpoint - Requires owner role with valid JWT token.
 *       Creates a customer account for the business.
 *       Sends registration link to customer's email.
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
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/auth/customer/complete-registration:
 *   post:
 *     summary: Complete customer registration via token (Public)
 *     tags: [Auth]
 *     description: |
 *       Public endpoint - No authentication required.
 *       Complete customer registration using token from email.
 *       Sets password, name (optional), and sends OTP for email verification.
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
