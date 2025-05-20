const MongoDb = require("../database/mongodb");
const logger = require("../utils/logger");
const schedule = require("node-schedule");
const symbolExchange = {
  binance: (token) => token + "USDT",
  huobi: (token) => token + "-USDT",
  kucoin: (token) => token + "USDTM",

  okex: (token) => token + "-USDT-SWAP",
  spot: (token) => token + "USDT",

  bitget: (token) => token + "USDT",
  bybit: (token) => token + "USDT",
  bingx: (token) => token + "-USDT",
  busd: (token) => token + "BUSD",
};

class SymbolInfo {
  constructor() {
    this.symbols = {};
    this.binance = {
      symbolInfos: {},
    };
    this.symbolNames = {};
    if (process.env.BYBIT)
      this.bybit = {
        symbolInfos: {},
      };
    if (process.env.OKEX)
      this.okex = {
        symbolInfos: {},
      };
    if (process.env.SPOT_BINANCE)
      this.spot = {
        symbolInfos: {},
      };
    if (process.env.BITGET)
      this.bitget = {
        symbolInfos: {},
      };
    if (process.env.BINGX)
      this.bingx = {
        symbolInfos: {},
      };
  }
  getCorrectSymbolByExchange = (symbol, exchange = "binance") => {
    let token = this.getTokenFromSymbol(symbol, exchange);
    return symbolExchange[exchange](token);
  };
  getTokenFromSymbol = (symbol, exchange = "binance") => {
    let token = symbol
      .replace("-USDT-SWAP", "")
      .replace("-USDT", "")
      .replace("USDT", "");
    if (exchange == "okex" || exchange == "spot")
      token = token.replace("1000", "");

    return token;
  };

  async init() {
    let message = `[FuturesSymbolInit] Binance: true MULTI ${
      process.env.MULTI || false
    }`;

    if (process.env.MULTI)
      message += ` BYBIT ${process.env.BYBIT} OKEX ${process.env.OKEX} BITGET ${process.env.BITGET} SPOT_BINANCE ${process.env.SPOT_BINANCE}`;
    logger.verbose(message);
    await this.setSymbolInfos();
    const SymbolInfo = this;

    // start job get symbolInfo from db
    schedule.scheduleJob("50 */4 * * *", async function () {
      await SymbolInfo.setSymbolInfos();
    });
  }

  /**
   * @function setSymbolInfos
   * @description Set futures symbol info into local storage, get data from database.
   * @returns {Promise<void>}
   */
  async setSymbolInfos() {
    try {
      const setSymbolInfo = async (exchange) => {
        let token = null;
        let symbolInfos = await MongoDb.getFuturesSymbolModel()
          .find({ exchange: exchange })
          .lean();
        if (!this[exchange].symbolInfos || !symbolInfos) {
          throw new Error("please check futures symbol table in Database");
        }
        symbolInfos.map((e) => {
          if (e.symbol.includes("USDT")) {
            token = this.getTokenFromSymbol(e.symbol, exchange);
            this[exchange].symbolInfos[e.symbol] = e;
            this.symbols[token] = e.symbol;
            if (e.name && !e.name.includes(" ") && e.name !== token)
              this.symbolNames[e.name] = token;
          }
        });
      };
      if (!!process.env.OKEX) {
        await setSymbolInfo("okex");
      }
      if (!!process.env.BYBIT) {
        await setSymbolInfo("bybit");
      }
      if (!!process.env.BITGET) {
        await setSymbolInfo("bitget");
      }
      if (!!process.env.BINGX) {
        await setSymbolInfo("bingx");
      }
      if (!!process.env.SPOT_BINANCE) {
        let symbolInfos = await MongoDb.getSpotSymbolModel()
          .find({ exchange: "spot" })
          .lean();

        symbolInfos.map((e) => {
          if (e.symbol.includes("USDT")) {
            let token = this.getTokenFromSymbol(e.symbol);
            this.spot.symbolInfos[e.symbol] = e;
            this.symbols[token] = e.symbol;
          }
        });
      }
      await setSymbolInfo("binance");

      return;
    } catch (error) {
      logger.error(`[setSymbolInfos] error: ${error.message}`);
    }
  }
  getSymbolInfo(symbol, exchange = "binance") {
    let s = this.getCorrectSymbolByExchange(symbol, exchange);
    return (
      this[exchange].symbolInfos[s] || this[exchange].symbolInfos["1000" + s]
    );
  }
  getSymbolList() {
    return Object.keys(this.symbols);
  }
  getSymbolListByExchange(exchange) {
    let symbols = Object.keys(this[exchange].symbolInfos).map(
      (symbol) => this[exchange].symbolInfos[symbol].symbol
    );
    return symbols;
  }
  isSymbolInfoExist(symbol, exchange = "binance") {
    let s = this.getCorrectSymbolByExchange(symbol, exchange);
    return this[exchange].symbolInfos[s];
  }
  /**
   * Check if symbol info exists by name of symbol
   * @param {string} text - name of symbol
   * @returns {boolean} - true if symbol info exist
   */
  isSymbolInfoExistByName(text) {
    // if text is name of symbol
    if (this.symbolNames[text]) {
      // get correct symbol from name
      let symbol = this.symbolNames[text];
      return this.isSymbolExist(symbol);
    }
    return false;
  }
  isSymbolExist(symbol) {
    return this.symbols[symbol] || this.symbols[`1000${symbol}`];
  }
  getTickSizeOfSymbol(symbol, exchange = "binance") {
    //price
    let symbolInfo = this.getSymbolInfo(symbol, exchange);
    if (symbolInfo) {
      return parseFloat(symbolInfo.tickSize);
    }
    return 0;
  }
  getStepSizeOfSymbol(symbol, exchange = "binance") {
    // amount
    let symbolInfo = this.getSymbolInfo(symbol, exchange);
    if (symbolInfo) {
      return parseFloat(symbolInfo.stepSize);
    }
    return 0;
  }
}
module.exports = new SymbolInfo();
