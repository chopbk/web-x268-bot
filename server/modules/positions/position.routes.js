const express = require("express");
const router = express.Router();
const Position = require("./position.services");
const errorHandler = require("../../core/middlewares/error-handle");
const { validate } = require("../../core/validations");
const { positionSchemas } = require("./position.validatiors");
// Middleware xử lý lỗi

// Get all positions
router.get("/", async (req, res, next) => {
  try {
    const positions = await Position.getAllPositions();
    res.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    next(error);
  }
});

// Get position by symbol
router.get(
  "/:symbol",
  validate(positionSchemas.getPosition),
  async (req, res, next) => {
    try {
      const { user, side } = req.query;
      const position = await Position.getPosition(
        user,
        req.params.symbol,
        side
      );
      res.json({
        success: true,
        data: position,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Close position
router.post(
  "/close",
  validate(positionSchemas.closePosition),
  async (req, res, next) => {
    try {
      const { user, symbol, side, percent } = req.body;
      const order = await Position.closePosition(user, symbol, side, percent);
      res.json({
        success: true,
        data: order,
        message: "Đóng position thành công",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Close all positions
router.post(
  "/closeAll",
  validate(positionSchemas.closeAllPositions),
  async (req, res, next) => {
    try {
      let { users } = req.body;
      const results = {
        success: [],
        failed: [],
      };

      if (!users || users.length === 0) {
        users = req.activeUsers;
      }
      for (let user of users) {
        try {
          const result = await Position.closeAllPositions(user);
          results.success.push({
            user,
            ...result,
          });
        } catch (error) {
          if (error.code === "PARTIAL_SUCCESS") {
            let success = error.data.success;
            let failed = error.data.failed;
            success.forEach((item) => {
              results.success.push({
                user,
                ...item,
              });
            });

            failed.forEach((item) => {
              results.failed.push({
                user,
                ...item,
              });
            });
          } else {
            results.failed.push({
              user,
              error: error.message,
              code: error.code || "UNKNOWN_ERROR",
            });
          }
        }
      }

      // Nếu có lỗi xảy ra với bất kỳ user nào
      if (results.failed.length > 0) {
        return res.status(207).json({
          success: false,
          code: "PARTIAL_SUCCESS",
          message: "Một số positions đóng không thành công",
          data: results,
        });
      }

      // Nếu tất cả đều thành công
      res.json({
        success: true,
        message: "Đóng tất cả positions thành công",
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sử dụng middleware xử lý lỗi
router.use(errorHandler);

module.exports = router;
