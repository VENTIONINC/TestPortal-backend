import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import parseCookie from "cookie-parser";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { dbClient } from "@/prisma/client";
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
app.use(
  session({
    secret: "qwerty@12345",
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: new PrismaSessionStore(dbClient as any, {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
    }),
  }),
);
app.use(parseCookie());
app.use(loggingMiddleware);

app.use("/api", routes);

app.use(errorHandler);

const PORT: number = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`Running on Port ${PORT}`);
});
