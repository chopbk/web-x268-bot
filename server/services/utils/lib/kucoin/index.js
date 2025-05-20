const api = require("./kucoin");
const logger = require("../../logger");
class FuturesClient {
    constructor() {
        this.clientApi = new api();
    }
    init(config) {
        this.clientApi.init(config);
        this.exchange = "kucoin";
        return this.clientApi;
    }
    getFuturesClient() {
        return this.clientApi;
    }
    async getAllContracts() {
        let allContracts = await this.clientApi.getAllContracts();
        return allContracts.data;
    }
    futuresGetSymbolPrice = async (symbol) => {
        let prices = await this.clientApi.getTicker(symbol);
        return parseFloat(prices.data.price);
    };
    futuresOpenShort = (symbol, price = 0, size, leverage) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "market",
            side: "sell",
            size: size,
            leverage: leverage,
        });
    };
    futuresTakeProfitShort = async (symbol, price) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "buy",
            stop: "down",
            stopPriceType: "TP",
            stopPrice: price,
            type: "market",
            closeOrder: true,
        });
    };
    futuresLimitCloseShort = async (symbol, price, size = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "limit",
            side: "buy",
            price: price,
            size: size,
            closeOnly: true,
        });
    };
    futuresStopLossShort = async (symbol, stoplossPrice, quantity = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "buy",
            stop: "up",
            stopPriceType: "TP",
            stopPrice: stoplossPrice,
            type: "market",
            closeOrder: true,
        });
    };
    futuresStopLimitShort = async (symbol, price, stoplossPrice, quantity = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "buy",
            stop: "up",
            stopPriceType: "TP",
            stopPrice: price,
            price: stoplossPrice,
            closeOrder: true,
        });
    };
    futuresMarketCloseShort = async (symbol, size = 0) => {
        let closeOnly = !!size;
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "market",
            side: "buy",
            size: size,
            closeOrder: !closeOnly,
            closeOnly: closeOnly,
        });
    };

    futuresOpenLong = (symbol, price = 0, size, leverage) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "market",
            side: "buy",
            size: size,
            leverage: leverage,
        });
    };
    futuresTakeProfitLong = async (symbol, price) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "sell",
            stop: "up",
            stopPriceType: "TP",
            stopPrice: price,
            type: "market",
            closeOrder: true,
        });
    };
    futuresLimitCloseLong = async (symbol, price, size = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "limit",
            side: "sell",
            price: price,
            size: size,
            closeOnly: true,
            stopPrice: price,
            stopPriceType: "TP",
            stop: "up",
        });
    };
    futuresStopLossLong = async (symbol, stoplossPrice, size = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "sell",
            stop: "down",
            stopPriceType: "TP",
            stopPrice: stoplossPrice,
            type: "market",
            closeOrder: true,
        });
    };
    futuresStopLimitLong = async (symbol, price, stoplossPrice, quantity = 0) => {
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            side: "sell",
            stop: "down",
            stopPriceType: "TP",
            stopPrice: price,
            price: stoplossPrice,
            closeOrder: true,
        });
    };
    futuresMarketCloseLong = async (symbol, size = 0) => {
        let closeOnly = !!size;
        let clientOid = Math.random().toString(36).substring(7);
        return this.clientApi.placeOrder({
            clientOid: clientOid,
            symbol: symbol,
            type: "market",
            side: "sell",
            size: size,
            closeOrder: !closeOnly,
            closeOnly: closeOnly,
        });
    };

    futuresCancel = async (symbol, order) => {
        let id = order.orderId;
        return this.clientApi.cancelOrder({ id: id });
    };
    cancelAllOrders = async (symbol) => {
        return this.clientApi.cancelAllOrders({ symbol: symbol });
    };
    cancelAllStopOrders = async (symbol) => {
        return this.clientApi.cancelAllStopOrders({ symbol: symbol });
    };
    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        try {
            await this.clientApi.cancelAllOrders({ symbol: symbol });
            await this.clientApi.cancelAllStopOrders({ symbol: symbol });
        } catch (error) {
            logger.error(`[futuresCancelAllOrdersOfSymbol] ${error.message}`);
        }
    };
    futuresCancelMultiOrderOfSymbol = async (symbol) => {
        return this.futuresCancelAllOrdersOfSymbol(symbol);
    };
    futuresAccountBalance = async () => {
        try {
            let balance = await this.clientApi.getAccountOverview({ currency: "USDT" });
            return {
                balance: balance.data.marginBalance,
                crossUnPnl: balance.data.unrealisedPNL,
                availableBalance: balance.data.availableBalance,
            };
        } catch (error) {
            logger.error(`[futuresBalance] ${error.message}`);
            return {};
        }
    };
    futuresGetAllPositions = async (symbol = false) => {
        try {
            let allPositions = [];
            if (symbol) {
                let position = await this.futuresGetOpenPosition(symbol);
                if (!!position) allPositions.push(position);
            } else {
                let positions = await this.clientApi.getAllPositions();
                if (!!positions.data) {
                    positions.data.map((position) => {
                        if (parseFloat(position.currentQty) != 0 && position.isOpen === true)
                            allPositions.push({
                                symbol: position.symbol,
                                positionAmt: position.currentQty,
                                currentCost: position.currentCost,
                                costAmount: position.posMargin,
                                isolatedWallet: position.posMargin,
                                unRealizedProfit: position.unrealisedPnl,
                                entryPrice: position.avgEntryPrice,
                                markPrice: position.markPrice,
                                liquidationPrice: position.liquidationPrice,
                                marginType: position.crossMode ? "cross" : "isolated",
                                leverage: position.realLeverage,
                                positionSide: position.currentQty < 0 ? "SHORT" : "LONG",
                            });
                    });
                }
            }
            return allPositions;
        } catch (error) {
            console.log("futuresGetAllPositions");
            console.log(error.message);
        }
    };
    futuresGetOpenPosition = async (symbol) => {
        try {
            let position = await this.clientApi.getPosition({ symbol: symbol });
            if (!!position.data) {
                if (parseFloat(position.data.currentQty) != 0 && position.data.isOpen === true)
                    return {
                        symbol: position.data.symbol,
                        positionAmt: position.data.currentQty,
                        currentCost: position.data.currentCost,
                        costAmount: position.data.posMargin,
                        isolatedWallet: position.data.posMargin,
                        unRealizedProfit: position.data.unrealisedPnl,
                        entryPrice: position.data.avgEntryPrice,
                        markPrice: position.data.markPrice,
                        liquidationPrice: position.data.liquidationPrice,
                        marginType: position.data.crossMode ? "cross" : "isolated",
                        leverage: position.data.realLeverage,
                        positionSide: position.data.currentQty < 0 ? "SHORT" : "LONG",
                    };
            }
            return false;
        } catch (error) {
            logger.error(`[futuresGetOpenPosition] ${error.message}`);
            throw error;
        }
    };
    futuresGetOpenPositionBySymbolAndSide = async (symbol, side) => {
        try {
            let position = await this.clientApi.getPosition({ symbol: symbol });
            if (!!position.data) {
                if (parseFloat(position.data.currentQty) != 0 && position.data.isOpen === true)
                    return {
                        symbol: position.data.symbol,
                        positionAmt: position.data.currentQty,
                        currentCost: position.data.currentCost,
                        costAmount: position.data.posMargin,
                        isolatedWallet: position.data.posMargin,
                        unRealizedProfit: position.data.unrealisedPnl,
                        entryPrice: position.data.avgEntryPrice,
                        markPrice: position.data.markPrice,
                        liquidationPrice: position.data.liquidationPrice,
                        marginType: position.data.crossMode ? "cross" : "isolated",
                        leverage: position.data.realLeverage,
                        positionSide: position.data.currentQty < 0 ? "SHORT" : "LONG",
                    };
            }
            return false;
        } catch (error) {
            logger.error(`[futuresGetOpenPosition] ${error.message}`);
            throw error;
        }
    };
    futuresGetAllOrdersOfSymbol = async (symbol) => {
        try {
            let allOrders = [];
            let order = await this.clientApi.getOrders({ symbol: symbol, status: "active" });
            order.data.items.forEach((order) => {
                allOrders.push({
                    orderId: order.id,
                    positionSide: order.side.toUpperCase(),
                    symbol: order.symbol,
                    side: order.side.toUpperCase(),
                    positionAmt: order.size,
                    type: "limit",
                    price: order.price || 0,
                    stopPrice: order.stopPrice || 0,
                });
            });
            let stopOrder = await this.clientApi.getStopOrders({
                symbol: symbol,
                status: "active",
            });
            stopOrder.data.items.forEach((order) => {
                allOrders.push({
                    orderId: order.id,
                    positionSide: order.side.toUpperCase(),
                    symbol: order.symbol,
                    side: order.side.toUpperCase(),
                    positionAmt: order.size,
                    type:
                        order.side === "sell"
                            ? order.stop == "up"
                                ? "TakeProfit"
                                : "Stoploss"
                            : order.stop == "down"
                            ? "TakeProfit"
                            : "Stoploss",
                    price: order.price || 0,
                    stopPrice: order.stopPrice || 0,
                });
            });
            return allOrders;
        } catch (error) {
            logger.error(`[futuresGetAllOrdersOfSymbol] ${error.message}`);
            return [];
        }
    };
    futuresIncome = async (params = {}) => {
        try {
            let params2 = {};
            if (params.startTime) params2.startAt = params.startTime;
            if (params.endTime) params2.endAt = params.endTime;
            if (params.limit) params2.maxCount = params.limit;
            params.offset = 1322182;
            let transactionHist = await this.clientApi.getTransactionHist(params2);
            let transactionHists = [];
            transactionHist.data.dataList.map((data) => {
                if (data.type === "RealisedPNL") {
                    transactionHists.push({
                        incomeType: "REALIZED_PNL",
                        time: data.time,
                        income: data.amount,
                        symbol: data.remark,
                    });
                }
            });

            return transactionHists;
        } catch (error) {
            return [];
        }
    };
    getOrders = async (params) => {
        return this.clientApi.getOrders(params);
    };
    getStopOrders = async (params) => {
        return this.clientApi.getStopOrders(params);
    };
    /*TODO*/
    futuresUserTrades = async (params) => {
        try {
            return [];
            let newTradeHistorys = [];
            let tradeHistorys = await this.clientApi.listFills(params);
            tradeHistorys.data.items.map((tradeHistory) => {
                if (tradeHistory.symbol == params.symbol)
                    newTradeHistorys.push({
                        symbol: tradeHistory.symbol,
                        price: tradeHistory.price,
                        time: tradeHistory.tradeTime / 1000000,
                    });
            });
            return newTradeHistorys;
        } catch (error) {
            return [];
        }
    };
}
module.exports = FuturesClient;
