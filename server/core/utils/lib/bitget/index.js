const crypto = require("crypto");
let http = require("../huobi/http");
let JSONbig = require("json-bigint");
const logger = require("../../logger");

class Bitget {
    constructor(config = {}) {
        this.baseURL = "https://api.bitget.com";
        if (config.test === true) this.baseURL = "https://api-testnet.bitget.com";
        // console.log(this.baseURL);
        this.apiKey = config.api_key || "xYgYb9yPVn85rXNGut";
        this.apiSecret = config.api_secret || "SMz1UQUKdVIWN2jgo7VbtLVe11AYwWMxz0Ab";
        this.passphrase = config.passphrase || "123456";
        this.exchange = "bitget";

        this.lastId = Math.round(Math.random() * 500 + 10);
        this.sub_account = config.sub_account || false;
        this.recvWindow = 5000;
        this.prices = {};
        this.startGetPrice = null;
    }
    getSignature(message) {
        /*
        Step 1. Use the private key **secretkey** to encrypt the string to be signed with hmac sha256
String payload = hmac_sha256(secretkey, Message);

Step 2. Base64 encoding for Signature.
String signature = base64.encode(payload);
*/
        return crypto.createHmac("sha256", this.apiSecret).update(message).digest("base64");
    }
    async sendRequest(endpoint, method, params = {}, Info) {
        try {
            // params.category = "linear";

            let timestamp = Math.round(new Date()).toString();
            let res;

            let url = this.baseURL + endpoint;
            let headers = {
                "ACCESS-KEY": this.apiKey,
                "ACCESS-TIMESTAMP": timestamp,
                "ACCESS-PASSPHRASE": this.passphrase,
                "Content-Type": "application/json",
                locale: "en-US",
            };
            let sign;
            if (method === "POST") {
                let str = timestamp + method.toUpperCase() + endpoint + JSON.stringify(params);
                sign = this.getSignature(str);
                headers["ACCESS-SIGN"] = sign;
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
                let str = timestamp + method.toUpperCase() + endpoint + "?" + queryString;

                sign = this.getSignature(str);
                headers["ACCESS-SIGN"] = sign;

                res = await http.get(url, {
                    timeout: 15000,
                    headers: headers,
                });
            }

            let json = JSON.parse(res);
            // console.log(json);
            return json;
        } catch (error) {
            console.log(error);
            return JSON.parse(error);
        }
    }

