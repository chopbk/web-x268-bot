const logger = require("../../core/utils/logger");
const FuturesClient = require("../../core/clients");
const delay = require("../../core/utils/delay");
const updateTimeManager = require("../../core/utils/update-timer");
const BalanceStorage = require("./balance.storages");
class Balance {
  constructor() {
    this.users = [];
  }
  async init(users) {
    this.users = users;
    await this.updateBalance(users);
  }
  update = async () => {
    await this.updateBalance(this.users);
  };
  updateBalance = async (users) => {
    try {
      for (let user of users) {
        let res = await this.updateBalanceOfUser(user);
        if (res) {
          await delay(1000);
        }
      }
      return BalanceStorage.getAllBalance();
    } catch (error) {
      logger.error(`[getBalance] error ${error}`);
      return {};
    }
  };
  updateBalanceOfUser = async (user) => {
    if (!updateTimeManager.shouldUpdate("balance", user)) {
      logger.debug(
        `Skip balance update for ${user}, last update was ${
          Date.now() - updateTimeManager.getLastUpdateTime("balance", user)
        }ms ago`
      );
      return BalanceStorage.getBalance(user);
    }

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
    BalanceStorage.setBalance(user, userBalance);
    return userBalance;
  };
  getBalance = async (user) => {
    return BalanceStorage.getBalance(user);
  };
  getAllBalance = async () => {
    return BalanceStorage.getAllBalance();
  };
}
module.exports = new Balance();
