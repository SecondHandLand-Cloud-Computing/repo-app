/* eslint n/no-process-exit: "off" */
import http from "http";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { startOrderWorker } from "./workers/order.worker.js";

const bootstrap = async () => {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  startOrderWorker().catch((err) => {
    logger.error(`[RabbitMQ] Failed to start order worker: ${err.message}`);
  });

  const shutdown = async (signal) => {
    try {
      logger.warn(`Received ${signal}. Closing server...`);

      // Close the HTTP server
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info("HTTP server closed");

      await disconnectDB();

      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

bootstrap().catch((err) => {
  logger.error("Fatal bootstrap error:", err);
  process.exit(1);
});
