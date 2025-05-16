import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from "cors";
import parseCookie from "cookie-parser";
import session from "express-session";
import {PrismaSessionStore} from '@quixo3/prisma-session-store';
import {dbClient} from "./prisma/client.js";
import routes from "./src/routes/index.js";
import getLogger from "./src/lib/logger.js";
import {errorHandler} from './src/middleware/error-handler.js';

const logger = getLogger('server');
const loggingMiddleware = (req, res, next) => {
    logger.info(`${req.method} - ${req.url}`);
    next();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'qwerty@12345',
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 60000 * 60,
    },
    store: new PrismaSessionStore(
        dbClient,
        {
            checkPeriod: 2 * 60 * 1000,  //ms
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }
    )
}));
app.use(parseCookie());
app.use(loggingMiddleware);
app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`);
});

