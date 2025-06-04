const MongoDb = require("../../core/database/mongodb");

class PositionStorage {
  constructor() {
    this.positions = {};
  }

  setPositions(user, positions) {
    this.positions[user] = positions;
  }

  getPositions(user) {
    return this.positions[user] || [];
  }

  getAllPositions() {
    return Object.values(this.positions).flat();
  }

  async getMonitorPositions(symbol, side, user) {
    return await MongoDb.MonitorPositionModel.find({
      symbol: symbol,
      side: side,
      futuresClientName: user,
      isLimit: false,
      closed: false,
    }).lean();
  }
}

module.exports = new PositionStorage();
