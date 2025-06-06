const express = require("express");
const router = express.Router();
const OrderService = require("./order.services");
const errorHandler = require("../../core/middlewares/error-handle");
const { validate } = require("../../core/validations");
const { orderSchemas } = require("./order.validators");

// Lấy danh sách orders theo params
router.get(
  "/all",
  validate(orderSchemas.getAllOrders),
  async (req, res, next) => {
    try {
      const { user, symbol, side } = req.query;

      let users = req.activeUsers;
      // nếu không có user thì lấy tất cả
      if (user) {
        users = user.split(",");
        users = users.filter((user) => req.activeUsers.includes(user));
      }
      const results = [];
      try {
        const userOrdersPromises = users.map(async (user) => {
          const orders = await OrderService.getAllOrdersOfUser(user);
          return orders.map((order) => ({ ...order, user }));
        });

        const userOrdersArrays = await Promise.all(userOrdersPromises);
        results.push(...userOrdersArrays.flat());
      } catch (error) {
        next(error);
      }

      // Nếu có lỗi với bất kỳ user nào

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/",
  validate(orderSchemas.getOpenOrders),
  async (req, res, next) => {
    try {
      const { symbol, side, user } = req.query;

      const orders = await OrderService.getOrder(user, symbol, side);
      return res.json({
        success: true,
        data: orders,
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

// Sử dụng middleware xử lý lỗi
router.use(errorHandler);

module.exports = router;
