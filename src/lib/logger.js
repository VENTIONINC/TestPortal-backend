import { join } from "path";
import log4js from "log4js";
import { LOGS_DIR } from "../../path.config.js";

export default function getLogger(category) {
  log4js.configure({
    appenders: {
      file: {
        type: "file",
        filename: join(LOGS_DIR, "server.log"),
        maxLogSize: 1048576,
        backups: 1,
        compress: true,
      },
    },
    categories: {
      default: { appenders: ["file"], level: "trace" },
      server: { appenders: ["file"], level: "trace" },
    },
  });

  const logger = log4js.getLogger(category);
  // ALL < TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK < OFF
  logger.level = process.env.LOG_LEVEL;

  return logger;
}
