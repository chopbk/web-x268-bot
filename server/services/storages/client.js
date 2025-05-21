const BinanceFutures = require("../utils/lib/binance");
const KucoinFutures = require("../utils/lib/kucoin");
const BitgetFutures = require("../utils/lib/bitget");
const BingxFutures = require("../utils/lib/bingx");
const OkexFutures = require("../utils/lib/okex");

const BybitFutures = require("../utils/lib/bybit");
const BybitFuturesV5 = require("../utils/lib/bybit/v5");
const MongoDb = require("../database/mongodb");
const logger = require("../utils/logger");
const delay = require("../utils/delay");
class FuturesClient {
  constructor() {
    this.client = {};
    this.configApi = {};
    this.profit = {};
  }
  init = async (users) => {
    this.client["DEFAULT"] = new BinanceFutures();
    if (process.env.BYBIT) {
      this.client["BYBIT"] = new BybitFuturesV5();
    }
    if (process.env.OKEX) {
      this.client["OKEX"] = new OkexFutures();
    }
    if (process.env.BITGET) {
      this.client["BITGET"] = new BitgetFutures();
    }
    const userApis = await MongoDb.UserApiModel.find({
      username: { $in: users },
    }).lean();
    userApis.map((userApi) => {
      this.addFuturesClient(userApi.username, userApi);
    });
  };
  getFuturesClient = (user) => {
    if (!user) throw new Error("[getFuturesClient] parameter user is needed");
    if (this.client[user]) {
      return this.client[user];
    }

    if (user === "DEFAULT") {
      this.client[user] = new BinanceFutures();
    }
    if (user === "BYBIT") {
      this.client[user] = new BybitFuturesV5();
    }
    if (user === "OKEX") {
      this.client[user] = new OkexFutures();
    }
    if (user === "BITGET") {
      this.client[user] = new BitgetFutures();
    }
    if (this.client[user]) {
      return this.client[user];
    }

    throw new Error(`[getFuturesClient] Futures Client not exist ${user}`);
  };
  addFuturesClient = (user, config) => {
    logger.debug(`[addFuturesClient] env ${user} exchange ${config.exchange}`);
    if (!user) throw new Error("[addFuturesClient] parameter user is needed");
    if (!config) throw new Error(`[addFuturesClient] no config for ${user}`);
    if (!!this.client[user]) return this.client[user];

    switch (config.exchange) {
      case "binance":
        this.configApi[user] = {
          APIKEY: config.api_key,
          APISECRET: config.api_secret,
          hedgeMode: config.hedge_mode || true,
          recvWindow: 8686,
        };
        if (config.options)
          this.configApi[user] = { ...this.configApi[user], ...config.options };

        this.client[user] = new BinanceFutures(this.configApi[user]);
        break;
      case "kucoin":
        this.configApi[user] = {
          apiKey: config.api_key,
          secretKey: config.api_secret,
          passphrase: config.password,
          environment: "live",
        };
        this.client[user] = new KucoinFutures();
        this.client[user].init(this.configApi[user]);
        break;
      case "huobi":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
        };
        this.client[user] = new HuobiFutures(this.configApi[user]);
        break;

      case "okex":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[user] = new OkexFutures(this.configApi[user]);
        break;
      case "bybit":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[user] = new BybitFutures(this.configApi[user]);
        break;
      case "bitget":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[user] = new BitgetFutures(this.configApi[user]);
        break;
      case "bybitv5":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
          test: config.test,
        };
        this.client[user] = new BybitFuturesV5(this.configApi[user]);
        break;
      case "bingx":
        this.configApi[user] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[user] = new BingxFutures(this.configApi[user]);
        break;

      case "spot":
        this.configApi[user] = {
          APIKEY: config.api_key,
          APISECRET: config.api_secret,
          hedgeMode: config.hedgeMode || true,
          exchange: "spot",
        };
        this.client[user] = new BinanceFutures(this.configApi[user]);
        this.client[user].spot = true;
        this.client[user].exchange = "spot";
        break;
    }
    // this.client[user].exchange = config.exchange;
    this.client[user].name = user;
  };
}
module.exports = new FuturesClient();
