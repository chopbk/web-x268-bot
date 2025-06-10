const logger = require("../utils/logger");
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body, query, params } = req;

  // Log request
  logger.debug("\n=== Request ===");
  logger.debug(`[${new Date().toISOString()}] ${method} ${originalUrl}`);
  if (Object.keys(query).length > 0) logger.debug("Query:", query);
  if (Object.keys(params).length > 0) logger.debug("Params:", params);
  if (Object.keys(body).length > 0) logger.debug("Body:", body);

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - start;

    // Log response
    logger.debug("\n=== Response ===");
    logger.debug(
      `[${new Date().toISOString()}] ${method} ${originalUrl} - ${
        res.statusCode
      } (${responseTime}ms)`
    );
    try {
      const responseData = JSON.parse(data);
      logger.debug("Response:", responseData);
    } catch (e) {
      logger.debug("Response:", data);
    }
    logger.debug("================\n");

    // Call original send
    return originalSend.apply(res, arguments);
  };

  next();
};

module.exports = loggerMiddleware;
