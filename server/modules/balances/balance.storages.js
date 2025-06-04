class BalanceStorage {
  constructor() {
    this.balance = {};
  }

  setBalance(user, balance) {
    this.balance[user] = balance;
  }

  getBalance(user) {
    return (
      this.balance[user] || {
        totalBalance: 0,
        availableBalance: 0,
        unRealizedProfit: 0,
      }
    );
  }

  getAllBalance() {
    return this.balance;
  }
}

module.exports = new BalanceStorage();
