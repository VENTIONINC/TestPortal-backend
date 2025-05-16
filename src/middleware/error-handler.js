import getLogger from '../lib/logger.js';

const logger = getLogger("server");

export const errorHandler = (err, req, res, next) => {
    logger.error(err.message);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || 500;

    return res.status(statusCode).send({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            status: statusCode,
        },
    });
};