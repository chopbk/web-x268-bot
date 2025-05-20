const crypto = require("crypto");
let http = require("../huobi/http");
let JSONbig = require("json-bigint");
const logger = require("../../logger");

class BingX {
    constructor(config = {}) {
        this.baseURL = "https://open-api.bingx.com";
        if (config.test === true) this.baseURL = "https://api-testnet.bitget.com";
        // console.log(this.baseURL);
        this.apiKey = config.api_key || "xYgYb9yPVn85rXNGut";
        this.apiSecret = config.api_secret || "SMz1UQUKdVIWN2jgo7VbtLVe11AYwWMxz0Ab";
        this.passphrase = config.passphrase || "123456";
        this.exchange = "bingx";

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
        return crypto.createHmac("sha256", this.apiSecret).update(message).digest("hex");
    }
    async sendRequest(endpoint, method, params = {}, Info) {
        try {
            // params.category = "linear";

            let timestamp = new Date().getTime();
            let res;

            let url = this.baseURL + endpoint;
            let headers = {
                "X-BX-APIKEY": this.apiKey,
                // "ACCESS-TIMESTAMP": timestamp,
                // "ACCESS-PASSPHRASE": this.passphrase,
                // "Content-Type": "application/json",
                // locale: "en-US",
            };
            let queryString = Object.keys(params)
                .sort()
                .map((key) => {
                    return `${key}=${params[key]}`;
                })
                .join("&");
            // timestamp = new Date().getTime();
            if (queryString) queryString += `&timestamp=${timestamp}`;
            else queryString += `timestamp=${timestamp}`;

            let sign = this.getSignature(queryString);
            queryString += "&signature=" + sign;
            url = url + "?" + queryString;

            switch (method) {
                case "POST":
                    res = await http.post(
                        url,
                        {},
                        {
                            timeout: 15000,
                            headers: headers,
                        }
                    );
                    break;
                case "GET":
                    res = await http.get(url, {
                        timeout: 15000,
                        headers: headers,
                    });
                    break;
                case "DELETE":
                    res = await http.delete(url, "", {
                        timeout: 15000,
                        headers: headers,
                    });
                    break;
            }

            let json = JSON.parse(res, (key, value) => {
                if (key === "orderId") {
                    return BigInt(value).toString();
                }
                return value;
            });

            return json;
        } catch (error) {
            console.log(error);
            return JSON.parse(error);
        }
    }
    //GET https://open-api.bingx.com/openApi/swap/v3/user/balance?timestamp=1732784158873&signature=a1aa0a970592e8ec6ae2647c5b913d47406d48fbc6bf2c9a094ca5d7becd43f3
    async getAllContracts() {
        try {
            let path = "/openApi/swap/v2/quote/contracts";
            let params = {};
            let res = await this.sendRequest(path, "GET", params);
            // return res.data;
            // console.log(res);
            if (res.code === 0) {
                let data = [];
                // let FILE = require("../../file");
                // FILE.writeFile("data/bingx.json", res.data);

                res.data.map((symbolInfo) => {
                    if (symbolInfo.symbol.includes("USDT")) {
                        let tickSize =
                            symbolInfo.pricePrecision == 0
                                ? 0
                                : 1 / 10 ** parseFloat(symbolInfo.pricePrecision);
                        let stepSize =
                            symbolInfo.quantityPrecision == 0
                                ? 0
                                : 1 / 10 ** parseFloat(symbolInfo.quantityPrecision);
                        data.push({
                            symbol: symbolInfo.symbol,
                            tickSize: tickSize,
                            stepSize: stepSize,
                            maxMarketQty: Infinity,
                            minQty: +symbolInfo.tradeMinQuantity,
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

            let path = "/openApi/swap/v1/ticker/price";
            let res = await this.sendRequest(path, "GET", {
                symbol: symbol,
            });

            if (res.code === 0) return parseFloat(res?.data?.price);
            else return 0;
        } catch (error) {
            console.log(error);
            return 0;
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let path = "/openApi/swap/v2/user/positions";
            let data = {};
            if (symbol) data.symbol = symbol;

            let res = await this.sendRequest(path, "GET", data);

            if (res.code === 0) {
                let p = [];
                res.data.map((pos) => {
                    let position = pos;
                    if (position.total != 0) {
                        p.push({
                            symbol: position.symbol,
                            positionAmt: +position.positionAmt,
                            currentCost: +position.margin,
                            costAmount: +position.margin,
                            isolatedWallet: +position.margin,
                            unRealizedProfit: +position.unrealizedProfit,
                            entryPrice: +position.avgPrice,
                            markPrice: +position.markPrice,
                            liquidationPrice: +position.liquidationPrice,
                            marginType: position.isolated ? "isolated" : "crossed",
                            side: position.positionSide,
                            leverage: position.leverage,
                            positionSide: position.positionSide,
                            updateTime: position.updateTime,
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
    futuresGetOpenPositionBySymbolAndSide = async (symbol = "BTC-USDT", side) => {
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
        let path = "/openApi/swap/v3/user/balance";

        let res = await this.sendRequest(path, "GET", {});
        if (res.code === 0) {
            let balance = res.data.find((d) => d.asset == "USDT");
            return {
                balance: parseFloat(balance.equity),
                crossUnPnl: parseFloat(balance.unrealizedProfit),
                availableBalance: parseFloat(balance.availableMargin),
            };
        }
    };
    async futuresMarginType(symbol, mode = true) {
        let res = await this.sendRequest("/openApi/swap/v2/trade/marginType", "POST", {
            marginType: `${mode ? "CROSSED" : "ISOLATED"}`,

            symbol: symbol,
        });
        return res;
    }
    async futuresChangePositionSideDual(mode = true) {
        // console.log(await this.sendRequest("/openApi/swap/v1/positionSide/dual", "GET", {}));
        let res = await this.sendRequest("/openApi/swap/v1/positionSide/dual", "POST", {
            dualSidePosition: !!mode,
        });
        return res;
    }
    async futuresLeverage(symbol, level) {
        let res = await this.sendRequest("/openApi/swap/v2/trade/leverage", "POST", {
            side: "LONG",
            symbol: symbol,
            leverage: `${level}`,
        });

        return res;
    }
    futuresOpenLong = async (symbol, price = "", size) => {
        let body = {
            symbol: symbol,
            side: "BUY",
            positionSide: "LONG",
            quantity: size,
            type: "MARKET",
        };
        if (price != 0) {
            body.price = price.toString();
            body.type = "LIMIT";
        }
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: body.price || 0,
                origQty: size,
                type: body.type,
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresLimitCloseLong = async (symbol, price, size) => {
        try {
            let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", {
                symbol: symbol,
                side: "SELL",
                // positionSide: "LONG",
                quantity: size,
                positionSide: "LONG",
                type: "LIMIT",
                price: price,

                workingType: "CONTRACT_PRICE",
            });
            logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
            if (res.code === 0) {
                let order = res.data.order;
                return {
                    orderId: order.orderId,
                    size: size,
                    updateTime: Date.now(),
                    time: Date.now(),
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
        } catch (error) {
            return {
                code: true,
                message: error.message,
            };
        }
    };

    futuresTakeProfitLong = async (symbol, price, size) => {
        let body = {
            symbol: symbol,
            side: "SELL",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "LONG",
            type: "TAKE_PROFIT_MARKET",
            price: price,
            stopPrice: price,

            workingType: "CONTRACT_PRICE",
        };
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "TAKE_PROFIT_MARKET",
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
            side: "SELL",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "LONG",
            type: "STOP_MARKET",
            price: price,
            stopPrice: price,
            workingType: "CONTRACT_PRICE",
            timeInForce: "PostOnly",
            // reduceOnly: true,
            // closePosition: true,
        };
        logger.debug(`${symbol} ${price} ${size}`);
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);

        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "STOP_MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresChangeStopLossLong = async (symbol, price, size, orderId) => {
        if (!orderId) {
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
            if (!orderId) {
                logger.error(`[futuresChangeStopLossLong] orderId not found`);
            }
        }

        let body = {
            cancelReplaceMode: "ALLOW_FAILURE",
            cancelOrderId: orderId,
            symbol: symbol,
            side: "SELL",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "LONG",
            type: "STOP_MARKET",
            price: price,
            stopPrice: price,
            workingType: "CONTRACT_PRICE",
            timeInForce: "PostOnly",
            // reduceOnly: true,
            // closePosition: true,
        };
        let res = await this.sendRequest("/openApi/swap/v1/trade/cancelReplace", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);

        if (res.code === 0) {
            return res.data.newOrderResponse;
            // return {
            //     orderId: order.orderId,
            //     size: size,
            //     updateTime: Date.now(),
            //     time: Date.now(),
            //     symbol: symbol,
            //     side: "BUY",
            //     positionSide: "LONG",
            //     status: "NEW",
            //     price: price || 0,
            //     origQty: size,
            //     type: "STOP_MARKET",
            // };
        } else {
            //cancel stop order
            logger.error(
                `[futuresChangeStopLossLong] cancel stop order error ${JSONbig.stringify(res)}`
            );
            res.code = true;
            return res;
        }
    };
    futuresStopLimitLong = async (symbol, price, stoplossPrice, size) => {
        let body = {
            symbol: symbol,
            side: "SELL",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "LONG",
            type: "STOP",
            price: price,
            stopPrice: stoplossPrice,
            workingType: "CONTRACT_PRICE",
            timeInForce: "PostOnly",
        };
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "STOP_MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseLong = async (symbol, size = 0) => {
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", {
            symbol: symbol,
            side: "SELL",
            positionSide: "LONG",
            type: "MARKET",
            quantity: size,
            workingType: "CONTRACT_PRICE",
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "LONG",
                status: "NEW",
                price: 0,
                origQty: size,
                type: "MARKET",
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
        // if (res.code === 0) {
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
            side: "SELL",
            positionSide: "SHORT",
            quantity: size,
            type: "MARKET",
        };
        if (price != 0) {
            body.price = price.toString();
            body.type = "LIMIT";
        }
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "SELL",
                positionSide: "SHORT",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresLimitCloseShort = async (symbol, price, size, base_price) => {
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", {
            symbol: symbol,
            side: "BUY",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "SHORT",
            type: "LIMIT",
            price: price,

            workingType: "CONTRACT_PRICE",
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
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
            symbol: symbol,
            side: "BUY",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "SHORT",
            type: "TAKE_PROFIT_MARKET",
            price: price,
            stopPrice: price,

            workingType: "CONTRACT_PRICE",
        };
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "TAKE_PROFIT_MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossShort = async (symbol, price, size, base_price) => {
        let body = {
            symbol: symbol,
            side: "BUY",
            // positionSide: "LONG",
            quantity: size,
            positionSide: "SHORT",
            type: "STOP_MARKET",
            price: price,
            stopPrice: price,
            workingType: "CONTRACT_PRICE",
        };
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: price || 0,
                origQty: size,
                type: "STOP_MARKET",
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
            cancelReplaceMode: "ALLOW_FAILURE",
            cancelOrderId: orderId,
            symbol: symbol,
            side: "BUY",

            quantity: size,
            positionSide: "SHORT",
            type: "STOP_MARKET",
            price: price,
            stopPrice: price,
            workingType: "CONTRACT_PRICE",
            timeInForce: "PostOnly",
            // reduceOnly: true,
            // closePosition: true,
        };
        let res = await this.sendRequest("/openApi/swap/v1/trade/cancelReplace", "POST", body);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);

        if (res.code === 0) {
            return res.data.newOrderResponse;
            // return {
            //     orderId: order.orderId,
            //     size: size,
            //     updateTime: Date.now(),
            //     time: Date.now(),
            //     symbol: symbol,
            //     side: "BUY",
            //     positionSide: "LONG",
            //     status: "NEW",
            //     price: price || 0,
            //     origQty: size,
            //     type: "STOP_MARKET",
            // };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseShort = async (symbol, size = 0) => {
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "POST", {
            symbol: symbol,
            side: "BUY",
            positionSide: "SHORT",
            type: "MARKET",
            quantity: size,
            workingType: "CONTRACT_PRICE",
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.code === 0) {
            let order = res.data.order;
            return {
                orderId: order.orderId,
                size: size,
                updateTime: Date.now(),
                time: Date.now(),
                symbol: symbol,
                side: "BUY",
                positionSide: "SHORT",
                status: "NEW",
                price: 0,
                origQty: size,
                type: "MARKET",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    async fututesCancelAll(symbol) {
        let params = {};
        if (symbol) params.symbol = symbol;
        // cancel all limit order
        let res = await this.sendRequest("/openApi/swap/v2/trade/allOpenOrders", "DELETE", params);

        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = {
            symbol: symbol,
            orderId: orders.orderId,
        };
        // let res = await this.sendRequest("/api/v2/mix/order/cancel-order", "POST", params);
        let res = await this.sendRequest("/openApi/swap/v2/trade/order", "DELETE", params);
        if (res.code === 0) {
            return {
                status: res.data.status,
                type: res.data.type,
                side: res.data.side,
                symbol: symbol,
            };
        }
        return res;
    };

    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        await this.fututesCancelAll(symbol);
    };
    futuresCancelMultiOrderOfSymbol = async (symbol, orderIds) => {
        // await Promise.all(
        //     orderIds.map((orderId) => {
        //         this.futuresCancel(symbol, { orderId: orderId });
        //     })
        // );
        let params = {
            symbol: symbol,
            orderIdList: JSON.stringify(orderIds),
        };
        // let res = await this.sendRequest("/api/v2/mix/order/cancel-order", "POST", params);
        let res = await this.sendRequest("/openApi/swap/v2/trade/batchOrders", "DELETE", params);
        if (res.code === 0) {
            return {
                status: res,
                type: "NONE",
                symbol: symbol,
            };
        }
        return res;
    };
    futuresGetAllStopOrdersOfSymbol = async (symbol) => {
        try {
            let orders = await this.futuresGetAllOrdersOfSymbol(symbol);
            return orders.filter((order) => order.type.includes("STOP"));
        } catch (error) {
            console.log(error);
            return [];
        }
    };
    futuresGetAllOrdersOfSymbol = async (symbol) => {
        try {
            let data = {};

            if (symbol) data.symbol = symbol;

            let path = "/openApi/swap/v2/trade/openOrders";
            let res = await this.sendRequest(path, "GET", data);

            let orders = [];
            if (res.code === 0) orders = res.data.orders;

            // TODO get all orders limit
            return orders;
        } catch (error) {
            console.log(error);
            return [];
        }
    };

    futuresOpenOrders = async (symbol) => this.futuresGetAllOrdersOfSymbol(symbol);

    futuresOrderStatus = async (symbol = false, params = {}) => {
        try {
            params.orderId = params.orderId.toString();
            params.symbol = symbol;

            let path = "/openApi/swap/v2/trade/openOrder";

            let res = await this.sendRequest(path, "GET", params);

            let orderStatus = {};
            if (res.code === 0) return res.data.order;
            else if (res.code === 80016)
                orderStatus = {
                    status: "CANCELED",
                    type: "LIMIT",
                    symbol: symbol,
                    price: 0,
                    origQty: 0,
                };
            path = "/openApi/swap/v2/trade/order";
            res = await this.sendRequest(path, "GET", params);
            if (res.code === 0) return res.data.order;

            // TODO get all orders limit
            return orderStatus;
        } catch (error) {
            console.log(error);
            return {};
        }
    };

    async futuresIncome(data = {}) {
        try {
            let path = "/openApi/swap/v1/trade/positionHistory";
            let params = {
                // symbol: "BTC-USDT",
                // currency: "USDT",
            };
            if (data.symbol) {
                // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
                if (data.startTime) params.startTs = data.startTime.toString();
                //startime of today
                else params.startTs = `${new Date().setHours(0, 0, 0, 0)}`;

                if (data.endTime) params.endTs = data.endTime.toString();
                else params.endTs = Date.now().toString();
                params.symbol = data.symbol;

                let res = await this.sendRequest(path, "GET", params);

                if (res.code === 0)
                    return res.data.positionHistory.map((ob) => {
                        return {
                            symbol: ob.symbol,
                            incomeType: "REALIZED_PNL",
                            income: ob.netProfit,
                            createdTime: ob.openTime,
                            time: ob.updateTime,
                            side: ob.positionSide,
                            size: ob.positionAmt,
                            entryPrice: +ob.avgPrice,
                            positionAmount: +ob.positionAmt,
                            closePrice: +ob.avgClosePrice,
                            price: +ob.avgClosePrice,
                        };
                    });
            } else {
                path = "/openApi/swap/v2/user/income";
                if (data.startTime) params.startTime = data.startTime.toString();
                //startime of today
                else params.startTime = `${new Date().setHours(0, 0, 0, 0)}`;

                if (data.endTime) params.endTime = data.endTime.toString();
                else params.endTime = Date.now().toString();
                params.limit = 1000;
                let res = await this.sendRequest(path, "GET", params);
                // console.log(res);
                if (res.code === 0 && res.data) return res.data;
            }

            return [];
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    async futuresUserTrades(symbol, data = {}) {
        try {
            let path = "/openApi/swap/v1/trade/positionHistory";

            let params = {
                // symbol: "BTC-USDT",
                currency: "USDT",
            };
            // params.statTime = `${new Date("2023-11-12").getTime().toString()}`;
            if (data.startTime) params.startTs = data.startTime.toString();
            //startime of today
            else params.startTs = `${new Date().setHours(0, 0, 0, 0)}`;

            if (data.endTime) params.endTs = data.endTime.toString();
            else params.endTs = Date.now().toString();
            if (symbol) params.symbol = symbol;

            let res = await this.sendRequest(path, "GET", params);
            if (res.code === 0)
                return res.data.positionHistory.map((ob) => {
                    return {
                        symbol: ob.symbol,
                        incomeType: "REALIZED_PNL",
                        income: ob.netProfit,
                        createdTime: ob.openTime,
                        time: ob.updateTime,
                        side: ob.positionSide,
                        size: ob.positionAmt,
                        entryPrice: +ob.avgPrice,
                        positionAmount: +ob.positionAmt,
                        closePrice: +ob.avgClosePrice,
                        price: +ob.avgClosePrice,
                    };
                });
            return [];
        } catch (error) {
            console.log(error);
            return [];
        }
    }
}

module.exports = BingX;
