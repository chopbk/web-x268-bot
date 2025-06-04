const logger = require("../../logger");
const Binance = require("./lib");

function binanceFutures(options) {
    const binance = new Binance(options);
    binance.exchange = "binance";
    binance.futuresOpenShort = async (symbol, price = 0, quantity, stopPrice = 0) => {
        const orderParams = {
            positionSide: "SHORT",
            type: stopPrice ? (price ? "STOP" : "STOP_MARKET") : price ? "LIMIT" : "MARKET",
        };

        if (price) orderParams.newOrderRespType = "RESULT";
        if (stopPrice) orderParams.stopPrice = stopPrice;

        return binance.futuresOrder("SELL", symbol, quantity, price, orderParams);
    };
    binance.futuresTakeProfitShort = async (symbol, stopPrice, quantity = 0) => {
        return binance.futuresOrder("BUY", symbol, quantity, false, {
            positionSide: "SHORT",
            type: "TAKE_PROFIT_MARKET",
            closePosition: true,
            stopPrice: stopPrice,
            quantity: 0,
            workingType: "CONTRACT_PRICE",
        });
    };
    binance.futuresLimitCloseShort = async (symbol, price, quantity = 0) => {
        return binance.futuresOrder("BUY", symbol, quantity, false, {
            positionSide: "SHORT",
            type: "LIMIT",
            price: price,
            quantity: quantity,
        });
    };

    binance.futuresStopLossShort = async (
        symbol,
        stoplossPrice,
        quantity = 0,
        stopPrice = false,
        workingType = "CONTRACT_PRICE"
    ) => {
        return binance.futuresOrder("BUY", symbol, quantity, false, {
            positionSide: "SHORT",
            type: "STOP_MARKET",
            // closePosition: true,
            stopPrice: stoplossPrice,
            workingType: workingType,
            quantity: quantity,
        });
    };
    binance.futuresStopLimitShort = async (symbol, price, triggerPrice, quantity = 0) => {
        return binance.futuresOrder("BUY", symbol, quantity, false, {
            positionSide: "SHORT",
            type: "STOP",
            price: price,
            stopPrice: triggerPrice,
            quantity: quantity,
            priceProtect: true,
            workingType: "CONTRACT_PRICE",
        });
    };
    binance.futuresMarketCloseShort = async (symbol, quantity = 0) => {
        return binance.futuresOrder("BUY", symbol, quantity, false, {
            positionSide: "SHORT",
            type: "MARKET",
            quantity: quantity,
            workingType: "CONTRACT_PRICE",
        });
    };

    // Long
    binance.futuresOpenLong = async (symbol, price = 0, quantity, stopPrice = 0) => {
        const orderParams = {
            positionSide: "LONG",
            type: stopPrice ? (price ? "STOP" : "STOP_MARKET") : price ? "LIMIT" : "MARKET",
        };

        if (price) orderParams.newOrderRespType = "RESULT";
        if (stopPrice) orderParams.stopPrice = stopPrice;

        return binance.futuresOrder("BUY", symbol, quantity, price, orderParams);
    };
    binance.futuresTakeProfitLong = async (symbol, stopPrice, quantity = 0) => {
        return binance.futuresOrder("SELL", symbol, quantity, false, {
            positionSide: "LONG",
            type: "TAKE_PROFIT_MARKET",
            closePosition: true,
            workingType: "CONTRACT_PRICE",
            stopPrice: stopPrice,
            quantity: 0,
        });
    };
    binance.futuresLimitCloseLong = async (symbol, price, quantity = 0) => {
        return binance.futuresOrder("SELL", symbol, quantity, false, {
            positionSide: "LONG",
            type: "LIMIT",
            price: price,
            quantity: quantity,
            workingType: "CONTRACT_PRICE",
        });
    };
    binance.futuresStopLossLong = async (
        symbol,
        stoplossPrice,
        quantity = 0,
        stopPrice = false,
        workingType = "CONTRACT_PRICE"
    ) => {
        return binance.futuresOrder("SELL", symbol, quantity, false, {
            positionSide: "LONG",
            type: "STOP_MARKET",
            // closePosition: true,
            stopPrice: stoplossPrice,
            quantity: quantity,
            workingType: workingType,
        });
    };
    binance.futuresStopLimitLong = async (symbol, price, stoplossPrice, quantity = 0) => {
        return binance.futuresOrder("SELL", symbol, quantity, false, {
            positionSide: "LONG",
            type: "STOP",
            price: price,
            stopPrice: stoplossPrice,
            quantity: quantity,
            priceProtect: true,
            workingType: "CONTRACT_PRICE",
        });
    };
    binance.futuresMarketCloseLong = async (symbol, quantity = 0) => {
        return binance.futuresOrder("SELL", symbol, quantity, false, {
            positionSide: "LONG",
            type: "MARKET",
            quantity: quantity,
            workingType: "CONTRACT_PRICE",
        });
    };
    binance.futuresGetSymbolPrice = async (symbol) => {
        let futuresPrices = await binance.futuresPrices();
        if (futuresPrices) return parseFloat(futuresPrices[symbol]);
        else return 0;
    };
    binance.getSymbolPrice = async (symbol) => {
        try {
            let symbolPrices;
            if (binance.spot == true) symbolPrices = await binance.prices(symbol);
            else symbolPrices = await binance.futuresPrices({ symbol: symbol });
            return parseFloat(symbolPrices[symbol]);
        } catch (error) {
            return 0;
        }
    };
    // order
    binance.futuresGetAllOrdersOfSymbol = async (symbol, side = false) => {
        try {
            const allOpenOrders = await binance.futuresOpenOrders(symbol);
            const orders = allOpenOrders.filter((o) => o.positionSide === side);
            return !!side ? orders : allOpenOrders;
        } catch (error) {
            return [];
        }
    };
    binance.futuresCancelAllOrdersOfSymbol = async (symbol, side) => {
        try {
            const allOpenOrders = await binance.futuresGetAllOrdersOfSymbol(symbol, side);
            let orderIds = allOpenOrders.map((o) => o.orderId);
            // nếu orderIds.length > 5 thì tách thành chunk
            let chunks = [];
            if (orderIds.length > 5) {
                for (let i = 0; i < orderIds.length; i += 5) {
                    chunks.push(orderIds.slice(i, i + 5));
                }
            } else {
                chunks.push(orderIds);
            }
            for (let chunk of chunks) {
                await binance.futuresCancelMultipleOrders(symbol, chunk);
            }
            // if (orderIds.length !== 0) return binance.futuresCancelMultipleOrders(symbol, orderIds);
            return;
        } catch (error) {
            logger.error(error.message);
        }
    };
    binance.futuresCancelTpAndStlOfSymbol = async (symbol, side) => {
        try {
            const allOpenOrders = await binance.futuresGetAllOrdersOfSymbol(symbol, side);
            let orderIds = allOpenOrders.filter((o) => o.type !== "LIMIT").map((o) => o.orderId);
            if (orderIds.length !== 0) return binance.futuresCancelMultipleOrders(symbol, orderIds);
            return;
        } catch (error) {
            logger.error(error.message);
        }
    };
    binance.futuresCancelMultiOrderOfSymbol = async (symbol, orderIds) => {
        return binance.futuresCancelMultipleOrders(symbol, orderIds);
    };
    // positions
    binance.futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            const positions = await binance.futuresPositionRisk();
            let p = !!positions.code
                ? []
                : positions.filter((position) => parseFloat(position.positionAmt) !== 0);
            if (!!side) p = p.filter((position) => position.positionSide === side);
            if (!!symbol) {
                p = p.filter((position) => position.symbol === symbol);
            }
            return p;
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    };
    // positions
    binance.futuresGetOpenPositionBySymbolAndSide = async (symbol = false, side = false) => {
        try {
            const positions = await binance.futuresPositionRisk({ symbol: symbol });
            if (!!positions.code) throw new Error(JSON.stringify(positions));
            let p = [];
            if (!!side && !!positions)
                p = positions.find((position) => {
                    if (position.positionSide === side && parseFloat(position.positionAmt) !== 0)
                        return true;
                });
            return p;
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    };
    binance.makeOrderParams = (symbol, side, quantity, price, type, stopPrice) => {
        let params = {};
        params.side = side === "LONG" ? "SELL" : "BUY";
        params.symbol = symbol;
        params.positionSide = side;
        params.timeInForce = "GTC";
        if (quantity) params.quantity = quantity.toString();
        switch (type) {
            case "LIMIT":
                params.price = price.toString();
                params.type = "LIMIT";
                break;
            case "PROFIT":
                params.stopPrice = price.toString();
                params.type = "TAKE_PROFIT_MARKET";
                params.closePosition = "true";
                break;
            case "STOPLOSS":
                params.stopPrice = price.toString();
                params.type = "STOP_MARKET";
                params.closePosition = "true";
                params.workingType = "MARK_PRICE";
                break;
            case "STOPLIMIT":
                params.type = "STOP";
                params.workingType = "MARK_PRICE";
                params.price = stopPrice.toString();
                params.stopPrice = price.toString();
                break;
        }
        return params;
    };
    binance.futuresAccountBalance = async (USDT = false) => {
        try {
            const accountBalances = await binance.futuresBalance();
            if (accountBalances.code) throw new Error(JSON.stringify(accountBalances));
            if (USDT) return accountBalances.find((b) => b.asset == "USDT");
            return accountBalances.filter((b) => parseFloat(b.balance) != 0);
        } catch (error) {
            throw error;
        }
    };
    return binance;
}

module.exports = binanceFutures;
