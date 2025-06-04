class ErrorHandler extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BinanceError extends ErrorHandler {
  constructor(message, code) {
    super(message, code, 400);
    this.name = "BinanceError";
  }
}

class ValidationError extends ErrorHandler {
  constructor(message) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

class NotFoundError extends ErrorHandler {
  constructor(message) {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

class PartialSuccessError extends ErrorHandler {
  constructor(message, error) {
    super(message, "PARTIAL_SUCCESS", 207);
    this.name = "PartialSuccessError";
    this.data = error;
  }
}

// Hàm xử lý lỗi từ Binance
const handleBinanceError = (error) => {
  if (error.code) {
    // Các mã lỗi phổ biến từ Binance
    const errorMessages = {
      "-2015": "API Error",
      "-2014": "API key không có quyền thực hiện hành động này",
      "-2010": "Số dư không đủ",
      "-4164": "Số lượng order không hợp lệ",
      "-4165": "Giá order không hợp lệ",
      "-4166": "Khoảng cách giá không hợp lệ",
      "-4167": "Số lượng tối thiểu không đạt yêu cầu",
      "-4168": "Số lượng tối đa vượt quá giới hạn",
      "-4169": "Giá không nằm trong khoảng cho phép",
      "-4170": "Số lượng không nằm trong khoảng cho phép",
      "-4171": "Giá không đạt yêu cầu về tick size",
      "-4172": "Số lượng không đạt yêu cầu về step size",
      "-4173": "Position không tồn tại",
      "-4174": "Position đã đóng",
      "-4175": "Position không thể đóng",
      "-4176": "Position không thể mở",
      "-4177": "Position không thể cập nhật",
      "-4178": "Position không thể hủy",
      "-4179": "Position không thể thay đổi leverage",
      "-4180": "Position không thể thay đổi margin type",
      "-4181": "Position không thể thay đổi position mode",
      "-4182": "Position không thể thay đổi position side",
      "-4183": "Position không thể thay đổi position size",
      "-4184": "Position không thể thay đổi position price",
      "-4185": "Position không thể thay đổi position stop loss",
      "-4186": "Position không thể thay đổi position take profit",
      "-4187": "Position không thể thay đổi position trailing stop",
      "-4188":
        "Position không thể thay đổi position trailing stop activation price",
      "-4189":
        "Position không thể thay đổi position trailing stop callback rate",
      "-4190": "Position không thể thay đổi position trailing stop distance",
      "-4191": "Position không thể thay đổi position trailing stop step size",
      "-4192": "Position không thể thay đổi position trailing stop max price",
      "-4193": "Position không thể thay đổi position trailing stop min price",
      "-4194":
        "Position không thể thay đổi position trailing stop max distance",
      "-4195":
        "Position không thể thay đổi position trailing stop min distance",
      "-4196":
        "Position không thể thay đổi position trailing stop max step size",
      "-4197":
        "Position không thể thay đổi position trailing stop min step size",
      "-4198":
        "Position không thể thay đổi position trailing stop max callback rate",
      "-4199":
        "Position không thể thay đổi position trailing stop min callback rate",
      "-4200":
        "Position không thể thay đổi position trailing stop max activation price",
      "-4201":
        "Position không thể thay đổi position trailing stop min activation price",
      "-4202": "Position không thể thay đổi position trailing stop max price",
      "-4203": "Position không thể thay đổi position trailing stop min price",
      "-4204":
        "Position không thể thay đổi position trailing stop max distance",
      "-4205":
        "Position không thể thay đổi position trailing stop min distance",
      "-4206":
        "Position không thể thay đổi position trailing stop max step size",
      "-4207":
        "Position không thể thay đổi position trailing stop min step size",
      "-4208":
        "Position không thể thay đổi position trailing stop max callback rate",
      "-4209":
        "Position không thể thay đổi position trailing stop min callback rate",
      "-4210":
        "Position không thể thay đổi position trailing stop max activation price",
      "-4211":
        "Position không thể thay đổi position trailing stop min activation price",
    };

    const message = error.msg || "Lỗi không xác định từ Binance";
    throw new BinanceError(message, error.code);
  }
  throw error;
};

module.exports = {
  ErrorHandler,
  BinanceError,
  ValidationError,
  NotFoundError,
  PartialSuccessError,
  handleBinanceError,
};