    async getAllContracts() {
        try {
            let path = "/api/v2/mix/market/contracts";
            let params = {
                productType: "USDT-FUTURES",
                // symbol: "seiusdt",
            };
            let res = await this.sendRequest(path, "GET", params);
            // return res.data;
            //
            if (res.msg === "success") {
                let data = [];
                // let FILE = require("../../file");
                // FILE.writeFile("data/bitget.json", res.data);
                res.data.map((symbolInfo) => {
                    let tickSize =
                        symbolInfo.pricePlace == 0
                            ? 0
                            : 1 / 10 ** parseFloat(symbolInfo.pricePlace);
                    let stepSize =
                        symbolInfo.volumePlace == 0
                            ? 0
                            : 1 / 10 ** parseFloat(symbolInfo.volumePlace);
                    if (symbolInfo.symbol.includes("USDT")) {
                        data.push({
                            symbol: symbolInfo.symbol,
                            tickSize: tickSize,
                            stepSize: stepSize,
                            maxMarketQty: Infinity,
                            minQty: +symbolInfo.minTradeNum,
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

    async getFuturesPrices(symbol) {
        try {
            if (!symbol.includes("USDT")) symbol = symbol + "USDT";

            let path = "/api/v2/mix/market/symbol-price";
            let res = await this.sendRequest(path, "GET", {
                productType: "USDT-FUTURES",
                symbol: symbol,
            });

            if (res.msg === "success") return parseFloat(res?.data?.[0]?.price);
            else return 0;
        } catch (error) {
            console.log(error);
            return 0;
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let path = "/api/v2/mix/position/all-position";
            let data = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
            };
            if (symbol) data.symbol = symbol;

            let res = await this.sendRequest(path, "GET", data);

            if (res?.msg === "success") {
                let p = [];
                res.data.map((pos) => {
                    let position = pos;
                    if (position.total != 0) {
                        p.push({
                            symbol: position.symbol,
                            positionAmt: +position.total,
                            currentCost: +position.marginSize,
                            costAmount: +position.marginSize,
                            isolatedWallet: +position.marginSize,
                            unRealizedProfit: +position.unrealizedPL,
                            entryPrice: +position.openPriceAvg,
                            markPrice: +position.markPrice,
                            liquidationPrice: +position.liquidationPrice,
                            marginType: position.marginMode,
                            side: position.holdSide.toUpperCase(),
                            leverage: +position.leverage,
                            positionSide: position.holdSide.toUpperCase(),
                            updateTime: +position.uTime,
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
    futuresGetOpenPositionBySymbolAndSide = async (symbol = "BTCUSDT", side) => {
        try {
            let path = "/api/v2/mix/position/single-position";
            let data = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
                symbol: symbol,
            };

            let res = await this.sendRequest(path, "GET", data);

            if (res?.msg === "success") {
                let p = [];
                res.data.map((pos) => {
                    let position = pos;
                    if (position.total != 0) {
                        p.push({
                            symbol: position.symbol,
                            positionAmt: +position.total,
                            currentCost: +position.marginSize,
                            costAmount: +position.marginSize,
                            isolatedWallet: +position.marginSize,
                            unRealizedProfit: +position.unrealizedPL,
                            entryPrice: +position.openPriceAvg,
                            markPrice: +position.markPrice,
                            liquidationPrice: +position.liquidationPrice,
                            marginType: position.marginMode,
                            side: position.holdSide.toUpperCase(),
                            leverage: +position.leverage,
                            positionSide: position.holdSide.toUpperCase(),
                            updateTime: +position.uTime,
                        });
                    }
                });
                if (!!side) p = p.filter((position) => position.positionSide === side);
                if (p.length > 0) {
                    return p[0];
                } else return false;
            } else {
                logger.error(`[futuresGetAllPositions] res ${JSON.stringify(res)}`);
                return [];
            }
        } catch (error) {
            logger.error(`[futuresGetAllPositions] ${error}`);
            throw error;
        }
    };

    futuresAccountBalance = async () => {
        let path = "/api/v2/mix/account/account";
        let params = {
            productType: "USDT-FUTURES",
            marginCoin: "usdt",
            symbol: "btcusdt",
        };
        let res = await this.sendRequest(path, "GET", params);
        if (res.msg === "success") {
            let balance = res.data;
            return {
                balance: parseFloat(balance.usdtEquity),
                crossUnPnl: parseFloat(balance.unrealizedPL),
                availableBalance: parseFloat(balance.crossedMaxAvailable),
            };
        }
    };
    async futuresMarginType(symbol, mode = true) {
        let res = await this.sendRequest("/api/v2/mix/account/set-margin-mode", "POST", {
            mode: `${mode ? "cross" : "isolated"}`,
            productType: "USDT-FUTURES",
            marginCoin: "USDT",
            symbol: symbol,
        });
        return res;
    }
    async futuresChangePositionSideDual(mode = true) {
        let res = await this.sendRequest("/api/v2/mix/account/set-position-mode", "POST", {
            productType: "USDT-FUTURES",
            posMode: `${mode ? "hedge_mode" : "one_way_mode"}`,
        });
        return res;
    }
    async futuresLeverage(symbol, level) {
        let res = await this.sendRequest("/api/v2/mix/account/set-leverage", "POST", {
            productType: "USDT-FUTURES",
            marginCoin: "USDT",
            symbol: symbol,
            leverage: `${level}`,
        });

        return res.data;
    }
    futuresOpenLong = async (symbol, price = "", size) => {
        let body = {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            size: size.toString(),
            side: "buy",
            tradeSide: "open",
            orderType: "Market",
        };
        if (price != 0) {
            body.price = price.toString();
            body.orderType = "limit";
        }
        let res = await this.sendRequest("/api/v2/mix/order/place-order", "POST", body);
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
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
        let res = await this.sendRequest("/api/v2/mix/order/place-order", "POST", {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            size: size.toString(),
            side: "buy",
            tradeSide: "close",
            orderType: "limit",
            price: price,
            force: "post_only",
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
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
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            planType: "profit_plan",
            triggerPrice: price,
            triggerType: "fill_price",
            holdSide: "long",
            size: size.toString(),
            side: "buy",
        };
        let res = await this.sendRequest("/api/v2/mix/order/place-tpsl-order", "POST", body);
        logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.planType.toUpperCase(),
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
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            planType: "loss_plan",
            triggerPrice: price,
            triggerType: "fill_price",
            holdSide: "long",
            size: size.toString(),
            side: "buy",
        };
        let res = await this.sendRequest("/api/v2/mix/order/place-tpsl-order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.planType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLimitLong = async (symbol, price, stoplossPrice, size) => {
        let body = {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            planType: "loss_plan",
            triggerPrice: price,
            triggerType: "fill_price",
            holdSide: "long",
            size: size.toString(),
            side: "buy",
        };
        let res = await this.sendRequest("/api/v2/mix/order/place-tpsl-order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.planType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresChangeStopLossLong = async (symbol, price, size, orderId) => {
        if (!orderId) {
            logger.error(`[futuresChangeStopLossLong] orderId not found`);
            // check if success, return, if error, break
            let res = await this.futuresStopLossLong(symbol, price, size);
            if (!res.code) {
                logger.error(`[futuresChangeStopLossLong] orderId not found`);
                return res;
            }
        }
        if (!orderId) {
            let orders = await this.futuresGetAllStopOrdersOfSymbol(symbol);
            orderId = orders.find(
                (order) => order.origQty === size || order.positionSide === "LONG"
            ).orderId;
        }

        let body = {
            symbol: symbol,
            orderId: orderId,
            productType: "USDT-FUTURES",
            // marginMode: "crossed",
            marginCoin: "USDT",

            triggerPrice: price,
            triggerType: "fill_price",
            executePrice: "0",
            size: size.toString(),
        };
        console.log(body);
        let res = await this.sendRequest("/api/v2/mix/order/modify-tpsl-order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);

        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: "STOP_MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresMarketCloseLong = async (symbol, size = 0) => {
        await this.fututesCancelAll(symbol);
        let res = await this.sendRequest("/api/v2/mix/order/place-order", "POST", {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            size: size.toString(),
            side: "buy",
            tradeSide: "close",
            orderType: "market",
            // force: "fok",
            // reduceOnly: "YES",
            // {
            //     "tokenId": "USDT",
            //     "symbolId": "SUIUSDT_UMCBL",
            //     "businessLine": 10,
            //     "businessSource": 10,
            //     "enterPointSource": 1,
            //     "secondBusinessLine": "N/A",
            //     "timeInForceValue": 0,
            //     "cancelOrder": true,
            //     "delegateCount": "3.5",
            //     "orderType": 1,
            //     "delegateType": 3,
            //     "languageType": 4
            // }
            // price: price,
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                // price: price || 0,
                origQty: size,
                type: "LIMIT",
            };
        } else {
            res.code = true;
            return res;
        }
        // let body = {
        //     symbol: symbol,
        //     holdSide: "long",
        //     productType: "USDT-FUTURES",
        // };
        // let res = await this.sendRequest("/api/v2/mix/order/close-positions", "POST", body);
        // logger.debug(`Futures Market Close Long ${JSONbig.stringify(res)}`);
        // if (res.msg === "success") {
        //     return {
        //         updateTime: new Date().getTime(),
        //         successList: res.data.successList,
        //     };
        // } else {
        //     res.code = true;
        //     return res;
        // }
    };
    futuresOpenShort = async (symbol, price = "", size) => {
        let body = {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            size: size.toString(),
            side: "sell",
            tradeSide: "open",
            orderType: "Market",
        };
        if (price != 0) {
            body.price = price.toString();
            body.orderType = "Limit";
        }
        let res = await this.sendRequest("/api/v2/mix/order/place-order", "POST", body);
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
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
        let res = await this.sendRequest("/api/v2/mix/order/place-order", "POST", {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            size: size.toString(),
            side: "sell",
            tradeSide: "close",
            orderType: "limit",
            price: price,
            force: "post_only",
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "SELL",
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
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            planType: "profit_plan",
            triggerPrice: price,
            triggerType: "fill_price",
            holdSide: "short",
            size: size.toString(),
            side: "sell",
        };
        let res = await this.sendRequest("/api/v2/mix/order/place-tpsl-order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "SELL",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.planType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossShort = async (symbol, price, size, base_price) => {
        let body = {
            symbol: symbol,
            productType: "USDT-FUTURES",
            marginMode: "crossed",
            marginCoin: "USDT",
            planType: "loss_plan",
            triggerPrice: price,
            triggerType: "fill_price",
            holdSide: "short",
            size: size.toString(),
            side: "sell",
        };
        let res = await this.sendRequest("/api/v2/mix/order/place-tpsl-order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "SELL",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.planType.toUpperCase(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresChangeStopLossShort = async (symbol, price, size, orderId) => {
        if (!orderId) {
            logger.error(`[futuresChangeStopLossShort] orderId not found`);
            // check if success, return, if error, break
            let res = await this.futuresStopLossShort(symbol, price, size);
            if (!res.code) {
                logger.error(`[futuresChangeStopLossShort] orderId not found`);
                return res;
            }
        }
        if (!orderId) {
            let orders = await this.futuresGetAllStopOrdersOfSymbol(symbol);
            orderId = orders.find(
                (order) => order.origQty === size || order.positionSide === "SHORT"
            ).orderId;
        }
        let body = {
            symbol: symbol,
            orderId: orderId,
            productType: "USDT-FUTURES",
            // marginMode: "crossed",
            marginCoin: "USDT",

            triggerPrice: price,
            triggerType: "fill_price",
            executePrice: "0",
            size: size.toString(),
        };
        console.log(body);
        let res = await this.sendRequest("/api/v2/mix/order/modify-tpsl-order", "POST", body);
        logger.debug(`[futuresChangeStopLossShort] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);

        if (res.msg === "success") {
            return {
                orderId: res.data.orderId,
                size: size,
                updateTime: res.requestTime,
                time: res.requestTime,
                symbol: symbol,
                side: "SELL",
                positionSide: "SHORT",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: "STOP_MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseShort = async (symbol, size = 0) => {
        await this.fututesCancelAll(symbol);
        let body = {
            symbol: symbol,
            holdSide: "short",
            productType: "USDT-FUTURES",
        };
        let res = await this.sendRequest("/api/v2/mix/order/close-positions", "POST", body);
        logger.debug(`Futures Market Close Long ${JSONbig.stringify(res)}`);
        if (res.msg === "success") {
            return {
                updateTime: new Date().getTime(),
                successList: res.data.successList,
            };
        } else {
            res.code = true;
            return res;
        }
    };
    async fututesCancelAll(symbol) {
        let params = {
            productType: "USDT-FUTURES",
            marginCoin: "USDT",
        };
        if (symbol) params.symbol = symbol;
        // cancel all limit order
        let res = await this.sendRequest("/api/v2/mix/order/cancel-all-orders", "POST", params);

        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = {
            symbol: symbol,
            orderId: orders.orderId,
        };
        // let res = await this.sendRequest("/api/v2/mix/order/cancel-order", "POST", params);
        let res = await this.sendRequest("/api/v2/mix/order/cancel-plan-order", "POST", params);
        if (res.msg === "success") {
            return {
                status: "CANCELED",
                type: "NONE",
                symbol: symbol,
            };
        }
        return res;
    };

    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        await this.fututesCancelAll(symbol);
        let orders = await this.futuresGetAllStopOrdersOfSymbol(symbol);
        return orders.map((ob) => this.futuresCancel(symbol, ob));
    };
    futuresCancelMultiOrderOfSymbol = async (symbol, orderIds) => {
        await Promise.all(
            orderIds.map((orderId) => {
                this.futuresCancel(symbol, { orderId: orderId });
            })
        );
    };
    futuresGetAllStopOrdersOfSymbol = async (symbol) => {
        try {
            let data = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
                planType: "profit_loss",
            };

            if (symbol) data.symbol = symbol;

            let path = "/api/v2/mix/order/orders-plan-pending";
            let res = await this.sendRequest(path, "GET", data);

            let orders = [];
            if (res.msg === "success")
                if (res.data.entrustedList)
                    orders = res.data.entrustedList.map((ob) => {
                        return {
                            symbol: ob.symbol,
                            orderType: ob.planType.toUpperCase(),
                            type: ob.planType.toUpperCase() + ob.orderType.toUpperCase(),
                            orderId: ob.orderId,
                            orderStatus: ob.planStatus === "live" ? "NEW" : "CANCELED",
                            price: ob.price,
                            stopPrice: ob.triggerPrice,
                            amount: ob.size,
                            origQty: ob.size,
                            side: ob.side.toUpperCase(),
                            positionSide: ob.posSide ? "LONG" : "SHORT",
                        };
                    });

            // TODO get all orders limit
            return orders;
        } catch (error) {
            console.log(error);
            return [];
        }
    };
    futuresGetAllLimitOrdersOfSymbol = async (symbol) => {
        try {
            let data = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
            };

            if (symbol) data.symbol = symbol;

            let path = "/api/v2/mix/order/orders-pending";
            let res = await this.sendRequest(path, "GET", data);

            let orders = [];
            if (res.msg === "success")
                if (res.data.entrustedList)
                    orders = res.data.entrustedList.map((ob) => {
                        return {
                            symbol: ob.symbol,
                            orderType: ob.orderType.toUpperCase(),
                            type: ob.orderType.toUpperCase(),
                            orderId: ob.orderId,
                            orderStatus: ob.status === "live" ? "NEW" : "CANCELED",
                            price: ob.price,
                            stopPrice: ob.triggerPrice,
                            amount: ob.size,
                            origQty: ob.size,
                            side: ob.side.toUpperCase(),
                            positionSide: ob.posSide ? "LONG" : "SHORT",
                        };
                    });

            // TODO get all orders limit
            return orders;
        } catch (error) {
            console.log(error);
            return [];
        }
    };
    futuresGetAllOrdersOfSymbol = async (symbol) => {
        return [
            ...(await this.futuresGetAllStopOrdersOfSymbol(symbol)),
            ...(await this.futuresGetAllLimitOrdersOfSymbol(symbol)),
        ];
    };
    futuresOpenOrders = async (symbol) => this.futuresGetAllOrdersOfSymbol(symbol);
    getOrderInfo = (ob) => {
        // console.log(ob);
        return {
            symbol: ob.symbol,
            orderType: ob.orderType.toUpperCase(),
            type: ob.orderType.toUpperCase(),
            orderId: ob.orderId,
            orderStatus:
                ob.status === "live" ? "NEW" : ob.status === "filled" ? "FILLED" : "CANCELED",
            status: ob.status === "live" ? "NEW" : ob.status === "filled" ? "FILLED" : "CANCELED",
            price: ob.price,
            stopPrice: ob.triggerPrice,
            amount: ob.size,
            origQty: ob.size,
            side: ob.side.toUpperCase(),
            positionSide: ob.posSide ? "LONG" : "SHORT",
        };
    };
    futuresOrderStatus = async (symbol = false, params = {}) => {
        try {
            let data = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
            };

            if (symbol) data.symbol = symbol;
            if (params.orderId) data.orderId = params.orderId;

            let path = "/api/v2/mix/order/orders-pending";
            let res = await this.sendRequest(path, "GET", data);
            let orders = [];
            if (res.msg === "success") {
                if (res.data.entrustedList)
                    orders = res.data.entrustedList.map((ob) => this.getOrderInfo(ob));
                else {
                    path = "/api/v2/mix/order/orders-history";
                    let res = await this.sendRequest(path, "GET", data);
                    if (res.data.entrustedList)
                        orders = res.data.entrustedList.map((ob) => this.getOrderInfo(ob));
                }
                if (data.orderId) return orders[0] || {};
                else return results;
            }
            return res;
        } catch (error) {
            console.error(error);
            if (params.orderId) return {};
            else return [];
        }
    };

    async futuresIncome(data = {}) {
        try {
            let path = "/api/v2/mix/position/history-position";

            let params = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
                limit: 100,
            };
            // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
            if (data.startTime) params.startTime = data.startTime.toString();
            if (data.endTime) params.endTime = data.endTime.toString();
            if (data.symbol) params.symbol = data.symbol;

            let res = await this.sendRequest(path, "GET", params);

            if (res.msg === "success")
                return res.data.list.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        incomeType: "REALIZED_PNL",
                        income: ob.netProfit,
                        createdTime: parseFloat(ob.ctime),
                        time: parseFloat(ob.utime),
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
            let path = "/api/v2/mix/position/history-position";

            let params = {
                productType: "USDT-FUTURES",
                marginCoin: "USDT",
                limit: 100,
            };
            // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
            if (data.startTime) params.startTime = data.startTime.toString();
            if (data.endTime) params.endTime = data.endTime.toString();
            if (data.symbol) params.symbol = data.symbol;
            let res = await this.sendRequest(path, "GET", params);
            if (res.msg === "success")
                return res.data.list.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        incomeType: "REALIZED_PNL",
                        income: ob.netProfit,
                        createdTime: +ob.ctime,
                        time: +ob.utime,
                        side: ob.holdSide.toUpperCase(),
                        size: +ob.openTotalPos,
                        entryPrice: +ob.openAvgPrice,
                        closePrice: +ob.closeAvgPrice,
                        price: +ob.closeAvgPrice,
                    };
                });
            return res;
        } catch (error) {
            console.log(error);
            return [];
        }
    }
}

module.exports = Bitget;
