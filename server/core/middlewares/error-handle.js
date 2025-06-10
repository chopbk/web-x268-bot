const {
  ValidationError,
  NotFoundError,
  BinanceError,
  PartialSuccessError,
} = require("../utils/error-handler");
const logger = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof BinanceError) {
    return res.status(400).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof PartialSuccessError) {
    return res.status(207).json({
      success: false,
      code: err.code,
      message: err.message,
      data: err.data,
    });
  }

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: err.message || "Lỗi server nội bộ",
  });
};
module.exports = errorHandler;
