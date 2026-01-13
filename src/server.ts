import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

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

// Request timing and timeout logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.requestId = requestId;
  req.startTime = startTime;

  console.log(`[${requestId}] 🔵 START: ${req.method} ${req.path}`);

  // Log when response finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${requestId}] ✅ FINISH: ${req.method} ${req.path} - ${duration}ms - Status: ${res.statusCode}`
    );
  });

  // Log when response closes (client disconnected)
  res.on("close", () => {
    const duration = Date.now() - startTime;
    if (!res.writableEnded) {
      console.log(
        `[${requestId}] ⚠️  CLOSED: ${req.method} ${req.path} - ${duration}ms - Client disconnected before response completed`
      );
    }
  });

  next();
});

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
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
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📍 http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
📅 ${new Date().toISOString()}
⏱️  Server timeout: ${120000}ms (2 minutes)
⏱️  Keep-alive timeout: ${125000}ms
⏱️  Headers timeout: ${130000}ms
  `);
});

// Set server timeout (in milliseconds)
// 2 minutes = 120000ms
server.timeout = 120000;

// Optional: Set keep-alive timeout (should be higher than timeout)
server.keepAliveTimeout = 125000;

// Optional: Set headers timeout (should be higher than keepAliveTimeout)
server.headersTimeout = 130000;

// Log timeout events
server.on("timeout", (socket) => {
  console.error(
    `🔴 SERVER TIMEOUT: Socket timed out after ${server.timeout}ms`
  );
  console.error(
    `   Remote address: ${socket.remoteAddress}:${socket.remotePort}`
  );
  console.error(`   Local address: ${socket.localAddress}:${socket.localPort}`);
});

// Log when connections are established
server.on("connection", (socket) => {
  const connectionId = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(
    `[${connectionId}] 🔌 New connection from ${socket.remoteAddress}:${socket.remotePort}`
  );

  socket.on("timeout", () => {
    console.error(`[${connectionId}] ⏱️  Socket timeout detected`);
  });

  socket.on("error", (err) => {
    console.error(`[${connectionId}] ❌ Socket error:`, err.message);
  });

  socket.on("close", (hadError) => {
    console.log(
      `[${connectionId}] 🔌 Connection closed ${
        hadError ? "with error" : "cleanly"
      }`
    );
  });
});

// Log server errors
server.on("error", (err) => {
  console.error("🔴 SERVER ERROR:", err);
});
