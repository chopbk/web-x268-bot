const FuturesClient = require("../../core/clients");
const SymbolInfos = require("../symbols/symbol.storages");
const FuturesPrice = require("../prices/price.storages");
const Calculate = require("../../core/utils/calculate");
const delay = require("../../core/utils/delay");
const logger = require("../../core/utils/logger");
const updateTimeManager = require("../../core/utils/update-timer");
const PositionStorage = require("./position.storages");
const {
  ValidationError,
  NotFoundError,
  PartialSuccessError,
  handleBinanceError,
} = require("../../core/utils/error-handler");

class PositionService {
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
  updateBySymbolAndSide = async (user, symbol, side) => {
    const futuresClient = FuturesClient.getFuturesClient(user);

    const position = await this.futuresGetOpenPositionBySymbolAndSide(
      futuresClient,
      symbol,
      side
    );
    if (position) {
      position = await this.updatePositionInfo(
        position,
        futuresClient.exchange,
        user
      );
      let positions = PositionStorage.getPositions(user);
      const positionIndex = positions.findIndex(
        (p) =>
          p.symbol === order.symbol && p.positionSide === order.positionSide
      );
      if (positionIndex !== -1) {
        positions[positionIndex] = position;
      } else {
        positions.push(position);
      }
      PositionStorage.setPositions(user, positions);
    } else {
      let positions = PositionStorage.getPositions(user);
      positions = positions.filter(
        (p) =>
          p.symbol !== order.symbol || p.positionSide !== order.positionSide
      );
      PositionStorage.setPositions(user, positions);
    }
  };

  async updatePositionInfoFromExchange(user) {
    if (!updateTimeManager.shouldUpdate("position", user)) {
      logger.debug(
        `Skip position update for ${user}, last update was ${
          Date.now() - updateTimeManager.getLastUpdateTime("position", user)
        }ms ago`
      );
      return false;
    }

    const positions = await this.getPositionsInfo(user);
    PositionStorage.setPositions(user, positions);

    logger.info(`Positions for ${user} fetched`);
    return true;
  }

  async updatePositionInfoByUserStreamData(user, order) {
    let type = "ORDER_FILLED";
    if (!updateTimeManager.shouldUpdate("position", user, 1000 * 5)) {
      logger.debug(
        `Skip position update for ${user}, last update was ${
          Date.now() - updateTimeManager.getLastUpdateTime("position", user)
        }ms ago`
      );
      let positions = PositionStorage.getPositions(user);
      let position = positions.find(
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
        positions.push(await this.convertOrderToPosition(user, order));
      }
      PositionStorage.setPositions(user, positions);
      return type;
    }
    const futuresClient = FuturesClient.getFuturesClient(user);
    let position = await this.futuresGetOpenPositionBySymbolAndSide(
      futuresClient,
      order.symbol,
      order.positionSide
    );

    if (position) {
      position = await this.updatePositionInfo(
        position,
        futuresClient.exchange,
        user
      );
      let positions = PositionStorage.getPositions(user);
      const positionIndex = positions.findIndex(
        (p) =>
          p.symbol === order.symbol && p.positionSide === order.positionSide
      );
      if (positionIndex !== -1) {
        positions[positionIndex] = position;
      } else {
        type = "POSITION_OPENED";
        positions.push(position);
      }
      PositionStorage.setPositions(user, positions);
    } else {
      type = "POSITION_CLOSED";
      let positions = PositionStorage.getPositions(user);
      positions = positions.filter(
        (p) =>
          p.symbol !== order.symbol || p.positionSide !== order.positionSide
      );
      PositionStorage.setPositions(user, positions);
    }

    logger.info(`Positions for ${user} fetched`);
    return type;
  }

  async getPositionsInfo(user) {
    try {
      const futuresClient = FuturesClient.getFuturesClient(user);
      const exchange = futuresClient.exchange;

      const positions = await futuresClient.futuresGetAllPositions();

      const openPositions = positions.filter(
        (p) => Math.abs(p.positionAmt) > 0
      );

      await Promise.all(
        openPositions.map(async (pos) => {
          return await this.updatePositionInfo(pos, exchange, user);
        })
      );
      openPositions.sort((o1, o2) => o2.unRealizedProfit - o1.unRealizedProfit);

      return openPositions;
    } catch (error) {
      logger.error("Error getting positions:", error);
      return [];
    }
  }

  async convertOrderToPosition(user, order) {
    let position = {
      symbol: order.symbol,
      positionSide: order.positionSide,
      positionAmt: order.quantity,
      entryPrice: order.price,
      volume: order.volume,
      liquidationPrice: 0,
      leverage: 10,
    };
    position = await this.updatePositionInfo(position, "binance", user);
    return position;
  }

  async futuresGetOpenPositionBySymbolAndSide(
    futuresClient,
    symbol = false,
    side = false
  ) {
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
  }

