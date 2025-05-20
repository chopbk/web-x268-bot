const FuturesClient = require("./client");
const SymbolInfos = require("./symbol-info");
const FuturesPrice = require("./prices");
const Calculate = require("../utils/calculate");
const MongoDb = require("../database/mongodb");
const delay = require("../utils/delay");
const logger = require("../utils/logger");
async function getPositionsInfo(user) {
  try {
    const futuresClient = FuturesClient.getFuturesClient(user);
    const exchange = futuresClient.exchange;

    const positions = await futuresClient.futuresGetAllPositions();

    // Lọc các vị thế có số lượng > 0
    const openPositions = positions.filter((p) => Math.abs(p.positionAmt) > 0);

    // Cập nhật thông tin cho từng vị thế
    await Promise.all(
      openPositions.map(async (pos) => {
        let tickSize = SymbolInfos.getTickSizeOfSymbol(pos.symbol, exchange);
        const stepSize = SymbolInfos.getStepSizeOfSymbol(pos.symbol, exchange);

        if (exchange === "okex") {
          var BigNumber = require("bignumber.js");
          pos.positionAmt = new BigNumber(pos.positionAmt * stepSize).toFixed();
        }

        pos.entryPrice = Calculate.roundPrice(pos.entryPrice, tickSize);
        pos.volume = Calculate.round(
          Math.abs(pos.positionAmt) * pos.entryPrice,
          0.01
        );
        updatePosition(pos, exchange);
        let monitorPosition = await MongoDb.MonitorPositionModel.find({
          symbol: pos.symbol,
          side: pos.positionSide,
          futuresClientName: user,
          isLimit: false,
          closed: false,
        }).lean();
        if (monitorPosition.length > 0) {
          monitorPosition.map((p) => {
            pos.type = `${p.type}`;
          });
        } else {
          pos.type = `NONE `;
        }
        pos.user = user;
      })
    );
    openPositions.sort((o1, o2) => o2.unRealizedProfit - o1.unRealizedProfit);

    return openPositions;
  } catch (error) {
    logger.error("Error getting positions:", error);
    return [];
  }
}
updatePosition = async (pos, exchange) => {
  let token = SymbolInfos.getTokenFromSymbol(pos.symbol, exchange);
  let tickSize = SymbolInfos.getTickSizeOfSymbol(pos.symbol, exchange);
  pos.markPrice = await FuturesPrice.getSymbolPrice(token, exchange);
  pos.markPrice = Calculate.roundPrice(pos.markPrice, tickSize);
  pos.liquidationPrice = Calculate.roundPrice(pos.liquidationPrice, tickSize);

  // Tính ROI
  const sign = pos.positionSide === "SHORT" ? -1 : 1;
  pos.roi =
    ((pos.markPrice - pos.entryPrice) * 100 * pos.leverage * sign) /
    pos.entryPrice;
  pos.unRealizedProfit =
    (pos.markPrice - pos.entryPrice) * Math.abs(pos.positionAmt) * sign;
};
class Position {
  constructor() {}
  async init(users) {
    this.users = users;
    for (let user of users) {
      const positions = await getPositionsInfo(user);
      this[user] = positions;
      await delay(1000);
      logger.info(`Positions for ${user} fetched`);
    }

    this.scheduleUpdatePositions();
    this.scheduleUpdatePrice();
  }
  getPositionsInfo = async (user) => {
    return this[user];
  };
  scheduleUpdatePositions = async () => {
    setInterval(async () => {
      await this.init(this.users);
    }, 1000 * 60 * 10);
  };
  scheduleUpdatePrice = async () => {
    setInterval(async () => {
      this.users.map(async (user) => {
        await this.updatePrice(user);
      });
    }, 1000);
  };
  updatePrice = async (user) => {
    const futuresClient = FuturesClient.getFuturesClient(user);
    const exchange = futuresClient.exchange;
    let openPositions = this[user];
    openPositions.map(async (pos) => {
      updatePosition(pos, exchange);
    });
  };
  getAllPositions = async () => {
    let positions = [];
    this.users.map(async (user) => {
      positions = positions.concat(this[user]);
    });
    return positions;
  };
}
module.exports = new Position();
