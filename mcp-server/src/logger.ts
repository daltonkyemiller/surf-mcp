import winston from "winston";
import { join } from "node:path";

function getLogPath() {
  return join(import.meta.dir, "../", Bun.env.LOGS_PATH || "./logs");
}

const LOGS_PATH = getLogPath();

const formatter = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.splat(),
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${level}: ${message} ${timestamp ? `[${timestamp}]` : ""}`;
  }),
);

function getLogFileName(name: string) {
  return Bun.env.LOGS_PREFIX ? `${Bun.env.LOGS_PREFIX}.${name}` : name;
}

const log = winston.createLogger({
  level: Bun.env.LOG_LEVEL || "info",
  format: formatter,
  transports: [
    new winston.transports.Console({
      format: formatter,
    }),
    new winston.transports.File({
      filename: join(LOGS_PATH, getLogFileName("debug.log")),
      level: "debug",
    }),
    new winston.transports.File({
      filename: join(LOGS_PATH, getLogFileName("error.log")),
      level: "error",
    }),
  ],
});

export default log;
