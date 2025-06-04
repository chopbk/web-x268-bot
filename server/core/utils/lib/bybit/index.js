var CryptoJS = require("crypto-js");
var moment = require("moment");
const crypto = require("crypto");
const qs = require("qs");
var HmacSHA256 = require("crypto-js/hmac-sha256");
var http = require("../huobi/http");
var url = require("url");
var JSONbig = require("json-bigint");
const logger = require("../../logger");
const querystring = require("querystring");
const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36",
};

class Huobi {
    constructor(config = {}) {
        this.baseURL = "https://api.bybit.com";
        this.api_key = config.api_key || "";
        this.api_secret = config.api_secret || "";
        this.exchange = "bybit";
        this.lastId = Math.round(Math.random() * 500 + 10);
        this.sub_account = config.sub_account || false;
    }

    call_post = async (endpoint, params = false) => {
        let postBody = {};
        let method = "POST";
        params.api_key = this.api_key;
        params.timestamp = Date.now();
        let queryString = Object.keys(params)
            .sort()
            .map((key) => {
                return `${key}=${params[key]}`;
            })
            .join("&");
        params.sign = crypto
            .createHmac("sha256", this.api_secret)
            .update(queryString)
            .digest("hex");
        queryString += `&sign=${params.sign}`;

        let query = "";

        if (method === "GET") query = "?" + queryString;
        else postBody = params;

        const url = this.baseURL + endpoint + query;

        const headers = {
            "content-type": "application/json",
            accept: "application/json",
        };
        let data = await http.post(url, postBody, {
            timeout: 15000,
            headers: headers,
        });
        let json = JSON.parse(data);

        return json;
    };

