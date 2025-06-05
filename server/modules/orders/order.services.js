const FuturesClient = require("../../core/clients");
const logger = require("../../core/utils/logger");
const {
  ValidationError,
  NotFoundError,
  PartialSuccessError,
  handleBinanceError,
} = require("../../core/utils/error-handler");
const SymbolStorage = require("../symbols/symbol.storages");
const { roundPrice, roundAmount } = require("../../core/utils/calculate");

class OrderService {
  constructor() {
    this.users = [];
  }
  async init(users) {
    this.users = users;
  }
  createOrder = async (
    user,
    symbol,
    side,
    positionSide,
    type,
    quantity,
    price,
    stopPrice
  ) => {
    try {
      let order = null;
      let symbolInfo = SymbolStorage.getSymbolInfo(symbol);
      if (!symbolInfo) {
        throw new NotFoundError("Không tìm thấy symbol");
      }

      let stepSize = symbolInfo.stepSize;
      let tickSize = symbolInfo.tickSize;
      if (price) {
        price = roundPrice(price, tickSize);
      }
      if (stopPrice) {
        stopPrice = roundPrice(stopPrice, tickSize);
      }
      quantity = roundAmount(quantity, stepSize);

      let futuresClient = FuturesClient.getFuturesClient(user);
      order = await futuresClient.futuresOrder(
        side,
        symbol,
        quantity,
        (price = false),
        {
          type,
          positionSide,
          stopPrice,
        }
      );

      if (order.code) {
        handleBinanceError(order);
      }
      return order;
    } catch (error) {
      logger.error(`Error creating order for user ${user}: ${error.message}`);
      throw error;
    }
  };
  getAllOrdersOfUser = async (user) => {
    try {
      if (!user) {
        throw new ValidationError("Thiếu thông tin user");
      }
      const orders = await FuturesClient.getFuturesClient(
        user
      ).futuresOpenOrders();
      if (orders.code) {
        handleBinanceError(orders);
      }
      return orders;
    } catch (error) {
      logger.error(
        `Error getting all orders for user ${user}: ${error.message}`
      );
      throw error;
    }
  };
  getOrder = async (user, symbol = false, side = false) => {
    try {
      if (!user) {
        throw new ValidationError("Thiếu thông tin user");
      }

      const allOpenOrders = await FuturesClient.getFuturesClient(
        user
      ).futuresOpenOrders(symbol);
      if (allOpenOrders.code) {
        handleBinanceError(allOpenOrders);
      }

      const orders = allOpenOrders.filter((o) => o.positionSide === side);
      return !!side ? orders : allOpenOrders;
    } catch (error) {
      logger.error(`Error getting orders for user ${user}: ${error.message}`);
      throw error;
    }
  };
  getOrderHistory = async (user, symbol = false, side = false) => {
    try {
      if (!user) {
        throw new ValidationError("Thiếu thông tin user");
      }

      const allOrders = await FuturesClient.getFuturesClient(
        user
      ).futuresAllOrders(symbol);
      if (allOrders.code) {
        handleBinanceError(allOrders);
      }

      const orderHistory = allOrders.filter((o) => o.status !== "NEW");
      const orders = orderHistory.filter((o) => o.positionSide === side);
      return !!side ? orders : orderHistory;
    } catch (error) {
      logger.error(
        `Error getting order history for user ${user}: ${error.message}`
      );
      throw error;
    }
  };
  cancelOrder = async (user, symbol, orderId) => {
    try {
      if (!user || !symbol || !orderId) {
        throw new ValidationError("Thiếu thông tin bắt buộc");
      }

      const result = await FuturesClient.getFuturesClient(user).futuresCancel(
        symbol,
        {
          orderId: orderId,
        }
      );

      if (result.code) {
        handleBinanceError(result);
      }

      return result;
    } catch (error) {
      logger.error(
        `Error cancelling order ${orderId} for user ${user}: ${error.message}`
      );
      throw error;
    }
  };

  cancelAllOrders = async (user, symbol, side) => {
    try {
      if (!user || !symbol) {
        throw new ValidationError("Thiếu thông tin bắt buộc");
      }

      const allOpenOrders = await this.getOrder(user, symbol, side);
      if (!allOpenOrders || allOpenOrders.length === 0) {
        throw new NotFoundError("Không tìm thấy orders nào");
      }

      let orderIds = allOpenOrders.map((o) => o.orderId);
      return await this.cancelOrderByIds(user, symbol, orderIds);
    } catch (error) {
      logger.error(
        `Error cancelling all orders for user ${user}: ${error.message}`
      );

      throw error;
    }
  };

  cancelOrderByIds = async (user, symbol, orderIds) => {
    try {
      if (!user || !symbol) {
        throw new ValidationError("Thiếu thông tin bắt buộc");
      }

      if (!orderIds || orderIds.length === 0) {
        throw new ValidationError("Không có order nào để hủy");
      }

      let chunks = [];
      if (orderIds.length > 5) {
        for (let i = 0; i < orderIds.length; i += 5) {
          chunks.push(orderIds.slice(i, i + 5));
        }
      } else {
        chunks.push(orderIds);
      }

      const results = {
        success: [],
        failed: [],
      };

      for (let chunk of chunks) {
        try {
          const result = await FuturesClient.getFuturesClient(
            user
          ).futuresCancelMultipleOrders(symbol, chunk);

          if (Array.isArray(result)) {
            result.forEach((order) => {
              if (order.code) {
                results.failed.push({
                  orderId: order.orderId,
                  error: order.msg,
                  code: order.code,
                });
              } else {
                results.success.push(order);
              }
            });
          } else if (result && typeof result === "object") {
            if (result.code) {
              results.failed.push({
                error: `${result.msg}`,
                code: result.code,
              });
            } else {
              results.success.push(result);
            }
          }
        } catch (error) {
          logger.error(`Error cancelling chunk of orders: ${error.message}`);
          results.failed.push({
            error: error.message,
            code: "UNKNOWN_ERROR",
          });
        }
      }

      // Nếu có bất kỳ lỗi nào xảy ra
      if (results.failed.length > 0) {
        throw new PartialSuccessError(
          "Một số orders hủy không thành công",
          results
        );
      }

      return results;
    } catch (error) {
      logger.error(`Error in cancelOrderByIds: ${error.message}`);
      throw error;
    }
  };
}

module.exports = new OrderService();
