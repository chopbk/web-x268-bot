const logger = require("../utils/logger");
const FuturesClient = require("./client");
const delay = require("../utils/delay");
class Balance {
  constructor() {}
  async init(users) {
    this.users = users;
    this.balance = {};
    await this.updateBalance(users);
  }
  update = async () => {
    await this.updateBalance(this.users);
  };
  updateBalance = async (users) => {
    try {
      for (let user of users) {
        this.balance[user] = await this.updateBalanceOfUser(user);
        await delay(100);
      }
      return this.balance;
    } catch (error) {
      logger.error(`[getBalance] error ${error}`);
      return {};
    }
  };
  updateBalanceOfUser = async (user) => {
    let userBalance = {
      balance: "",
      availableBalance: 0,
      unrealizedProfit: 0,
    };
    let accountBalances = await FuturesClient.getFuturesClient(
      user
    ).futuresAccountBalance();
    if (accountBalances.code) {
      logger.error(`[getBalance] ${user} error ${accountBalances.msg}`);
      return {};
    }
    accountBalances.map((b) => {
      userBalance.balance += `\n${parseFloat(b.balance).toFixed(2)} ${b.asset}`;
      if (b.asset == "USDT") {
        userBalance.availableBalance += parseFloat(b.availableBalance);
        userBalance.unrealizedProfit += parseFloat(b.crossUnPnl);
      }
    });
    return userBalance;
  };
  getBalance = async (user) => {
    return this.balance[user];
  };
  getAllBalance = async () => {
    return this.balance;
  };
}
module.exports = new Balance();