    call_get = async function (endpoint, params = {}) {
        let method = "GET";
        params.api_key = this.api_key;
        params.timestamp = Date.now();
        let queryString = Object.keys(params)
            .sort()
            .map((key) => {
                return `${key}=${params[key]}`;
            })
            .join("&");
        params.sign = crypto
            .createHmac("sha256", this.api_secret)
            .update(queryString)
            .digest("hex");
        queryString += `&sign=${params.sign}`;

        let query = "";

        if (method === "GET") query = "?" + queryString;
        else postBody = JSON.stringify(params);

        const url = this.baseURL + endpoint + query;
        const headers = {
            "content-type": "application/json",
            accept: "application/json",
        };

        let data = await http.get(url, {
            timeout: 15000,
            headers: headers,
        });
        let json = JSON.parse(data);

        return json;
    };
    async getAllContracts() {
        try {
            let path = "/v2/public/symbols";
            let res = await this.call_get(path);

            if (res.ret_msg === "OK") {
                let data = [];
                res.result.map((symbolInfo) => {
                    let tickSize = 0;
                    if (symbolInfo.name.includes("USDT")) {
                        if (symbolInfo.price_filter.tick_size.includes("5"))
                            tickSize = parseFloat(symbolInfo.price_filter.tick_size) * 2;
                        else tickSize = parseFloat(symbolInfo.price_filter.tick_size);
                        data.push({
                            symbol: symbolInfo.name,
                            tickSize: tickSize,
                            stepSize: symbolInfo.lot_size_filter.qty_step,
                            maxMarketQty: symbolInfo.lot_size_filter.max_order_qty,
                            minQty: symbolInfo.lot_size_filter.min_order_qty,
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
            let path = "/api/account";
            let res = await this.call_get(path);

            return res;
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let path = "/contract/v3/private/position/list";
            let data = {};
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.call_get(path, data);
            logger.debug(`futuresGetAllPositions ${JSON.stringify(res)}`);
            if (res.retMsg === "OK") {
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
            } else return [];
        } catch (error) {
            logger.error(`[futuresGetAllPositions] ${error}`);
            return [];
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
            return [];
        }
    };

    futuresAccountBalance = async () => {
        let path = "/contract/v3/private/account/wallet/balance";
        let res = await this.call_get(path);
        // console.log(res.result.list);
        if (res.retMsg === "OK") {
            let balance = res.result.list.find((list) => list.coin == "USDT");
            return {
                balance: balance.equity,
                crossUnPnl: balance.unrealisedPnl,
                availableBalance: balance.availableBalance,
            };
        }
    };
    async futuresMarginType(symbol, tradeMode = "0", leverage = "5") {
        if (symbol.includes("USDTB")) symbol = symbol.replace("USDTB", "USDT");

        let res = await this.call_post("/contract/v3/private/position/switch-isolated", {
            tradeMode: tradeMode,
            symbol: symbol,
            buyLeverage: leverage,
            sellLeverage: leverage,
        });
        // console.log(res.result);
        return res;
    }
    async futuresLeverage(symbol, level) {
        let res = await this.call_post("/contract/v3/private/position/set-leverage", {
            buyLeverage: level.toString(),
            sellLeverage: level.toString(),
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
        let res = await this.call_post("/contract/v3/private/order/create", body);
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
        let res = await this.call_post("/contract/v3/private/order/create", {
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
            tpSlMode: "Full",
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
        let res = await this.call_post("/contract/v3/private/position/trading-stop", body);
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
                price: body.price || 0,
                origQty: size,
                type: body.orderType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossLong = async (symbol, price, size, base_price) => {
        let body = {
            positionIdx: "1",
            tpSlMode: "Full",
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
        let res = await this.call_post("/contract/v3/private/position/trading-stop", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        // console.log(res);
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
        let res = await this.call_post("/contract/v3/private/order/create", body);
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
        let res = await this.call_post("/private/linear/order/create", {
            symbol: symbol,
            side: "Sell",
            price: 0,
            order_type: "Market",
            qty: size,
            time_in_force: "PostOnly",
            close_on_trigger: false,
            reduce_only: false,
        });
        logger.debug(`Futures Open Short ${JSONbig.stringify(res)}`);
        if (res.ret_msg === "OK") {
            return {
                order_id: res.result.order_id,
                client_order_id: res.result.user_id,
                size: res.result.qty,
                updateTime: new Date(),
                symbol: res.result.symbol,
                side: res.result.side == "BUY" ? "LONG" : "SHORT",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresLimitCloseShort = async (symbol, price, size, base_price) => {
        let res = await this.call_post("/private/linear/stop-order/create", {
            symbol: symbol,
            side: "Buy",
            price: price,
            order_type: "Limit",
            qty: size,
            base_price: base_price,
            trigger_by: "LastPrice",
            stop_px: price,
            time_in_force: "PostOnly",
            close_on_trigger: false,
            reduce_only: true,
        });

        logger.debug(`[futuresLimitCloseShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.ret_msg === "OK") {
            return {
                orderId: res.result.stop_order_id,
                updateTime: new Date(),
                symbol: res.result.symbol,
                side: res.result.side == "BUY" ? "LONG" : "SHORT",
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresTakeProfitShort = async (symbol, price, size, base_price) => {
        let res = await this.call_post("/private/linear/stop-order/create", {
            symbol: symbol,
            side: "Buy",
            order_type: "Market",
            qty: size,
            base_price: base_price,
            trigger_by: "LastPrice",
            stop_px: price,
            time_in_force: "PostOnly",
            close_on_trigger: false,
            reduce_only: true,
        });
        logger.debug(`[futuresTakeProfitShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.ret_msg === "OK") {
            return {
                orderId: res.result.stop_order_id,
                updateTime: new Date(),
                symbol: res.result.symbol,
                side: res.result.side == "BUY" ? "LONG" : "SHORT",
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossShort = async (symbol, price, size, base_price) => {
        let res = await this.call_post("/private/linear/stop-order/create", {
            symbol: symbol,
            side: "Buy",
            order_type: "Market",
            qty: size,
            base_price: base_price,
            trigger_by: "LastPrice",
            stop_px: price,
            time_in_force: "PostOnly",
            close_on_trigger: false,
            reduce_only: true,
        });
        logger.debug(`[futuresStopLossShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.ret_msg === "OK") {
            return {
                orderId: res.result.stop_order_id,
                updateTime: new Date(),
                symbol: res.result.symbol,
                side: res.result.side == "BUY" ? "LONG" : "SHORT",
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseShort = async (symbol, size = 0) => {
        let res = await this.call_post("/private/linear/order/create", {
            symbol: symbol,
            side: "Buy",
            price: 0,
            order_type: "Market",
            qty: size,
            time_in_force: "PostOnly",
            close_on_trigger: true,
            reduce_only: true,
        });
        logger.debug(`Futures Close Short ${JSONbig.stringify(res)}`);
        if (res.ret_msg === "OK") {
            return {
                orderId: res.result.order_id,
                updateTime: new Date(),
                symbol: res.result.symbol,
                side: res.result.side == "BUY" ? "LONG" : "SHORT",
                status: "NEW",
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
        let res = await this.call_post("/contract/v3/private/order/cancel-all", params);

        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = {
            symbol: symbol,
            orderId: orders.orderId,
        };
        let res = await this.call_post("/contract/v3/private/order/cancel", params);
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
            let path = "/contract/v3/private/order/unfilled-orders";
            let data = {};
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.call_get(path, data);

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
            let path = "/contract/v3/private/order/unfilled-orders";
            if (symbol) data.symbol = symbol;
            else data.settleCoin = "USDT";
            let res = await this.call_get(path, data);

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
            return [];
        }
    };

    async futuresIncome(data = {}) {
        try {
            let path = "/contract/v3/private/position/closed-pnl";
            // path = "/v5/position/closed-pnl";
            let params = {
                limit: 100,
            };
            // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
            if (data.startTime) params.startTime = data.startTime;
            if (data.endTime) params.endTime = data.endTime;
            if (data.symbol) params.symbol = data.symbol;
            let res = await this.call_get(path, data);
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
    async futuresUserTrades(symbol) {
        try {
            return [];
        } catch (error) {
            return [];
        }
    }
}

module.exports = Huobi;
