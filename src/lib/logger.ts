import log4js from "log4js";
import path from "path";
import { LOGS_DIR } from "@/root/path.config.js";

log4js.configure({
  appenders: {
    file: {
      type: "file",
      filename: path.join(LOGS_DIR, "server.log"),
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

export default function getLogger(category?: string): log4js.Logger {
  const logger = log4js.getLogger(category);
  // ALL < TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK < OFF
  logger.level = process.env.LOG_LEVEL as string;

  return logger;
}
