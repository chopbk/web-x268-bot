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
        let futuresClient =
          FuturesClient.getFuturesClient(user).futuresGetDataStream();
        try {
          // await this.getAvailableBalance(env, futuresClient);
        } catch (error) {
          logger.error(`${env} getAvailableBalance ${error.message}`);
          return;
        }
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
