import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.routes.js";
import { riderRoutes } from "./routes/rider.routes.js";
import { customerRoutes } from "./routes/customer.routes.js";
import { organizationRoutes } from "./routes/organization.routes.js";
import { orderRoutes } from "./routes/order.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import http from "http";
import { LocationWebSocketServer } from "./websocket/location.server.js";
//import { devRouter } from "./routes/dev.routes.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "https://otonav.vercel.app",
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.requestId = requestId;
  req.startTime = startTime;

  console.log(`[${requestId}] 🔵 START: ${req.method} ${req.path}`);

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${requestId}] ✅ FINISH: ${req.method} ${req.path} - ${duration}ms - Status: ${res.statusCode}`,
    );
  });

  res.on("close", () => {
    const duration = Date.now() - startTime;
    if (!res.writableEnded) {
      console.log(
        `[${requestId}] ⚠️  CLOSED: ${req.method} ${req.path} - ${duration}ms - Client disconnected before response completed`,
      );
    }
  });

  next();
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/organizations", organizationRoutes);
//app.use("/dev", devRouter);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

const locationWSS = new LocationWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📍 HTTP: http://localhost:${PORT}
📍 WebSocket: ws://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
📅 ${new Date().toISOString()}
⏱️  Server timeout: ${120000}ms (2 minutes)
⏱️  Keep-alive timeout: ${125000}ms
⏱️  Headers timeout: ${130000}ms
  `);
});

server.timeout = 120000;
server.keepAliveTimeout = 125000;
server.headersTimeout = 130000;

server.on("timeout", (socket) => {
  console.error(
    `🔴 SERVER TIMEOUT: Socket timed out after ${server.timeout}ms`,
  );
  console.error(
    `   Remote address: ${socket.remoteAddress}:${socket.remotePort}`,
  );
  console.error(`   Local address: ${socket.localAddress}:${socket.localPort}`);
});

server.on("connection", (socket) => {
  const connectionId = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(
    `[${connectionId}] 🔌 New connection from ${socket.remoteAddress}:${socket.remotePort}`,
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
      }`,
    );
  });
});

server.on("error", (err) => {
  console.error("🔴 SERVER ERROR:", err);
});

export { locationWSS };
