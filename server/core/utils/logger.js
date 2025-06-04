const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const CircularJSON = require("circular-json");

const Transport = require("winston-transport");
const { getEventEmitter } = require("./event-emitter");
let eventEmitter = getEventEmitter();
class CustomTransport extends Transport {
  constructor(opts) {
    super(opts);
  }
  // for report error to handle
  log(info, callback) {
    callback();
    let type = info.level;

    if (type !== "error" && type !== "info") return;
    if (type === "info" && !process.env.LOG) return;

    setTimeout((_) => {
      eventEmitter.emit(
        "report",
        `${new Date().toISOString()}: ${
          process.env.RUN || process.env.NODE_ENV
        } ${info.message}`,
        type
      );
    }, 5000);

    // Perform the writing to the remote service
  }
}
// -------------------------------------
//      SETUP LOGGER with Winston
// -------------------------------------
// try to make some pretty output
const alignedWithColorsAndTime = winston.format.combine(
  winston.format.timestamp(),
  winston.format.prettyPrint(),
  winston.format.splat(),
  winston.format.printf((info) => {
    if (info.message && info.message.constructor === Object) {
      info.message = JSON.stringify(info.message, null, 2);
    }
    let { timestamp, level, message, ...args } = info;
    const ts = timestamp.slice(0, 23).replace("T", " ");
    const env = process.env.NODE_ENV;
    return `${ts} [${level}]: [${env}] ${message} ${
      Object.keys(args).length ? CircularJSON.stringify(args, null, 2) : ""
    }`;
  })
  // winston.format.simple()
);

let configLogger = process.env.LOGGER ? process.env.LOGGER : "info";
console.log(configLogger);
let transportToFile = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%-app.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: configLogger,
  format: alignedWithColorsAndTime,
});

const transportToReportError = new CustomTransport({
  level: "verbose",
});
const transportToConsole = new winston.transports.Console({
  level: configLogger,
  format: winston.format.combine(
    winston.format.colorize(),
    alignedWithColorsAndTime
  ),
});
const transports = [transportToFile, transportToReportError];

const logger = winston.createLogger({
  transports: transports,
});

if (process.env.NODE_ENV === "dev" || configLogger === "debug") {
  logger.add(transportToConsole);
}
module.exports = logger;
