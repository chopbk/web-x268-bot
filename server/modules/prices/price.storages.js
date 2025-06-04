const FuturesClient = require("../../core/clients");
const { getTokenFromSymbol } = require("../symbols/symbol.storages");
class FuturesPrice {
  constructor() {
    this.prices = {};
  }
  init = async () => {
    this.futuresClient = FuturesClient.getFuturesClient("DEFAULT");
    let prices = this.prices;

    // Get 24h price change statistics for all symbols
    this.futuresClient.futuresMiniTickerStream(false, (datas) => {
      datas.map((data) => {
        prices[data.symbol] = parseFloat(data.close);
      });
    });
    if (process.env.BYBIT) {
      this.futuresClient2 = FuturesClient.getFuturesClient("BYBIT");
    }
    if (process.env.OKEX) {
      this.futuresClient3 = FuturesClient.getFuturesClient("OKEX");
    }
  };
  getSymbolPrice = async function (symbol, exchange = "binance") {
    if (this.prices[symbol]) return this.prices[symbol];
    let token = getTokenFromSymbol(symbol);
    if (this.prices[token + "USDT"]) return this.prices[token + "USDT"];
    if (exchange == "okex" && symbol.includes("1000")) {
      return this.futuresClient3.getFuturesPrices(token + "-USDT-SWAP");
    }
    symbol = token + "USDT";
    if (this.prices["1000" + symbol]) return this.prices["1000" + symbol];
    if (exchange == "bybit")
      return await this.futuresClient2.getFuturesPrices(symbol);

    return await this.futuresClient.getSymbolPrice(symbol, exchange);
  };
}
module.exports = new FuturesPrice();
