const express = require("express");
const cors = require("cors");
require("dotenv").config();
const logger = require("./utils/logger");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (moved after body parsing)
app.use((req, res, next) => {
  logger.api.request(req.method, req.path, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
});

app.use("/api/student", require("./routes/student"));
app.use("/api/scan", require("./routes/scan"));
app.use("/api/email", require("./routes/email"));
app.use("/api/analytics", require("./routes/analytics"));

app.get("/", (req, res) => {
  logger.api.response("GET", "/", 200, { message: "Health check" });
  res.send("✅ DeskBuddy backend is live");
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });
  logger.api.error(req.method, req.path, err, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  });
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error("Port is already in use", {
      port: PORT,
      error: error.message,
    });
    process.exit(1);
  } else {
    logger.error("Server error", { error: error.message, stack: error.stack });
  }
});

// Handle process termination
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated", { signal: "SIGTERM" });
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated", { signal: "SIGINT" });
    process.exit(0);
  });
});
