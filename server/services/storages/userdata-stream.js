const WebSocket = require("ws");
const FuturesClient = require("./client");
const Position = require("./position");
const Balance = require("./balance");
const logger = require("../utils/logger");

class UserdataStream {
  constructor() {
    this.streams = {};
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
            console.log(data);
            Balance.updateBalanceOfUser(user);
          },
          (data) => {
            //order_update_callback

            if (
              order.orderStatus !== "FILLED" ||
              order.executionType !== "TRADE"
            )
              return;

            let order = data.order;

            let status = "";
            let message,
              price,
              lastFilledPrice,
              quantity = order.originalQuantity,
              open = false,
              orderType = order.orderType;

            order.positionSide === "LONG"
              ? order.side == "BUY"
                ? (open = true)
                : (open = false)
              : order.side == "SELL"
              ? (open = true)
              : (open = false);
            // only process the order if order has bean excuted
            console.log(data);

            if (!this.profit[order.symbol + env])
              this.profit[order.symbol + env] = 0;
            if (!this.fee[order.symbol + env]) this.fee[order.symbol + env] = 0;
            // only process the order if order has bean filled or partially filled
            switch (order.orderStatus) {
              case "NEW":
              case "CANCELED":
              case "EXPIRED":
                return;
              case "PARTIALLY_FILLED":
                quantity = order.orderLastFilledQuantity;
                this.profit[order.symbol + env] += parseFloat(
                  order.realizedProfit
                );
                this.fee[order.symbol + env] += parseFloat(order.commission);

                return;
              case "FILLED":
                if (
                  (open === false &&
                    (order.originalOrderType === "TAKE_PROFIT_MARKET" ||
                      order.originalOrderType === "STOP_MARKET")) ||
                  order.closeAll === true
                ) {
                  // public close position
                  this.sendClosePosition(order.symbol, env, order.positionSide);
                }
                if (open === true)
                  this.sendOpenPosition(order.symbol, env, order.positionSide);
                this.sendPositionChange(env, order);
                this.profit[order.symbol + env] += parseFloat(
                  order.realizedProfit
                );
                this.fee[order.symbol + env] += parseFloat(order.commission);
                break;
              default:
                break;
            }
            price = parseFloat(order.averagePrice);
            lastFilledPrice = order.lastFilledPrice;
            quantity = parseFloat(order.orderFilledAccumulatedQuantity);
            if (price * quantity < 10) return;
            switch (order.originalOrderType) {
              case "MARKET":
                orderType = `MARKET`;
                break;
              case "TAKE_PROFIT_MARKET":
                //market buy
                orderType = `PROFIT`;
                break;
              case "STOP_MARKET":
                orderType = `STOPLOSS`;
                if (this.profit[order.symbol + env] > 0)
                  orderType += "_TRAILING";
                break;
              case "LIMIT":
                price = parseFloat(order.originalPrice);
                orderType = `LIMIT`;
                break;
              default:
                break;
            }
            // if (order.originalOrderType !== "LIMIT")
            this.sendUpdatePosition(env, order.symbol, order.positionSide, {
              orderId: order.orderId,
              type: order.originalOrderType,
              origQty: parseFloat(order.originalQuantity),
            });
            message = `#${env} ${
              open ? "⭐️OPEN" : order.closeAll ? "#CLOSE_POSITION" : "#CLOSE"
            }`;
            if (!open)
              message += `${this.profit[order.symbol + env] > 0 ? "✅" : "❌"}`;
            message += `#${orderType}  #${
              order.positionSide
            }_${order.symbol.replace("USDT", "")} 
🔍${price}$ 💵${(quantity * price).toFixed(2)}$ ${this.fee[
              order.symbol + env
            ].toFixed(1)}$`;
            if (!open)
              message += `${
                this.profit[order.symbol + env] > 0 ? "💰" : "🔴"
              }${this.profit[order.symbol + env].toFixed(2)}$`;
            this.profit[order.symbol + env] = 0;
            this.fee[order.symbol + env] = 0;

            this.sendReport(
              message,
              buildPositionInfoStr(env, order.symbol, order.positionSide)
            );
            logger.debug(message);
          },
          () => {}, //subscribed_callback
          () => {} //account_config_update_callback
        );
      } catch (error) {
        logger.error(
          `[UserDataStream] Failed to initialize ${user}'s stream: ${error.message}`
        );
      }
    }
  }

  async reconnect(user) {
    if (this.streams[user]) {
      this.streams[user].ws.terminate();
      delete this.streams[user];
    }

    // Đợi 5 giây trước khi thử kết nối lại
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.init([user]);
  }

  close() {
    for (let user in this.streams) {
      if (this.streams[user].ws) {
        this.streams[user].ws.close();
      }
    }
    this.streams = {};
  }
}

module.exports = new UserdataStream();
