class ProfitStorage {
  constructor() {
    this.profit = {};
    this.todayProfit = {};
    this.yesterdayProfit = {};
    this.profits = {};
  }

  setProfit(user, profit) {
    this.profit[user] = profit;
  }
  setTodayProfit(user, profit) {
    this.todayProfit[user] = profit;
  }
  setYesterdayProfit(user, profit) {
    console.log(this);
    this.yesterdayProfit[user] = profit;
  }
  getTodayProfit(user) {
    return this.todayProfit[user] || {};
  }
  getYesterdayProfit(user) {
    // console.log("getYesterdayProfit");
    // console.log(this);
    return this.yesterdayProfit[user] || {};
  }

  getProfit(user) {
    return (
      this.profit[user] || {
        totalProfit: 0,
        timestamp: Date.now(),
      }
    );
  }

  getAllProfit() {
    return this.profit;
  }
}

module.exports = new ProfitStorage();
