import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import parseCookie from "cookie-parser";

import getLogger from "@/lib/logger";
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
app.use(cors());
app.use(express.json());

app.use(parseCookie());
app.use(loggingMiddleware);

app.use("/api", routes);

app.use(errorHandler);

const PORT: number = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`Running on Port ${PORT}`);
});
