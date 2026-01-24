import express from "express";

const router = express.Router();

import { userController } from "../controllers/user.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

router.post("/fcm-token", authenticateToken, userController.updateFcmToken);
router.delete("/fcm-token", authenticateToken, userController.removeFcmToken);

export const userRoutes = router;
