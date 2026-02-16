import express from "express";
import cors from "cors";
import session from "express-session";
import { config, validateConfig } from "./config";
import { connectDatabase } from "./prisma/client";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Import routes
import authRoutes from "./routes/auth.routes";
import clientRoutes from "./routes/client.routes";
import projectRoutes from "./routes/project.routes";
import timeEntryRoutes from "./routes/timeEntry.routes";
import timerRoutes from "./routes/timer.routes";

async function main() {
  // Validate configuration
  validateConfig();

  // Connect to database
  await connectDatabase();

  const app = express();

  // CORS
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session
  app.use(
    session({
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      name: "sessionId",
      cookie: {
        secure: false,
        httpOnly: false,
        maxAge: config.session.maxAge,
        sameSite: "lax",
      },
    }),
  );

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Routes
  app.use("/auth", authRoutes);
  app.use("/clients", clientRoutes);
  app.use("/projects", projectRoutes);
  app.use("/time-entries", timeEntryRoutes);
  app.use("/timer", timerRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start server
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
