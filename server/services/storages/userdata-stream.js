const WebSocket = require("ws");
const FuturesClient = require("./client");
const Position = require("./position");
const Balance = require("./balance");
const MongoDb = require("../database/mongodb");
const logger = require("../utils/logger");

class UserdataStream {
  constructor() {
    this.streams = {};
    this.previousPositions = {}; // Lưu trữ positions trước đó để so sánh
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

        // Lưu positions ban đầu
        const initialPositions = await Position.getPositionsInfo(user);
        this.previousPositions[user] = initialPositions;

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
                lastFilledPrice,
                quantity = order.originalQuantity,
                open = false,
                orderType = order.orderType,
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
              let monitorPosition = await MongoDb.MonitorPositionModel.find({
                symbol: order.symbol,
                side: order.positionSide,
                futuresClientName: user,
                isLimit: open,
                closed: false,
              }).lean();
              if (monitorPosition.length > 0) {
                monitorPosition.map((p) => {
                  signal = `${p.type}`;
                });
              }

              if (!this.profit[order.symbol + user])
                this.profit[order.symbol + user] = 0;
              if (!this.fee[order.symbol + user])
                this.fee[order.symbol + user] = 0;
              switch (order.orderStatus) {
                case "PARTIALLY_FILLED":
                  quantity = order.orderLastFilledQuantity;
                  this.profit[order.symbol + user] += parseFloat(
                    order.realizedProfit
                  );
                  this.fee[order.symbol + user] += parseFloat(order.commission);
                  break;
                case "FILLED":
                  price = parseFloat(order.averagePrice);
                  lastFilledPrice = parseFloat(order.lastFilledPrice);
                  quantity = parseFloat(order.orderFilledAccumulatedQuantity);
                  volume = Math.round(
                    parseFloat(order.orderFilledAccumulatedQuantity) * price
                  );
                  this.profit[order.symbol + user] += parseFloat(
                    order.realizedProfit
                  );
                  this.fee[order.symbol + user] += parseFloat(order.commission);

                  const previousPosition = this.previousPositions[user].find(
                    (pos) =>
                      pos.symbol === order.symbol &&
                      pos.positionSide === order.positionSide
                  );
                  if (open === true) {
                    // check xem có symbol và side trong previousPositions không, nếu ko có thì là mở mới
                    if (!previousPosition) {
                      notifications.push({
                        type: "POSITION_OPENED",
                        orderType: order.originalOrderType,
                        user: user,
                        symbol: order.symbol,
                        side: order.positionSide,
                        entryPrice: price,
                        volume: volume,
                        fee: this.fee[order.symbol + user],
                        time: new Date().toISOString(),
                        signal: signal,
                      });
                    }
                  } else {
                    // nếu có trong previousPositions không, nếu có thì check xem có bị đóng lệnh hay ko
                    if (previousPosition) {
                      // check xem có bị đóng lệnh hay ko
                      if (
                        Math.abs(previousPosition.positionAmt - quantity) /
                          previousPosition.positionAmt <
                        0.005
                      ) {
                        // check xem có bị đóng lệnh hay ko
                        notifications.push({
                          type: "POSITION_CLOSED",
                          user: user,
                          symbol: order.symbol,
                          side: order.positionSide,
                          profit: this.profit[order.symbol + user],
                          time: new Date().toISOString(),
                          volume: volume,
                          fee: this.fee[order.symbol + user],
                          signal: signal,
                        });
                      }
                    }
                    notifications.push({
                      type: "ORDER_FILLED",
                      orderType: order.originalOrderType,
                      user: user,
                      symbol: order.symbol,
                      side: order.side,
                      price: price,
                      quantity: quantity,
                      time: new Date().toISOString(),
                      profit: this.profit[order.symbol + user],
                      volume: volume,
                      fee: this.fee[order.symbol + user],
                      signal: signal,
                    });
                  }

                  // xoá this.profit[order.symbol + user] và this.fee[order.symbol + user] để đỡ tốn bộ nhớ
                  delete this.profit[order.symbol + user];
                  delete this.fee[order.symbol + user];
                  break;
              }
              console.log(data);
              // Cập nhật positions
              await Position.updatePositionInfoBySymbolAndSide(
                user,
                order.symbol,
                order.positionSide
              );

              // Gửi thông báo đến client
              if (notifications.length > 0 && global.io) {
                global.io.emit("position_notifications", notifications);
              }

              // Cập nhật positions trước đó
              this.previousPositions[user] = await Position.getPositionsInfo(
                user
              );
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
