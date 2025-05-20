const BinanceFutures = require("../utils/lib/binance");
const KucoinFutures = require("../utils/lib/kucoin");
const BitgetFutures = require("../utils/lib/bitget");
const BingxFutures = require("../utils/lib/bingx");
const OkexFutures = require("../utils/lib/okex");

const BybitFutures = require("../utils/lib/bybit");
const BybitFuturesV5 = require("../utils/lib/bybit/v5");
const MongoDb = require("../database/mongodb");
const logger = require("../utils/logger");
class FuturesClient {
  constructor() {
    this.client = {};
    this.configApi = {};
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
  getFuturesClient = (env) => {
    if (!env) throw new Error("[getFuturesClient] parameter env is needed");
    if (this.client[env]) {
      return this.client[env];
    }

    if (env === "DEFAULT") {
      this.client[env] = new BinanceFutures();
    }
    if (env === "BYBIT") {
      this.client[env] = new BybitFuturesV5();
    }
    if (env === "OKEX") {
      this.client[env] = new OkexFutures();
    }
    if (env === "BITGET") {
      this.client[env] = new BitgetFutures();
    }
    if (this.client[env]) {
      return this.client[env];
    }

    throw new Error(`[getFuturesClient] Futures Client not exist ${env}`);
  };
  addFuturesClient = (env, config) => {
    logger.debug(`[addFuturesClient] env ${env} exchange ${config.exchange}`);
    if (!env) throw new Error("[addFuturesClient] parameter env is needed");
    if (!config) throw new Error(`[addFuturesClient] no config for ${env}`);
    if (!!this.client[env]) return this.client[env];

    switch (config.exchange) {
      case "binance":
        this.configApi[env] = {
          APIKEY: config.api_key,
          APISECRET: config.api_secret,
          hedgeMode: config.hedge_mode || true,
          recvWindow: 8686,
        };
        if (config.options)
          this.configApi[env] = { ...this.configApi[env], ...config.options };

        this.client[env] = new BinanceFutures(this.configApi[env]);
        break;
      case "kucoin":
        this.configApi[env] = {
          apiKey: config.api_key,
          secretKey: config.api_secret,
          passphrase: config.password,
          environment: "live",
        };
        this.client[env] = new KucoinFutures();
        this.client[env].init(this.configApi[env]);
        break;
      case "huobi":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
        };
        this.client[env] = new HuobiFutures(this.configApi[env]);
        break;

      case "okex":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[env] = new OkexFutures(this.configApi[env]);
        break;
      case "bybit":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[env] = new BybitFutures(this.configApi[env]);
        break;
      case "bitget":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[env] = new BitgetFutures(this.configApi[env]);
        break;
      case "bybitv5":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
          test: config.test,
        };
        this.client[env] = new BybitFuturesV5(this.configApi[env]);
        break;
      case "bingx":
        this.configApi[env] = {
          api_key: config.api_key,
          api_secret: config.api_secret,
          passphrase: config.password,
        };
        this.client[env] = new BingxFutures(this.configApi[env]);
        break;

      case "spot":
        this.configApi[env] = {
          APIKEY: config.api_key,
          APISECRET: config.api_secret,
          hedgeMode: config.hedgeMode || true,
          exchange: "spot",
        };
        this.client[env] = new BinanceFutures(this.configApi[env]);
        this.client[env].spot = true;
        this.client[env].exchange = "spot";
        break;
    }
    // this.client[env].exchange = config.exchange;
    this.client[env].name = env;
  };
  getBalance = async (env) => {
    let balances = await this.client[env].futuresAccountBalance();
    let balance = parseFloat(balances.balance).toFixed(2);
    let crossUnPnl = parseFloat(balances.crossUnPnl).toFixed(2);
    if (isNaN(crossUnPnl)) crossUnPnl = balances.crossUnPnl;
    let availableBalance = parseFloat(balances.availableBalance).toFixed(2);
    if (isNaN(availableBalance)) availableBalance = balances.availableBalance;
    return `✅ #BALANCE_${env}\n🔍💰 ${balance}$
🔐💰 ${crossUnPnl}$ 
🏦💰 ${availableBalance}$`;
  };
  getProfit = async (env) => {
    let dayProfit = 0;
    let d = new Date();
    let todayString =
      d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    const filter = (profit) =>
      profit.incomeType == "FUNDING_FEE" ||
      profit.incomeType == "COMMISSION" ||
      profit.incomeType == "REALIZED_PNL" ||
      profit.incomeType == "TRADING_FEE" ||
      profit.incomeType == "REFERRAL_KICKBACK" ||
      profit.incomeType == "COMMISSION_REBATE";
    let profits = await this.client[env].futuresIncome({
      startTime: new Date(todayString),

      limit: 1000,
    });
    if (profits.code) return 0;
    let newIncome = profits.filter(filter);

    for (var i = 0, _len = newIncome.length; i < _len; i++) {
      dayProfit += parseFloat(newIncome[i].income);
    }
    return dayProfit;
  };
}
module.exports = new FuturesClient();
