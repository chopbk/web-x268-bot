const WebSocket = require("ws");
const FuturesClient = require("./client");
const Position = require("./position");
const Balance = require("./balance");
const MongoDb = require("../database/mongodb");
const logger = require("../utils/logger");

class UserdataStream {
  constructor() {
    this.streams = {};

    this.profit = {};
    this.fee = {};
  }

  async init(users) {
    for (let user of users) {
      try {
        let futuresClient = FuturesClient.getFuturesClient(user);
        try {
          await futuresClient.futuresChangePositionSideDual(true);
        } catch (error) {
          logger.error(`${user} getAvailableBalance ${error.message}`);
          return;
        }

        futuresClient.websockets.userFutureData(
          (data) => {
            //margin_call_callback
            try {
              console.log("data");
              console.log(data);
            } catch (error) {
              console.log(error);
            }
          },
          (data) => {
            // console.log(data.updateData);
            Balance.updateBalanceOfUser(user);
          },
          async (data) => {
            try {
              //order_update_callback
              let order = data.order;
              let message,
                price,
                quantity = order.originalQuantity,
                open = false,
                volume = 0,
                signal = "",
                notifications = [];
              order.positionSide === "LONG"
                ? order.side == "BUY"
                  ? (open = true)
                  : (open = false)
                : order.side == "SELL"
                ? (open = true)
                : (open = false);

              if (
                order.orderStatus !== "FILLED" &&
                order.orderStatus !== "PARTIALLY_FILLED"
              )
                return;

              if (!this.profit[order.symbol + user])
                this.profit[order.symbol + user] = 0;
              if (!this.fee[order.symbol + user])
                this.fee[order.symbol + user] = 0;

              switch (order.orderStatus) {
                case "PARTIALLY_FILLED":
                  this.profit[order.symbol + user] += parseFloat(
                    order.realizedProfit
                  );
                  this.fee[order.symbol + user] += parseFloat(order.commission);
                  return;
                case "FILLED":
                  order.price = parseFloat(order.averagePrice);

                  order.quantity = parseFloat(
                    order.orderFilledAccumulatedQuantity
                  );
                  order.volume = Math.round(order.quantity * order.price);
                  this.profit[order.symbol + user] += parseFloat(
                    order.realizedProfit
                  );
                  this.fee[order.symbol + user] += parseFloat(order.commission);

                  let type = await Position.updatePositionInfoByUserStreamData(
                    user,
                    order
                  );

                  if (type) {
                    let monitorPosition =
                      await MongoDb.MonitorPositionModel.find({
                        symbol: order.symbol,
                        side: order.positionSide,
                        futuresClientName: user,
                        isLimit: open,
                        closed: false,
                      }).lean();
                    if (monitorPosition.length > 0) {
                      monitorPosition.map((p) => {
                        signal += `${p.type}-`;
                      });
                    }
                    notifications.push({
                      type: type,
                      orderType: order.originalOrderType,
                      user: user,
                      symbol: order.symbol,
                      side: order.side,
                      price: order.price,
                      quantity: order.quantity,
                      time: new Date().toISOString(),
                      profit: this.profit[order.symbol + user],
                      volume: order.volume,
                      fee: this.fee[order.symbol + user],
                      signal: signal,
                    });
                  }

                  // xoá this.profit[order.symbol + user] và this.fee[order.symbol + user] để đỡ tốn bộ nhớ
                  delete this.profit[order.symbol + user];
                  delete this.fee[order.symbol + user];
                  break;
              }

              // Cập nhật positions

              // Gửi thông báo đến client
              if (notifications.length > 0 && global.io) {
                global.io.emit("position_notifications", notifications);
              }
            } catch (error) {
              logger.error(
                `[UserDataStream] Error processing order update: ${error.message}`
              );
              // Thử kết nối lại sau 5 giây nếu bị timeout
            }
          },
          () => {}, //subscribed_callback
          () => {} //account_config_update_callback
        );
      } catch (error) {
        logger.error(
          `[UserDataStream] Failed to initialize ${user}'s stream: ${error.message}`
        );
        // Thử kết nối lại sau 5 giây nếu bị timeout
      }
    }
  }
}

module.exports = new UserdataStream();
