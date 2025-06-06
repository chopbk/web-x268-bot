const MongoDb = require("../../core/database/mongodb");
const logger = require("../../core/utils/logger");
const delay = require("../../core/utils/delay");
const FuturesClient = require("../../core/clients");
const updateTimeManager = require("../../core/utils/update-timer");
const { scheduleJob } = require("../../core/utils/schedule");
const ProfitStorage = require("./profit.storages");
class Profit {
  constructor() {
    this.users = [];
  }
  async init(users) {
    this.users = users;

    await this.updateTodayProfit(users);
    await this.updateYesterdayProfit(users);
  }
  update = async () => {
    await this.updateTodayProfit(this.users);
    // await this.updateYesterdayProfit(this.users);
  };
  scheduleUpdateProfit = async () => {
    scheduleJob("1 */1 * * *", async () => {
      await this.updateTodayProfit(this.users);
    });
    // 0 giờ sáng thì update yesterday profit
    scheduleJob("0 0 * * *", async () => {
      await this.updateYesterdayProfit(this.users);
    });
  };
  updateProfit = async (users, startDate, endDate) => {
    let result = {};
    let today = new Date(new Date().toLocaleDateString());
    for (let user of users) {
      if (
        today.toLocaleDateString() ===
          new Date(startDate).toLocaleDateString() &&
        !updateTimeManager.shouldUpdate("profit", user)
      ) {
        logger.debug(
          `Skip profit update for ${user}, last update was ${
            Date.now() - updateTimeManager.getLastUpdateTime("profit", user)
          }ms ago`
        );
        result[user] = ProfitStorage.getTodayProfit(user);
      }

      let userProfit = await this.updateProfitFromStartToEnd(
        user,
        startDate,
        endDate
      );
      result[user] = userProfit;
      await delay(1000);
    }
    return result;
  };
  updateProfitFromStartToEnd = async (user, startDate, endDate) => {
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
          let profits = await FuturesClient.getFuturesClient(
            user
          ).futuresIncome({
            startTime: start.getTime(),
            endTime: dayEnd.getTime(),
            limit: 1000,
          });
          await delay(200);
          if (profits.code) {
            logger.error(`[getProfit] Binance API error: ${profits.msg}`);
            break;
          }

          // Lấy tất cả dữ liệu nếu có nhiều trang
          let length = profits.length;
          while (length === 1000) {
            let temp = await FuturesClient.getFuturesClient(user).futuresIncome(
              {
                startTime: profits[profits.length - 1].time,
                endTime: dayEnd.getTime(),
                limit: 1000,
              }
            );
            length = temp.length;
            profits = profits.concat(temp);
            await delay(200);
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
        profit: totalProfit,
        fee: totalFee,
        ref: totalRef,
        funding: totalFunding,
      };
    }
  };

  updateTodayProfit = async (users) => {
    let today = new Date(new Date().toLocaleDateString());
    let start = new Date(today.toLocaleDateString());
    let end = new Date(today.toLocaleDateString());
    for (let user of users) {
      let profit = await this.updateProfitFromStartToEnd(user, start, end);
      await delay(100);
      ProfitStorage.setTodayProfit(user, profit);
    }
  };
  updateYesterdayProfit = async (users) => {
    let yesterday = new Date(new Date().toLocaleDateString());
    yesterday.setDate(yesterday.getDate() - 1);
    let start = new Date(yesterday.toLocaleDateString());
    let end = new Date(yesterday.toLocaleDateString());
    for (let user of users) {
      let profit = await this.updateProfitFromStartToEnd(user, start, end);
      ProfitStorage.setYesterdayProfit(user, profit);
    }
  };
  getTodayProfit = async () => {
    let result = {};
    for (let user of this.users) {
      result[user] = ProfitStorage.getTodayProfit(user);
    }
    return result;
  };
  getYesterdayProfit = async (users) => {
    let result = {};
    for (let user of this.users) {
      result[user] = ProfitStorage.getYesterdayProfit(user);
    }
    return result;
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
module.exports = new Profit();
