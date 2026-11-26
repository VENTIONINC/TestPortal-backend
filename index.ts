import dotenv from "dotenv";
dotenv.config();
import { initializeAiConfig } from "@/config/aiConfig";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import parseCookie from "cookie-parser";
import helmet from "helmet";

import getLogger from "@/lib/logger";
import { publicJsonReplacer } from "@/lib/jsonPayloads";
import { errorHandler } from "@/middleware/error-handler";
import { jsonBodyParser } from "@/middleware/json-body";
import routes from "@/routes/index";

await initializeAiConfig();

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
app.set("json replacer", publicJsonReplacer);
app.use(helmet());
app.use(cors());

app.use(jsonBodyParser);

app.use(parseCookie());
app.use(loggingMiddleware);

app.use("/api", routes);

app.use(errorHandler);

const PORT: number = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`Running on Port ${PORT}`);
});
