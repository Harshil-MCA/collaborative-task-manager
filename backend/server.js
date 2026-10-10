
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const advancedRoutes = require("./routes/advancedRoutes");

const app = express();

function allowedClientOrigins() {
  const configured = process.env.CLIENT_URL || "http://localhost:5173";
  const origins = new Set([configured]);
  if (configured === "http://localhost:5173") origins.add("http://127.0.0.1:5173");
  if (configured === "http://127.0.0.1:5173") origins.add("http://localhost:5173");
  return origins;
}

function isAllowedClientOrigin(origin) {
  if (!origin) return true;
  if (allowedClientOrigins().has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function validateRuntimeConfig(config = process.env) {
  if (!config.MONGODB_URI || !config.JWT_SECRET) {
    throw new Error("Missing MONGODB_URI or JWT_SECRET in backend/.env");
  }
}

app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedClientOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
  })
);

app.use(express.json({ limit: "20kb" }));

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  })
);

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { message: "Too many authentication requests; try again later" },
  })
);

// API home
app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API is running",
  });
});

// Database health check
app.get("/api/health", (req, res) => {
  res.json({
    api: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Authentication APIs
app.use("/api/auth", authRoutes);

// Project, sprint, development, QA, defect and release APIs.
app.use("/api", advancedRoutes);

// Task management APIs
app.use("/api/tasks", taskRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
  });
});

// Start server
async function startServer() {
  try {
    validateRuntimeConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully");

    const port = Number(process.env.PORT) || 5000;

    app.listen(port, () => {
      console.log(`TaskFlow API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  allowedClientOrigins,
  isAllowedClientOrigin,
  validateRuntimeConfig,
};
