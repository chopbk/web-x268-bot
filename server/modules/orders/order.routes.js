const express = require("express");
const router = express.Router();
const OrderService = require("./order.services");
const errorHandler = require("../../core/middlewares/error-handle");
const { validate } = require("../../core/validations");
const { orderSchemas } = require("./order.validators");

// Lấy danh sách orders theo params
router.get("/", validate(orderSchemas.getAllOrders), async (req, res, next) => {
  try {
    const { user, symbol, side } = req.query;
    let orders = [];

    // nếu không có user thì lấy tất cả
    if (!user) {
      const users = req.activeUsers;
      const results = {
        success: [],
        failed: [],
      };

      for (let user of users) {
        try {
          const userOrders = await OrderService.getAllOrdersOfUser(user);
          results.success.push({
            user,
            orders: userOrders,
          });
        } catch (error) {
          results.failed.push({
            user,
            error: error.message,
            code: error.code || "UNKNOWN_ERROR",
          });
        }
      }

      // Nếu có lỗi với bất kỳ user nào
      if (results.failed.length > 0) {
        return res.status(207).json({
          success: false,
          code: "PARTIAL_SUCCESS",
          message: "Một số users không lấy được orders",
          data: results,
        });
      }

      return res.json({
        success: true,
        data: results.success,
      });
    } else {
      orders = await OrderService.getOrder(user, symbol, side);
      res.json({
        success: true,
        data: orders,
      });
    }
  } catch (error) {
    next(error);
  }
});
router.post("/", validate(orderSchemas.createOrder), async (req, res, next) => {
  try {
    const {
      user,
      symbol,
      side,
      positionSide,
      type,
      quantity,
      price,
      stopPrice,
    } = req.body;
    // if (!quantity) {
    //   const position = await PositionService.getPositionBySymbolAndSide(
    //     user,
    //     symbol,
    //     side
    //   );
    //   if (position) {
    //     quantity = position.positionAmt;
    //   }
    // }
    const order = await OrderService.createOrder(
      user,
      symbol,
      side,
      positionSide,
      type,
      quantity,
      price,
      stopPrice
    );
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// delete all order theo params
router.post(
  "/cancel-all",
  validate(orderSchemas.cancelAllOrders),
  async (req, res, next) => {
    try {
      const { user, symbol, side, orderIds } = req.body;
      let result;

      if (symbol && orderIds) {
        result = await OrderService.cancelOrderByIds(user, symbol, orderIds);
      } else if (symbol) {
        result = await OrderService.cancelAllOrders(user, symbol, side);
      }

      // Nếu có lỗi một phần
      if (result.failed?.length > 0) {
        return res.status(207).json({
          success: false,
          code: "PARTIAL_SUCCESS",
          message: "Một số orders hủy không thành công",
          data: result,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// delete order theo params
router.delete(
  "/:id",
  validate(orderSchemas.cancelOrder),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { user, symbol } = req.query;
      const result = await OrderService.cancelOrder(user, symbol, id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Lấy danh sách orders theo params
router.get(
  "/history",
  validate(orderSchemas.getOrderHistory),
  async (req, res, next) => {
    try {
      const { user, symbol, side } = req.query;

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User is required",
        });
      }

      const orders = await OrderService.getOrderHistory(user, symbol, side);
      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sử dụng middleware xử lý lỗi
router.use(errorHandler);

module.exports = router;
