const crypto = require("crypto");
let http = require("../huobi/http");
let JSONbig = require("json-bigint");
const logger = require("../../logger");

class BybitV5 {
    constructor(config = {}) {
        this.baseURL = "https://api.bybit.com";
        if (config.test === true) this.baseURL = "https://api-testnet.bybit.com";
        console.log(this.baseURL);
        this.apiKey = config.api_key || "xYgYb9yPVn85rXNGut";
        this.apiSecret = config.api_secret || "SMz1UQUKdVIWN2jgo7VbtLVe11AYwWMxz0Ab";
        this.exchange = "bybit";

        this.lastId = Math.round(Math.random() * 500 + 10);
        this.sub_account = config.sub_account || false;
        this.recvWindow = 5000;
        this.prices = {};
        this.startGetPrice = null;
    }
    getSignature(parameters, timestamp) {
        return crypto
            .createHmac("sha256", this.apiSecret)
            .update(timestamp + this.apiKey + this.recvWindow + parameters)
            .digest("hex");
    }
    async sendRequest(endpoint, method, params = {}, Info) {
        try {
            params.category = "linear";

            let timestamp = Date.now().toString();
            let res;

            let url = this.baseURL + endpoint;
            let headers = {
                "X-BAPI-SIGN-TYPE": "2",
                // "X-BAPI-SIGN": sign,
                "X-BAPI-API-KEY": this.apiKey,
                "X-BAPI-TIMESTAMP": timestamp,
                "X-BAPI-RECV-WINDOW": this.recvWindow.toString(),
            };
            let sign;
            if (method === "POST") {
                sign = this.getSignature(JSON.stringify(params), timestamp);
                headers["X-BAPI-SIGN"] = sign;
                headers["Content-Type"] = "application/json; charset=utf-8";
                res = await http.post(url, params, {
                    timeout: 15000,
                    headers: headers,
                });
            } else {
                let queryString = Object.keys(params)
                    .sort()
                    .map((key) => {
                        return `${key}=${params[key]}`;
                    })
                    .join("&");
                url = url + "?" + queryString;
                sign = this.getSignature(queryString, timestamp);
                headers["X-BAPI-SIGN"] = sign;
                res = await http.get(url, {
                    timeout: 15000,
                    headers: headers,
                });
            }

            let json = JSON.parse(res);
            return json;
        } catch (error) {
            console.log(error);
            return JSON.parse(error);
        }
    }

