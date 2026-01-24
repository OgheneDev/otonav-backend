/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and push notification setup
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FCMTokenRequest:
 *       type: object
 *       required:
 *         - fcmToken
 *       properties:
 *         fcmToken:
 *           type: string
 *           description: Firebase Cloud Messaging token from mobile device
 *           example: "eJxVUm1v2zAM_SsGv7ZAbNmSZX0bsALd1g1Y..."
 *
 *     FCMTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "FCM token updated successfully"
 */

/**
 * @swagger
 * /users/fcm-token:
 *   post:
 *     tags: [Users]
 *     summary: Register FCM token for push notifications
 *     description: |
 *       Mobile app sends Firebase Cloud Messaging (FCM) token to enable push notifications.
 *
 *       **When to call:** Automatically after successful login in mobile app.
 *
 *       **Flow:**
 *       1. User logs into mobile app
 *       2. App gets FCM token from Firebase SDK
 *       3. App calls this endpoint to register token
 *       4. Backend saves token to user account
 *       5. User can now receive push notifications
 *
 *       **Notifications sent for:**
 *       - Order created/assigned
 *       - Rider accepts order
 *       - Customer sets location
 *       - Package picked up
 *       - Delivery started
 *       - Rider arrived
 *       - Delivery completed
 *       - Order cancelled
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FCMTokenRequest'
 *     responses:
 *       200:
 *         description: FCM token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FCMTokenResponse'
 *       400:
 *         description: FCM token is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "FCM token is required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to update FCM token"
 */

/**
 * @swagger
 * /users/fcm-token:
 *   delete:
 *     tags: [Users]
 *     summary: Remove FCM token (logout)
 *     description: |
 *       Remove FCM token from user account to stop receiving push notifications.
 *
 *       **When to call:** When user logs out of mobile app.
 *
 *       This ensures the user won't receive notifications on this device after logout.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FCM token removed successfully
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
 *                   example: "FCM token removed successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to remove FCM token"
 */
