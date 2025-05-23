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
            // console.log(data.updateData);

            Balance.updateBalanceOfUser(user);
          },
          (data) => {
            //order_update_callback
            let order = data.order;

            if (
              order.orderStatus !== "FILLED" ||
              order.executionType !== "TRADE"
            )
              return;
            // console.log(order);
            Position.updatePositionInfoFromExchange(user);
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
