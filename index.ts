import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import parseCookie from "cookie-parser";
import helmet from "helmet";

import getLogger from "@/lib/logger";
import { errorHandler } from "@/middleware/error-handler";
import routes from "@/routes/index";
import {
  enforceMcpBetaOrigin,
  getMcpBetaAllowedOrigins,
  isMcpBetaPath,
} from "@/mcp/beta/originPolicy";
import { closeMcpBetaHandlers } from "@/mcp/beta/server";
import { closeMcpTransports } from "@/mcp/server";

getMcpBetaAllowedOrigins();

const logger = getLogger("server");
const loggingMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  logger.info(`${req.method} - ${req.url}`);
  next();
};

const app = express();
app.use(helmet());
app.use((req, res, next) => {
  if (isMcpBetaPath(req.path)) {
    enforceMcpBetaOrigin(req, res, next);
  } else {
    cors()(req, res, next);
  }
});

// Apply JSON parsing middleware to all routes except file upload routes
app.use((req, res, next) => {
  if (
    req.path === "/api/v2/upload-json-report" ||
    req.path === "/api/v2/upload-json-report-api-key" ||
    req.path === "/api/v2/upload-ctrf-report" ||
    req.path === "/api/v2/upload-ctrf-report-api-key" ||
    isMcpBetaPath(req.path)
  ) {
    // Skip JSON parsing for file upload routes
    next();
  } else {
    // Apply JSON parsing for all other routes
    express.json()(req, res, next);
  }
});

app.use(parseCookie());
app.use(loggingMiddleware);

app.use("/api", routes);

app.use(errorHandler);

const PORT: number = parseInt(process.env.PORT ?? "3001", 10);

const server = app.listen(PORT, () => {
  console.log(`Running on Port ${PORT}`);
});

let shuttingDown = false;
const shutdown = (): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  const forceShutdown = setTimeout(() => {
    logger.error("Graceful shutdown timed out; closing active HTTP connections");
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);

  const closeHttpServer = new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  void Promise.allSettled([
    closeHttpServer,
    closeMcpTransports(),
    closeMcpBetaHandlers(),
  ])
    .then((results) => {
      clearTimeout(forceShutdown);
      const failures = results.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );
      if (failures.length > 0) {
        logger.error(
          `Failed to complete application shutdown: ${failures.map(String).join("; ")}`,
        );
        process.exit(1);
      }
      process.exit(0);
    });
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