  async updatePositionPrice(pos, exchange) {
    let tickSize = SymbolInfos.getTickSizeOfSymbol(pos.symbol, exchange);
    let token = SymbolInfos.getTokenFromSymbol(pos.symbol, exchange);

    pos.entryPrice = Calculate.roundPrice(pos.entryPrice, tickSize);
    pos.volume = Calculate.round(
      Math.abs(pos.positionAmt) * pos.entryPrice,
      0.01
    );

    pos.markPrice = await FuturesPrice.getSymbolPrice(token, exchange);

    pos.liquidationPrice = Calculate.roundPrice(pos.liquidationPrice, tickSize);
    const sign = pos.positionSide === "SHORT" ? -1 : 1;
    pos.roi =
      ((pos.markPrice - pos.entryPrice) * 100 * pos.leverage * sign) /
      pos.entryPrice;
    pos.unRealizedProfit =
      (pos.markPrice - pos.entryPrice) * Math.abs(pos.positionAmt) * sign;
    return pos;
  }

  async updatePositionInfo(pos, exchange = "binance", user) {
    await this.updatePositionPrice(pos, exchange);
    let monitorPosition = await PositionStorage.getMonitorPositions(
      pos.symbol,
      pos.positionSide,
      user
    );
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

  async updatePrice(user) {
    const futuresClient = FuturesClient.getFuturesClient(user);
    const exchange = futuresClient.exchange;
    let openPositions = PositionStorage.getPositions(user);
    openPositions.map(async (pos) => {
      await this.updatePositionPrice(pos, exchange);
    });
  }

  async getAllPositions() {
    return PositionStorage.getAllPositions();
  }

  async getPosition(user, symbol, side) {
    try {
      const futuresClient = FuturesClient.getFuturesClient(user);
      const position = await this.futuresGetOpenPositionBySymbolAndSide(
        futuresClient,
        symbol,
        side
      );
      if (position) {
        await this.updatePositionPrice(position, futuresClient);
        await this.updatePositionInfo(position, futuresClient, user);
      }
      return position;
    } catch (error) {
      logger.error(`Error getting position: ${error.message}`);
      throw error;
    }
  }

  async closePosition(user, symbol, side, percent) {
    try {
      if (!user || !symbol || !side || !percent) {
        throw new ValidationError("Thiếu thông tin bắt buộc");
      }

      const futuresClient = FuturesClient.getFuturesClient(user);
      const position = await this.futuresGetOpenPositionBySymbolAndSide(
        futuresClient,
        symbol,
        side
      );

      if (!position) {
        throw new NotFoundError("Không tìm thấy position");
      }

      let stepSize = SymbolInfos.getStepSizeOfSymbol(
        symbol,
        futuresClient.exchange
      );
      let positionAmt = Calculate.roundAmount(
        position.positionAmt * (percent / 100),
        stepSize
      );
      let tickSize = SymbolInfos.getTickSizeOfSymbol(
        symbol,
        futuresClient.exchange
      );
      let sign = position.positionSide === "SHORT" ? -1 : 1;
      let closePrice = Calculate.roundPrice(
        position.markPrice * (1 - sign * 0.006),
        tickSize
      );

      let order;
      try {
        switch (side) {
          case "LONG":
            order = await futuresClient.futuresLimitCloseLong(
              symbol,
              closePrice,
              positionAmt
            );
            break;
          case "SHORT":
            order = await futuresClient.futuresLimitCloseShort(
              symbol,
              closePrice,
              positionAmt
            );
            break;
          default:
            throw new ValidationError("Side không hợp lệ");
        }
      } catch (error) {
        handleBinanceError(error);
      }

      if (order.code) {
        handleBinanceError(order);
      }

      logger.info(`Closed ${percent}% of position ${symbol} for user ${user}`);
      return order;
    } catch (error) {
      logger.error(`Error closing position: ${error.message}`);
      error.message = `${symbol} ${side} ${percent} ${error.message}`;
      throw error;
    }
  }

  async closeAllPositions(user) {
    try {
      if (!user) {
        throw new ValidationError("Thiếu thông tin user");
      }

      const positions = PositionStorage.getPositions(user);
      if (!positions || positions.length === 0) {
        throw new NotFoundError("Không tìm thấy positions nào");
      }

      const results = {
        success: [],
        failed: [],
      };

      for (let position of positions) {
        try {
          const result = await this.closePosition(
            user,
            position.symbol,
            position.positionSide,
            100
          );
          results.success.push({
            symbol: position.symbol,
            side: position.positionSide,
            ...result,
          });
        } catch (error) {
          logger.error(
            `Error closing position ${position.symbol} for user ${user}: ${error.message}`
          );
          results.failed.push({
            symbol: position.symbol,
            side: position.positionSide,
            error: error.message,
            code: error.code || "UNKNOWN_ERROR",
          });
        }
      }

      // Nếu có bất kỳ lỗi nào xảy ra
      if (results.failed.length > 0) {
        throw new PartialSuccessError(
          "Một số positions đóng không thành công",
          results
        );
      }

      return results;
    } catch (error) {
      logger.error(`Error in closeAllPositions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PositionService();
