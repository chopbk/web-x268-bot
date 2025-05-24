const FuturesClient = require("./client");
const SymbolInfos = require("./symbol-info");
const FuturesPrice = require("./prices");
const Calculate = require("../utils/calculate");
const MongoDb = require("../database/mongodb");
const delay = require("../utils/delay");
const logger = require("../utils/logger");
const updateTimeManager = require("./updateTimeManager");
const futuresGetOpenPositionBySymbolAndSide = async (
  futuresClient,
  symbol = false,
  side = false
) => {
  try {
    const positions = await futuresClient.futuresPositionRisk({
      symbol: symbol,
    });

    if (!!positions.code) throw new Error(JSON.stringify(positions));
    let p = false;
    if (!!side && !!positions)
      p = positions.find((position) => {
        if (
          position.positionSide === side &&
          parseFloat(position.positionAmt) !== 0
        )
          return true;
      });

    return p;
  } catch (error) {
    logger.error(error.message);
    return false;
  }
};
async function updatePositionPrice(pos, exchange) {
  let tickSize = SymbolInfos.getTickSizeOfSymbol(pos.symbol, exchange);
  let token = SymbolInfos.getTokenFromSymbol(pos.symbol, exchange);
  // const stepSize = SymbolInfos.getStepSizeOfSymbol(pos.symbol, exchange);

  // if (exchange === "okex") {
  //   var BigNumber = require("bignumber.js");
  //   pos.positionAmt = new BigNumber(pos.positionAmt * stepSize).toFixed();
  // }
  pos.entryPrice = Calculate.roundPrice(pos.entryPrice, tickSize);
  pos.volume = Calculate.round(
    Math.abs(pos.positionAmt) * pos.entryPrice,
    0.01
  );

  pos.markPrice = await FuturesPrice.getSymbolPrice(token, exchange);

  pos.liquidationPrice = Calculate.roundPrice(pos.liquidationPrice, tickSize);
  // Tính ROI
  const sign = pos.positionSide === "SHORT" ? -1 : 1;
  pos.roi =
    ((pos.markPrice - pos.entryPrice) * 100 * pos.leverage * sign) /
    pos.entryPrice;
  pos.unRealizedProfit =
    (pos.markPrice - pos.entryPrice) * Math.abs(pos.positionAmt) * sign;
  return pos;
}
async function updatePositionInfo(pos, exchange = "binance", user) {
  updatePositionPrice(pos, exchange);
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
  return pos;
}
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
        return await updatePositionInfo(pos, exchange, user);
      })
    );
    openPositions.sort((o1, o2) => o2.unRealizedProfit - o1.unRealizedProfit);

    return openPositions;
  } catch (error) {
    logger.error("Error getting positions:", error);
    return [];
  }
}
async function convertOrderToPosition(user, order) {
  let position = {
    symbol: order.symbol,
    positionSide: order.positionSide,
    positionAmt: order.quantity,
    entryPrice: order.price,
    volume: order.volume,
    liquidationPrice: 0,
    leverage: 10,
  };
  position = await updatePositionInfo(position, "binance", user);
  return position;
}

class Position {
  constructor() {
    this.users = [];
  }
  async init(users) {
    this.users = users;
    for (let user of this.users) {
      await this.updatePositionInfoFromExchange(user);
      await delay(100);
    }
    this.scheduleUpdatePositions();
    this.scheduleUpdatePrice();
  }
  update = async () => {
    for (let user of this.users) {
      let res = await this.updatePositionInfoFromExchange(user);
      if (res) {
        await delay(5000);
      }
    }
  };
  updatePositionInfoFromExchange = async (user) => {
    if (!updateTimeManager.shouldUpdate("position", user)) {
      logger.debug(
        `Skip position update for ${user}, last update was ${
          Date.now() - updateTimeManager.getLastUpdateTime("position", user)
        }ms ago`
      );
      return false;
    }

    const positions = await getPositionsInfo(user);
    this[user] = positions;

    logger.info(`Positions for ${user} fetched`);
    return true;
  };
  updatePositionInfoByUserStreamData = async (user, order) => {
    let type = "ORDER_FILLED";
    if (!updateTimeManager.shouldUpdate("position", user, 1000 * 5)) {
      logger.debug(
        `Skip position update for ${user}, last update was ${
          Date.now() - updateTimeManager.getLastUpdateTime("position", user)
        }ms ago`
      );
      let position = this[user].find(
        (p) =>
          p.symbol === order.symbol && p.positionSide === order.positionSide
      );
      if (position) {
        if (order.open) {
          position.positionAmt += order.quantity;
        } else {
          position.positionAmt -= order.quantity;
          if (position.positionAmt * order.price < 5) {
            type = "POSITION_CLOSED";
          }
        }
      } else {
        type = "POSITION_OPENED";
        this[user].push(await convertOrderToPosition(user, order));
      }
      return type;
    }
    const futuresClient = FuturesClient.getFuturesClient(user);
    let position = await futuresGetOpenPositionBySymbolAndSide(
      futuresClient,
      order.symbol,
      order.positionSide
    );

    if (position) {
      position = await updatePositionInfo(
        position,
        futuresClient.exchange,
        user
      );
      // tìm positon trong this[user]
      const positionIndex = this[user].findIndex(
        (p) =>
          p.symbol === order.symbol && p.positionSide === order.positionSide
      );
      if (positionIndex !== -1) {
        // mở thêm hoặc đóng bớt
        this[user][positionIndex] = position;
      } else {
        type = "POSITION_OPENED";
        this[user].push(position);
      }
    } else {
      type = "POSITION_CLOSED";
      this[user] = this[user].filter(
        (p) =>
          p.symbol !== order.symbol || p.positionSide !== order.positionSide
      );
    }

    logger.info(`Positions for ${user} fetched`);
    return type;
  };
  getPositionsInfo = async (user) => {
    return this[user];
  };
  scheduleUpdatePositions = async () => {
    setInterval(async () => {
      for (let user of this.users) {
        await this.updatePositionInfoFromExchange(user);
        await delay(10000);
      }
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
      updatePositionPrice(pos, exchange);
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
