import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import parseCookie from "cookie-parser";
import helmet from "helmet";

import getLogger from "@/lib/logger";
import { getBuildInfo } from "@/lib/buildInfo";
import { errorHandler } from "@/middleware/error-handler";
import routes from "@/routes/index";

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
app.use(cors());

// Apply JSON parsing middleware to all routes except file upload routes
app.use((req, res, next) => {
  if (
    req.path === "/api/v2/upload-json-report" ||
    req.path === "/api/v2/upload-json-report-api-key" ||
    req.path === "/api/v2/upload-ctrf-report" ||
    req.path === "/api/v2/upload-ctrf-report-api-key"
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

app.listen(PORT, () => {
  const buildInfo = getBuildInfo();
  logger.info(
    `${buildInfo.name} backend started version=${buildInfo.version} build=${buildInfo.buildHash} time=${buildInfo.buildTime} env=${buildInfo.env}`,
  );
  console.log(`Running on Port ${PORT}`);
});