    async getAllContracts() {
        try {
            let path = "/v5/market/instruments-info";
            let res = await this.sendRequest(path, "GET");
            // return res.result.list;
            // const fileSystem = require("./../../file");
            // fileSystem.writeFile("bybit2.json", res);
            // console.log(res);
            if (res.retMsg === "OK") {
                let data = [];
                res.result.list.map((symbolInfo) => {
                    let tickSize = 0;
                    if (symbolInfo.symbol.includes("USDT")) {
                        if (symbolInfo.priceFilter.tickSize.includes("5"))
                            tickSize = parseFloat(symbolInfo.priceFilter.tickSize) * 2;
                        else tickSize = parseFloat(symbolInfo.priceFilter.tickSize);
                        data.push({
                            symbol: symbolInfo.symbol,
                            tickSize: tickSize,
                            stepSize: symbolInfo.lotSizeFilter.qtyStep,
                            maxMarketQty: symbolInfo.lotSizeFilter.maxMktOrderQty,
                            minQty: symbolInfo.lotSizeFilter.minOrderQty,
                        });
                    }
                });
                return data;
            } else return [];
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    async getAccountInfo() {
        try {
            let path = "/v5/account/wallet-balance";
            let res = await this.sendRequest(path, "GET", {
                accountType: "UNIFIED",
            });

            return res;
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    async getFuturesPrices(symbol) {
        try {
            if (!symbol.includes("USDT")) symbol = symbol + "USDT";
            if (!this.startGetPrice) this.startGetPrice = Date.now();
            else if (Date.now() - this.startGetPrice < 1000 * 60 * 3) {
                if (this.prices[symbol]) return this.prices[symbol];
            }
            let path = "/v5/market/tickers";
            let res = await this.sendRequest(path, "GET", {
                category: "linear",
                symbol: symbol,
            });

            if (res.retMsg === "OK")
                this.prices[symbol] = parseFloat(res?.result?.list?.[0]?.lastPrice);
            this.startGetPrice = Date.now();
            return this.prices[symbol];
        } catch (error) {
            console.log(error);
            return 0;
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let path = "/v5/position/list";
            let data = {};
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.sendRequest(path, "GET", data);

            if (res?.retMsg === "OK") {
                let p = [];
                res.result.list.map((pos) => {
                    let position = pos;
                    if (position.size != 0) {
                        p.push({
                            symbol: position.symbol,
                            positionAmt: position.size,
                            currentCost: position.positionValue,
                            costAmount: position.positionIM,
                            isolatedWallet: position.positionIM,
                            unRealizedProfit: position.unrealisedPnl,
                            entryPrice: position.avgPrice,
                            markPrice: position.markPrice,
                            liquidationPrice: position.liqPrice,
                            marginType: "cross",
                            leverage: position.leverage,
                            positionSide: position.side == "Buy" ? "LONG" : "SHORT",
                            updateTime: position.updatedTime,
                        });
                    }
                });
                if (!!side) p = p.filter((position) => position.positionSide === side);
                if (!!symbol) {
                    let s = symbol;
                    p = p.filter((position) => position.symbol === s);
                }
                return p;
            } else {
                logger.error(`[futuresGetAllPositions] res ${JSON.stringify(res)}`);
                return [];
            }
        } catch (error) {
            console.log(error);
            logger.error(`[futuresGetAllPositions] error ${error}`);
            throw error;
        }
    };
    futuresGetOpenPosition = async (symbol) => {
        return this.futuresGetAllPositions(symbol, false);
    };
    futuresGetOpenPositionBySymbolAndSide = async (symbol, side) => {
        try {
            let p = await this.futuresGetAllPositions(symbol, side);
            if (p.length > 0) {
                return p[0];
            } else return false;
        } catch (error) {
            logger.error(`[futuresGetAllPositions] ${error}`);
            throw error;
        }
    };

    futuresAccountBalance = async () => {
        let path = "/v5/account/wallet-balance";
        let res = await this.sendRequest(path, "GET", {
            accountType: "UNIFIED",
        });
        if (res.retMsg === "OK") {
            let balance = res.result.list[0];
            return {
                balance: parseFloat(balance.totalWalletBalance),
                crossUnPnl: parseFloat(balance.totalPerpUPL),
                availableBalance: parseFloat(balance.totalAvailableBalance),
            };
        }
    };
    async futuresMarginType(symbol, mode = "3") {
        if (symbol.includes("USDTB")) symbol = symbol.replace("USDTB", "USDT");
        let res = await this.sendRequest("/v5/position/switch-mode", "POST", {
            mode: `${mode}`,
            symbol: symbol,
        });
        return res;
    }
    async futuresLeverage(symbol, level) {
        let res = await this.sendRequest("/v5/position/set-leverage", "POST", {
            buyLeverage: `${level}`,
            sellLeverage: `${level}`,
            symbol: symbol,
        });

        return res;
    }
    futuresOpenLong = async (symbol, price = "", size) => {
        let body = {
            symbol: symbol,
            side: "Buy",
            // price: 0,
            orderType: "Market",
            qty: size.toString(),
            positionIdx: "1",
        };
        if (price != 0) {
            body.price = price.toString();
            body.orderType = "Limit";
        }
        let res = await this.sendRequest("/v5/order/create", "POST", body);
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: res.time,
                time: res.time,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresLimitCloseLong = async (symbol, price, size) => {
        let res = await this.sendRequest("/v5/order/create", "POST", {
            symbol: symbol,
            side: "Sell",
            price: price.toString(),
            orderType: "Limit",
            qty: size.toString(),
            positionIdx: "1",
            // trigger_by: "LastPrice",
            // stop_px: price.toString(),
            // time_in_force: "PostOnly",
            // close_on_trigger: false,
            // reduce_only: true,
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: res.time,
                time: res.time,
                symbol: symbol,
                side: "SELL",
                positionSide: "LONG",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "LIMIT",
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresTakeProfitLong = async (symbol, price, size) => {
        let body = {
            positionIdx: "1",
            tpSlMode: "Partial",
            tpSize: size.toString(),
            tpTriggerBy: "LastPrice",
            slTriggerBy: "LastPrice",
            // tpOrderType: "Market",
            // slOrderType: "Market",
            symbol: symbol,
            // stopLoss: price.toString(),
            takeProfit: price.toString(),
            needGeneratePid: true,
            side: "Buy",
            orderType: "Market",
            qty: size.toString(),
        };
        let res = await this.sendRequest("/v5/position/trading-stop", "POST", body);
        logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "SELL",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    makeOrderParams = () => {
        return {};
    };
    futuresStopLossLong = async (symbol, price, size) => {
        let body = {
            positionIdx: "1",
            tpSlMode: "Partial",
            slSize: size.toString(),
            // tpTriggerBy: "MarkPrice",
            slTriggerBy: "MarkPrice",
            // tpOrderType: "Market",
            // slOrderType: "Market",
            symbol: symbol,
            stopLoss: price.toString(),
            // takeProfit: "0",
            needGeneratePid: true,
            // side: "Buy",
            orderType: "Market",
            // qty: size.toString(),
        };

        let res = await this.sendRequest("/v5/position/trading-stop", "POST", body);

        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "SELL",
                positionSide: "LONG",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            res.msg = res.retMsg;
            return res;
        }
    };
    futuresStopLimitLong = async (symbol, price, stoplossPrice, size = 0) => {
        let body = {
            positionIdx: "1",
            tpSlMode: "Partial",
            slSize: size.toString(),
            tpTriggerBy: "MarkPrice",
            slTriggerBy: "MarkPrice",
            // tpOrderType: "Market",
            // slOrderType: "Market",
            symbol: symbol,
            stopLoss: price.toString(),
            // takeProfit: "0",
            needGeneratePid: true,
            // side: "Buy",
            orderType: "Market",
            qty: size.toString(),
        };
        let res = await this.sendRequest("/v5/position/trading-stop", "POST", body);
        logger.debug(`[futuresStopLimitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "SELL",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseLong = async (symbol, size = 0) => {
        let body = {
            side: "Sell",
            orderType: "Market",
            type: "Activity",
            createType: "CreateByClosing",
            closeOnTrigger: true,
            timeInForce: "GoodTillCancel",
            action: "PositionClose",
            symbol: symbol,
            qty: size.toString(),
            // qtyX: "500000000",
            price: "0",
            // leverage: "10",
            // leverageE2: "1000",
            positionIdx: "1",
        };
        let res = await this.sendRequest("/v5/order/create", "POST", body);
        logger.debug(`Futures Market Close Long ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "SELL",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresOpenShort = async (symbol, price = "", size) => {
        let body = {
            symbol: symbol,
            side: "Sell",
            // price: 0,
            orderType: "Market",
            qty: size.toString(),
            positionIdx: "2",
        };
        if (price != 0) {
            body.price = price.toString();
            body.orderType = "Limit";
        }
        let res = await this.sendRequest("/v5/order/create", "POST", body);
        logger.debug(`Futures Open Short ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "SELL",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresLimitCloseShort = async (symbol, price, size, base_price) => {
        let res = await this.sendRequest("/v5/order/create", "POST", {
            symbol: symbol,
            side: "Buy",
            price: price.toString(),
            orderType: "Limit",
            qty: size.toString(),
            positionIdx: "2",
            // trigger_by: "LastPrice",
            // stop_px: price.toString(),
            // time_in_force: "PostOnly",
            // close_on_trigger: false,
            // reduce_only: true,
        });
        logger.debug(`[futuresLimitCloseShort] ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "LIMIT",
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresTakeProfitShort = async (symbol, price, size, base_price) => {
        let body = {
            positionIdx: "2",
            tpSlMode: "Full",
            tpTriggerBy: "MarkPrice",
            // slTriggerBy: "MarkPrice",
            // tpOrderType: "Market",
            // slOrderType: "Market",
            symbol: symbol,
            // stopLoss: "0",
            takeProfit: price.toString(),
            needGeneratePid: true,
            // side: "Buy",
            orderType: "Market",
            qty: size.toString(),
        };
        let res = await this.sendRequest("/v5/position/trading-stop", "POST", body);
        logger.debug(`[futuresTakeProfitShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossShort = async (symbol, price, size, base_price) => {
        let body = {
            positionIdx: "2",
            tpSlMode: "Full",
            // tpTriggerBy: "MarkPrice",
            slTriggerBy: "MarkPrice",
            // tpOrderType: "Market",
            // slOrderType: "Market",
            symbol: symbol,
            stopLoss: price.toString(),
            // takeProfit: "0",
            needGeneratePid: true,
            // side: "Buy",
            orderType: "Market",
            qty: size.toString(),
        };
        let res = await this.sendRequest("/v5/position/trading-stop", "POST", body);
        logger.debug(`[futuresStopLossShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseShort = async (symbol, size = 0) => {
        let body = {
            side: "Buy",
            orderType: "Market",
            type: "Activity",
            createType: "CreateByClosing",
            closeOnTrigger: true,
            timeInForce: "GoodTillCancel",
            action: "PositionClose",
            symbol: symbol,
            qty: size.toString(),
            // qtyX: "500000000",
            price: "0",
            // leverage: "10",
            // leverageE2: "1000",
            positionIdx: "2",
        };
        let res = await this.sendRequest("/v5/order/create", "POST", body);
        logger.debug(`Futures Market Close Long ${JSONbig.stringify(res)}`);
        if (res.retMsg === "OK") {
            return {
                orderId: res.result.orderId,
                size: size,
                updateTime: new Date().getTime(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    async fututesCancelAll(symbol) {
        let params = {};
        if (symbol) params.symbol = symbol;
        else params.settleCoin = "USDT";
        let res = await this.sendRequest("/v5/order/cancel-all", "POST", params);

        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = {
            symbol: symbol,
            orderId: orders.orderId,
        };
        let res = await this.sendRequest("/v5/order/cancel", "POST", params);
        if (res.retMsg === "OK") {
            return {
                status: "CANCELED",
                type: "NONE",
                symbol: symbol,
            };
        }
        return res;
    };

    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        return this.fututesCancelAll(symbol);
    };
    futuresCancelMultiOrderOfSymbol = async (symbol, orderIds) => {
        await Promise.all(
            orderIds.map((orderId) => {
                this.futuresCancel(symbol, { orderId: orderId });
            })
        );
    };
    futuresGetAllOrdersOfSymbol = async (symbol) => {
        try {
            let path = "/v5/order/realtime";
            let data = {};
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.sendRequest(path, "GET", data);

            if (res.retMsg === "OK")
                return res.result.list.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        orderType: ob.orderType.toUpperCase(),
                        type: ob.stopOrderType.toUpperCase() + ob.orderType.toUpperCase(),
                        orderId: ob.orderId,
                        orderStatus: ob.orderStatus.toUpperCase(),
                        price: ob.price,
                        stopPrice: ob.triggerPrice,
                        amount: ob.qty,
                        origQty: ob.qty,
                        side: ob.side.toUpperCase(),
                        positionSide: ob.positionIdx == 1 ? "LONG" : "SHORT",
                    };
                });
            return res;
        } catch (error) {
            return [];
        }
    };
    futuresOpenOrders = async (symbol) => this.futuresGetAllOrdersOfSymbol(symbol);

    futuresOrderStatus = async (symbol = false, data = {}) => {
        try {
            let path = "/v5/order/realtime";
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.sendRequest(path, "GET", data);

            if (res.retMsg === "OK") {
                let results = res.result.list.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        orderType: ob.orderType.toUpperCase(),
                        orderId: ob.orderId,
                        status: ob.orderStatus.toUpperCase(),
                        price: ob.price,
                        origQty: ob.qty,
                        time: +ob.createdTime,
                        updateTime: +ob.updatedTime,
                        stopPrice: ob.triggerPrice,
                        side: ob.side.toUpperCase(),
                        positionSide: ob.positionIdx == "1" ? "LONG" : "SHORT",
                    };
                });
                if (data.orderId) return results[0] || {};
                else return results;
            }
            return res;
        } catch (error) {
            console.error(error);
            if (data.orderId) return {};
            else return [];
        }
    };

    async futuresIncome(data = {}) {
        try {
            let path = "/v5/account/transaction-log";
            path = "/v5/position/closed-pnl";
            let params = {
                accountType: "UNIFIED",
                limit: 100,
            };
            // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
            if (data.startTime) params.startTime = data.startTime.toString();
            if (data.endTime) params.endTime = data.endTime.toString();
            if (data.symbol) params.symbol = data.symbol;
            let res = await this.sendRequest(path, "GET", params);
            if (res.retMsg === "OK")
                return res.result.list.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        incomeType: "REALIZED_PNL",
                        income: ob.closedPnl,
                        createdTime: +ob.createdTime,
                        time: +ob.updatedTime,
                    };
                });
            return res;
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    async futuresUserTrades(symbol, data = {}) {
        try {
            return [];
            let path = "/v5/order/history";
            let params = {
                symbol: symbol,
                limit: 50,
            };
            if (data.startTime) params.startTime = data.startTime;
            if (data.endTime) params.startTime = data.endTime;
            let res = await this.sendRequest(path, "GET", params);
            console.log(res.result.nextPageCursor);
            if (res.retMsg === "OK") return res.result.list;

            return res;
        } catch (error) {
            return [];
        }
    }
}

module.exports = BybitV5;
