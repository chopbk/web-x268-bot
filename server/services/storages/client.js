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
  getBalance = async (user) => {
    try {
      let accountBalances = await this.client[user].futuresAccountBalance();

      return accountBalances;
    } catch (error) {
      logger.error(`[getBalance] error ${error}`);
      return {};
    }
  };
  getProfit = async (user, startDate, endDate) => {
    let start = new Date(startDate);
    let end = new Date(endDate);
    let today = new Date(new Date().toLocaleDateString());
    let dayEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    let FuturesProfitModel = MongoDb.getFuturesProfitModel();
    let dayProfitDbs = await FuturesProfitModel.find({
      env: user,
      day: { $gte: start.toLocaleDateString() },
    }).lean();
    let dayProfit,
      fee,
      ref,
      funding = 0;
    let totalProfit = 0;
    let totalFee = 0;
    let totalRef = 0;
    let totalFunding = 0;

    try {
      do {
        let dayProfitDb = dayProfitDbs.find(
          (profit) =>
            profit.day.toLocaleDateString() === start.toLocaleDateString()
        );

        // Nếu là ngày hiện tại hoặc không có trong DB thì lấy từ Binance
        if (
          today.toLocaleDateString() === start.toLocaleDateString() ||
          !dayProfitDb
        ) {
          let profits = await this.getFuturesClient(user).futuresIncome({
            startTime: start.getTime(),
            endTime: dayEnd.getTime(),
            limit: 1000,
          });

          if (profits.code) {
            logger.error(`[getProfit] Binance API error: ${profits}`);
            return {
              profit: 0,
              fee: 0,
              ref: 0,
              funding: 0,
            };
          }

          // Lấy tất cả dữ liệu nếu có nhiều trang
          let length = profits.length;
          while (length === 1000) {
            let temp = await this.getFuturesClient(user).futuresIncome({
              startTime: profits[profits.length - 1].time,
              endTime: dayEnd.getTime(),
              limit: 1000,
            });
            length = temp.length;
            profits = profits.concat(temp);
            await delay(868);
          }

          if (!profits || profits.length === 0) {
            start = dayEnd;
            dayEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
            continue;
          }

          // Tính toán các loại profit
          dayProfit = profits
            .filter(getFilterByType())
            .reduce((sum, income) => sum + parseFloat(income.income), 0);
          fee = profits
            .filter(getFilterByType("FEE"))
            .reduce((sum, income) => sum + parseFloat(income.income), 0);
          ref = profits
            .filter(getFilterByType("REF"))
            .reduce((sum, income) => sum + parseFloat(income.income), 0);
          funding = profits
            .filter(getFilterByType("FUNDING"))
            .reduce((sum, income) => sum + parseFloat(income.income), 0);

          // Lưu vào DB nếu không phải ngày hiện tại

          await FuturesProfitModel.findOneAndUpdate(
            { env: this.env, day: start },
            {
              env: this.env,
              day: start,
              profit: parseFloat(dayProfit.toFixed(3)),
              fee,
              ref,
              funding,
              status: dayProfit < 0 ? "LOSE" : dayProfit > 0 ? "WIN" : "DRAW",
            },
            { upsert: true }
          );

          await delay(1868);
        } else {
          // Lấy dữ liệu từ DB
          dayProfit = dayProfitDb.profit || 0;
          fee = dayProfitDb.fee || 0;
          ref = dayProfitDb.ref || 0;
          funding = dayProfitDb.funding || 0;
        }

        totalProfit += dayProfit;
        totalFee += fee;
        totalRef += ref;
        totalFunding += funding;

        start = dayEnd;
        dayEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      } while (start <= end);

      return {
        profit: totalProfit,
        fee: totalFee,
        ref: totalRef,
        funding: totalFunding,
      };
    } catch (error) {
      logger.error(`[getProfit] error ${error}`);
      return {
        profit: 0,
        fee: 0,
        ref: 0,
        funding: 0,
      };
    }
  };
}
const getFilterByType = (type) => {
  let filter = (profit) =>
    profit.incomeType == "FUNDING_FEE" ||
    profit.incomeType == "COMMISSION" ||
    profit.incomeType == "REALIZED_PNL" ||
    profit.incomeType == "TRADING_FEE" ||
    profit.incomeType == "REFERRAL_KICKBACK" ||
    profit.incomeType == "COMMISSION_REBATE";
  switch (type) {
    case "FUNDING":
      filter = (profit) => profit.incomeType == "FUNDING_FEE";
      break;
    case "FEE":
      filter = (profit) =>
        profit.incomeType == "COMMISSION" || profit.incomeType == "TRADING_FEE";
      break;
    case "PROFIT":
      filter = (profit) => profit.incomeType == "REALIZED_PNL";
      break;
    case "REF":
      filter = (profit) =>
        profit.incomeType == "REFERRAL_KICKBACK" ||
        profit.incomeType == "COMMISSION_REBATE";
      break;
    default:
      break;
  }
  return filter;
};
module.exports = new FuturesClient();
