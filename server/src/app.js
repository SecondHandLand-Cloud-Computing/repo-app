import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import testRoute from "./routes/test.routes.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/AppError.js";
import { metricsMiddleware } from "./middlewares/metrics.middleware.js";
import { metricsEndpoint } from "./routes/metrics.routes.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by"); // Security best practice
  app.use(helmet()); // Security headers
  app.use(cors({ origin: true, credentials: true })); // CORS (Tự động nhận diện và cho phép mọi tên miền từ S3)
  app.use(express.json({ limit: "1mb" })); // Body parser
  if (env.NODE_ENV !== "production") {
    app.use(morgan("dev")); // Logger
  }
  app.use(cookieParser()); // Cookie parser

  // metrics
  app.use(metricsMiddleware);

  // Endpoint để Prometheus scrape metrics
  app.get("/metrics", metricsEndpoint);

  // Health check endpoint cho AWS ALB
  app.get("/", (req, res) => res.status(200).send("OK"));

  // Routes
  app.use("/api", routes);
  app.use("/test", testRoute);
  // 404 handler
  app.use((_req, _res, next) => next(new AppError("Not Found", 404)));
  // Error handler
  app.use(errorHandler);

  return app;
};
