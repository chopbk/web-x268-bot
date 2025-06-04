const Position = require("../../modules/positions/position.services");
const Profit = require("../../modules/profits/profit.services");
const Balance = require("../../modules/balances/balance.services");

const getBotInfo = async (users) => {
  const positions = await Position.getAllPositions();
  let todayProfits = await Profit.getTodayProfit(users);
  let yesterdayProfits = await Profit.getYesterdayProfit(users);
  let balances = await Balance.getAllBalance();

  let todayProfit = Object.keys(todayProfits).reduce(
    (sum, user) => sum + todayProfits[user].profit,
    0
  );
  let yesterdayProfit = Object.keys(yesterdayProfits).reduce(
    (sum, user) => sum + yesterdayProfits[user].profit,
    0
  );
  let totalBalance = Object.keys(balances).reduce(
    (sum, user) => sum + balances[user].availableBalance,
    0
  );
  let unrealizedProfit = Object.keys(balances).reduce(
    (sum, user) => sum + balances[user].unrealizedProfit,
    0
  );

  return {
    version: "1.0.0",
    status: "Running",
    users: users.join(", "),
    lastUpdate: new Date().toLocaleString(),
    totalPositions: positions.length,
    totalUser: users.length,
    totalProfit: todayProfit,
    totalProfitYesterday: yesterdayProfit,
    totalBalance: totalBalance,
    unrealizedProfit: unrealizedProfit,
  };
};

const getBalanceAndProfit = async (users) => {
  let result = [];
  let profits = await Profit.getTodayProfit();
  let yesterdayProfits = await Profit.getYesterdayProfit();
  let balances = await Balance.getAllBalance();
  for (let user of users) {
    result.push({
      account: user,
      ...balances[user],
      ...profits[user],
      yesterdayProfit: yesterdayProfits[user],
    });
  }
  return result;
};

const updateBalanceAndProfit = async (startDate, endDate, users) => {
  if (!startDate) startDate = new Date().toLocaleDateString();
  if (!endDate) endDate = new Date().toLocaleDateString();
  let result = [];
  let profits = await Profit.updateProfit(users, startDate, endDate);
  let balances = await Balance.updateBalance(users);
  for (let user of users) {
    result.push({
      account: user,
      ...balances[user],
      ...profits[user],
    });
  }
  return result;
};

module.exports = {
  getBotInfo,
  getBalanceAndProfit,
  updateBalanceAndProfit,
};
