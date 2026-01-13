import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS - Allow all origins (for development)
const corsOptions = {
  origin: "*", // Allow all origins
  credentials: true, // Allow cookies if needed
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

// Or even simpler - no options needed for basic CORS
// app.use(cors());

// Middleware
app.use(helmet());
app.use(cors(corsOptions)); // Or just app.use(cors()) for default settings
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📍 http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
📅 ${new Date().toISOString()}
  `);
});
