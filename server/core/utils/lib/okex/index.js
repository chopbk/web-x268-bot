var CryptoJS = require("crypto-js");
var moment = require("moment");
const crypto = require("crypto");
var HmacSHA256 = require("crypto-js/hmac-sha256");
var http = require("../huobi/http");
var JSONbig = require("json-bigint");
const logger = require("../../logger");
const querystring = require("querystring");
const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
};
var BigNumber = require("bignumber.js");

class Okex {
    constructor(config = {}) {
        this.baseURL = "https://www.okx.com";
        this.api_key = config.api_key || "";
        this.api_secret = config.api_secret || "";
        this.passphrase = config.passphrase || "";
        this.exchange = "okex";
        this.lastId = Math.round(Math.random() * 500 + 10);
        this.prices = {};
        this.startGetPrice = null;
    }
    sign_sha = (method, baseurl, path, data) => {
        var pars = [];
        for (let item in data) {
            pars.push(item + "=" + encodeURIComponent(data[item]));
        }
        var p = pars.sort().join("&");
        var meta = [method, baseurl, path, p].join("\n");
        var hash = HmacSHA256(meta, this.api_secret);
        var Signature = encodeURIComponent(CryptoJS.enc.Base64.stringify(hash));
        p += `&Signature=${Signature}`;
        return p;
    };
    get_body = () => {
        return {
            AccessKeyId: this.api_key,
            SignatureMethod: "HmacSHA256",
            SignatureVersion: 2,
            Timestamp: moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
        };
    };

    call_post = async (path, params = false) => {
        try {
            let payload = "";
            if (params) payload = JSON.stringify(params);
            let url = this.baseURL + path;
            const start = new Date().toISOString();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "POST" + path + payload)
                .digest("base64");
            let headers = Object.assign({}, DEFAULT_HEADERS);
            headers["OK-ACCESS-TIMESTAMP"] = start;
            headers["OK-ACCESS-KEY"] = this.api_key;
            headers["OK-ACCESS-SIGN"] = signature;
            headers["OK-ACCESS-PASSPHRASE"] = this.passphrase;
            //headers["x-simulated-trading"] = 1;
            let data = await http.post(url, params, {
                timeout: 2000,
                headers: headers,
            });
            let json = JSONbig.parse(data);

            return json;
        } catch (error) {
            logger.error(`[call_post] ${error}`);

            return JSONbig.parse(error);
        }
    };
    call_delete = async (path, params = false) => {
        try {
            logger.debug(`[call_delete] ${path} ${JSON.stringify(params)}`);
            let payload = "";
            if (params) {
                if (typeof params === "number") path += "/" + params;
                else payload = JSON.stringify(params);
            }

            let url = this.baseURL + path;
            const start = new Date().toISOString();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "DELETE" + path + payload)
                .digest("base64");
            let headers = Object.assign({}, DEFAULT_HEADERS);
            headers["OK-ACCESS-TIMESTAMP"] = start;
            headers["OK-ACCESS-KEY"] = this.api_key;
            headers["OK-ACCESS-SIGN"] = signature;
            headers["OK-ACCESS-PASSPHRASE"] = this.passphrase;
            let data = await http.delete(url, payload, {
                timeout: 2000,
                headers: headers,
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    };
    call_get = async (path, params = false) => {
        try {
            logger.debug(`[call_get] ${path} ${JSON.stringify(params)}`);
            let payload = "";
            if (params) path += "?" + querystring.stringify(params);
            let url = this.baseURL + path;
            const start = new Date().toISOString();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "GET" + path + payload)
                .digest("base64");
            let headers = Object.assign({}, DEFAULT_HEADERS);
            headers["OK-ACCESS-TIMESTAMP"] = start;
            headers["OK-ACCESS-KEY"] = this.api_key;
            headers["OK-ACCESS-SIGN"] = signature;
            headers["OK-ACCESS-PASSPHRASE"] = this.passphrase;
            let data = await http.get(url, {
                timeout: 2000,
                headers: headers,
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            throw error;
        }
    };
    makeOrderParams = () => {
        return {};
    };
    async getAllContracts() {
        try {
            let path = "/api/v5/public/instruments";
            let res = await this.call_get(path, { instType: "SWAP" });

            if (res.code == "0") {
                let data = [];
                res.data.map((symbolInfo) => {
                    data.push({
                        symbol: symbolInfo.instId,
                        tickSize: symbolInfo.tickSz,
                        stepSize: symbolInfo.ctVal,
                        minQty: symbolInfo.minSz,
                        maxMarketQty: symbolInfo.maxMktSz,
                    });
                });
                return data;
            } else return [];
        } catch (error) {
            logger.error(error.message);
            return [];
        }
    }
    async getAccountInfo() {
        try {
            let path = "/api/v5/account/balance";
            let res = await this.call_get(path);

            return res;
        } catch (error) {
            logger.error(error);
            return [];
        }
    }
    futuresAccountBalance = async () => {
        try {
            let path = "/api/v5/account/balance";
            let res = await this.call_get(path, { ccy: "USDT" });
            if (res.code == "0") {
                let data = res.data[0];

                return {
                    balance: data.totalEq,
                    crossUnPnl: data.isoEq,
                    availableBalance: data.totalEq,
                };
            }
        } catch (error) {
            console.log(error);
        }
    };
    async getFuturesPrices(symbol) {
        try {
            if (!symbol.includes("USDT")) symbol = symbol + "-USDT-SWAP";
            if (!this.startGetPrice) this.startGetPrice = Date.now();
            else if (Date.now() - this.startGetPrice < 1000 * 60 * 3) {
                if (this.prices[symbol]) return this.prices[symbol];
            }
            let path = "/api/v5/public/mark-price";
            let res = await this.call_get(path, { instType: "SWAP", instId: symbol });
            if (res.code == "0") {
                let data = res.data[0];

                this.prices[symbol] = parseFloat(data.markPx);
            }
            this.startGetPrice = Date.now();
            return this.prices[symbol];
        } catch (error) {
            console.log(error);
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let path = "/api/v5/account/positions";
            let data = {
                instType: "SWAP",
            };
            const SymbolInfo = require("../../../local-storages/futures-symbol");

            let res = await this.call_get(path, data);
            if (res.code == "0") {
                let p = [];
                res.data.map((position) => {
                    if (parseFloat(position.pos) > 0) {
                        const stepSize = SymbolInfo.getStepSizeOfSymbol(position.instId, "okex");
                        p.push({
                            symbol: position.instId,
                            positionAmt: parseFloat(position.pos),
                            currentCost: parseFloat(position.margin),
                            costAmount: parseFloat(position.margin),
                            isolatedWallet: parseFloat(position.margin),
                            unRealizedProfit: parseFloat(position.upl),
                            entryPrice: parseFloat(position.avgPx),
                            markPrice: parseFloat(position.last),
                            liquidationPrice: parseFloat(position.liqPx),
                            marginType: position.mgnMode,
                            leverage: parseFloat(position.lever),
                            positionSide: position.posSide == "long" ? "LONG" : "SHORT",
                            updateTime: new Date(),
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
            logger.error(error.message);
            throw error;
        }
    };
    futuresGetOpenPosition = async (symbol) => {
        return this.futuresGetAllPositions(symbol, false);
    };
    futuresGetOpenPositionBySymbolAndSide = async (symbol, side) => {
        try {
            let res = await this.futuresGetAllPositions(symbol, side);
            if (res.length > 0) {
                return res[0];
            } else return false;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
    async getTest() {
        try {
            let path = "/api/wallet/balances";
            let data = {
                showAvgPrice: true,
            };
            let res = await this.call_get(path, data);
            return res;
        } catch (error) {
            console.error(error);
            return [];
        }
    }
    async futuresMarginType(symbol, mode = "cross") {
        try {
            let res = await this.call_post("/api/v5/account/set-leverage", {
                mode: mode,
                symbol: symbol,
            });

            return res;
        } catch (error) {
            console.error(error);
        }
    }
    async futuresLeverage(symbol, level) {
        try {
            let res = await this.call_post("/api/v5/account/set-leverage", {
                instId: symbol,
                lever: level,
                mgnMode: "cross",
                posSide: "long",
            });
            if (res.code === "0") return {};
            return res;
        } catch (error) {
            console.error(error);
        }
    }
    futuresOpenLong = async (symbol, price = "", size) => {
        try {
            let res = await this.call_post("/api/v5/trade/order", {
                instId: symbol,
                tdMode: "cross",
                side: "buy",
                posSide: "long",
                ordType: "market",
                sz: size,
                px: "",
            });
            logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].ordId,
                    size: size,
                    updateTime: new Date().getTime(),
                    symbol: symbol,
                    side: "BUY",
                    positionSide: "LONG",
                    status: "NEW",
                    price: price || 0,
                    origQty: size,
                    type: "MARKET",
                };
            } else {
                res.code = true;
                res.msg = res.msg + res.data?.[0]?.sMsg;
                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresLimitCloseLong = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                tdMode: "cross",
                posSide: "long",

                instType: "SWAP",
                side: "sell",
                ordType: "limit",
                sz: `${size}`,
                px: new BigNumber(price).toFixed(),
                reduceOnly: true,
                reduceOnly: true,
            };

            let res = await this.call_post("/api/v5/trade/order", params);
            logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].ordId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };

    futuresTakeProfitLong = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                ordType: "conditional",
                posSide: "long",
                side: "sell",
                sz: size,
                tdMode: "cross",
                reduceOnly: true,
                tpOrdPx: -1,
                hasTp: true,
                hasSl: false,
                tpTriggerPx: new BigNumber(price).toFixed(),
                tpTriggerPxType: "last",
                cxlOnClosePos: true,
            };
            // params = {
            //     "sz": "9",
            //     "side": "sell",
            //     "hasTp": true,
            //     "hasSl": false,
            //     "tpTriggerPx": "0.6000",
            //     "tpTriggerPxType": "last",
            //     "tpOrdPx": -1,
            //     "tpOrdKind": "condition",
            //     "isTpLimit": false,
            //     "instId": "MATIC-USDT-SWAP",
            //     "tdMode": "cross",
            //     "posSide": "long",
            //     "ordType": "conditional",
            //     "_feReq": true,
            //     "reduceOnly": true,
            //     "cxlOnClosePos": true
            //   }
            let res = await this.call_post("/api/v5/trade/order-algo", params);
            logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);
            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresStopLossLong = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                ordType: "conditional",
                posSide: "long",
                side: "sell",
                sz: size,
                tdMode: "cross",
                reduceOnly: true,
                slOrdPx: -1,
                hasTp: false,
                hasSl: true,
                slTriggerPx: new BigNumber(price).toFixed(),
                slTriggerPxType: "last",
                cxlOnClosePos: true,
            };

            let res = await this.call_post("/api/v5/trade/order-algo", params);

            logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresStopLimitLong = async (symbol, price, stopPrice, size) => {
        try {
            let params = {
                instId: symbol,
                ordType: "conditional",
                posSide: "long",
                side: "sell",
                sz: size,
                tdMode: "cross",
                reduceOnly: true,
                slOrdPx: -1,
                hasTp: false,
                hasSl: true,
                slTriggerPx: new BigNumber(price).toFixed(),
                slTriggerPxType: "last",
                cxlOnClosePos: true,
            };

            let res = await this.call_post("/api/v5/trade/order-algo", params);
            logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresMarketCloseLong = async (symbol) => {
        try {
            let params = {
                instId: symbol,
                posSide: "long",
                mgnMode: "cross",
                autoCxl: true,
            };
            let res = await this.call_post("/api/v5/trade/close-position", params);
            if (res.code === "0") {
                return {
                    orderId: res.data[0].clOrdId,
                    symbol: symbol,
                    positionSide: "SHORT",
                    status: "NEW",
                };
            } else {
                res.code = true;
                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresOpenShort = async (symbol, price = "", size) => {
        try {
            let res = await this.call_post("/api/v5/trade/order", {
                instId: symbol,
                tdMode: "cross",
                side: "sell",
                posSide: "short",
                ordType: "market",
                sz: size,
                px: "",
            });
            logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
            if (res.code === "0") {
                return {
                    orderId: res.data[0].ordId,
                    size: size,
                    updateTime: new Date().getTime(),
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
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
    futuresLimitCloseShort = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                tdMode: "cross",
                posSide: "short",

                instType: "SWAP",
                side: "buy",
                ordType: "limit",
                sz: size.toString(),
                px: new BigNumber(price).toFixed(),
            };

            let res = await this.call_post("/api/v5/trade/order", params);
            logger.debug(`[futuresLimitCloseShort] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].ordId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };

    futuresTakeProfitShort = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                ordType: "conditional",
                posSide: "short",
                side: "buy",
                sz: size,
                tdMode: "cross",
                reduceOnly: true,
                tpOrdPx: -1,
                hasTp: true,
                hasSl: false,
                tpTriggerPx: new BigNumber(price).toFixed(),
                tpTriggerPxType: "last",
                cxlOnClosePos: true,
            };

            let res = await this.call_post("/api/v5/trade/order-algo", params);
            logger.debug(`[futuresTakeProfitShort] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);
            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    status: "NEW",
                };
            } else {
                res.code = true;

                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresStopLossShort = async (symbol, price, size) => {
        try {
            let params = {
                instId: symbol,
                ordType: "conditional",
                posSide: "short",
                side: "buy",
                sz: size,
                tdMode: "cross",
                reduceOnly: true,
                slOrdPx: -1,
                hasTp: false,
                hasSl: true,
                slTriggerPx: new BigNumber(price).toFixed(),
                slTriggerPxType: "last",
                cxlOnClosePos: true,
            };

            let res = await this.call_post("/api/v5/trade/order-algo", params);
            logger.debug(`[futuresStopLossShort] ${JSONbig.stringify(res)}`);
            logger.debug(`${symbol} ${price} ${size}`);

            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    status: "NEW",
                };
            } else {
                res.code = true;
                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    futuresMarketCloseShort = async (symbol) => {
        try {
            let params = {
                instId: symbol,
                posSide: "short",
                mgnMode: "cross",
            };
            let res = await this.call_post("/api/v5/trade/close-position", params);
            if (res.code === "0") {
                return {
                    orderId: res.data[0].algoId,
                    symbol: symbol,
                    positionSide: "SHORT",
                    status: "NEW",
                };
            } else {
                res.code = true;
                return res;
            }
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
    };
    async fututesCancelAll(symbol) {
        try {
            let orders = await this.futuresGetAllOrdersOfSymbol(symbol);
            let res = [];
            if (orders.length > 0) res = await this.call_post("/api/v5/trade/cancel-algos", orders);
            return res;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    futuresCancel = async (symbol, orders) => {
        try {
            let params = { algoId: orders.orderId, instId: symbol };
            let res = await this.call_post("/api/v5/trade/cancel-algos", [params]);

            return res;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
    futuresCancelMultiOrders = async (symbol, orders) => {
        try {
            let params = orders.map((order) => {
                return {
                    instId: symbol,
                    algoId: order.orderId,
                };
            });
            let res = await this.call_post("/api/v5/trade/cancel-algos", params);
            return res;
        } catch (error) {
            console.error(error);
            return {
                code: error.code,
                msg: error.msg,
            };
        }
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
            let orders = [];
            let path = "/api/v5/trade/orders-algo-pending";
            let data = {
                instType: "SWAP",
                instId: symbol,
                ordType: "oco,conditional",
            };
            let res = await this.call_get(path, data);

            if (res.code === "0") {
                orders = res.data.map((order) => order);
            }
            path = "/api/v5/trade/orders-pending";
            data = {
                instType: "SWAP",
                instId: symbol,
                // ordType: "conditional",
            };

            res = await this.call_get(path, data);

            // console.log(res.data);
            if (res.code === "0") {
                orders = orders.concat(res.data.map((order) => order));
                return orders.map((order) => {
                    let a = {
                        symbol: order.instId,
                        algoId: order.algoId || order.ordId,
                        orderType: order.ordType.toUpperCase(),
                        type: order.ordType?.toUpperCase(),
                        orderId: order.algoId || order.ordId,
                        orderStatus: order.state.toUpperCase(),
                        price: order.px || order.tpTriggerPx,
                        stopPrice: order.triggerPx || order.slTriggerPx,
                        amount: order.sz,
                        origQty: order.sz,
                        side: order.side.toUpperCase(),
                        positionSide: order.posSide.toUpperCase(),
                    };
                    return a;
                });
            }
            return [];
        } catch (error) {
            console.log(error);
            return [];
        }
    };
    getOrderStatus = (state) => {
        let status = state.toUpperCase();
        switch (state) {
            case "live":
            case "pause":
                status = "NEW";
                break;
            case "canceled":
            case "order_failed":
                status = "CANCELLED";
                break;

            case "partially_effective":
                status = "PARTIALLY_FILLED";
                break;
            case "effective":
                status = "FILLED";
                break;
        }
        return status;
    };
    futuresOrderStatus = async (symbol = false, params = {}) => {
        try {
            let path = "/api/v5/trade/order";
            let data = {
                ordId: params.orderId,
                instId: symbol,
            };
            let res = await this.call_get(path, data);

            if (res.code === "0") {
                let results = res.data.map((order) => {
                    let a = {
                        symbol: order.instId,
                        status: this.getOrderStatus(order.state),
                        orderType: order.ordType.toUpperCase(),
                        type: order.slTriggerPxType?.toUpperCase() + order.ordType?.toUpperCase(),
                        orderId: order.algoId || order.ordId,
                        orderStatus: order.state.toUpperCase(),

                        price: order.px,
                        stopPrice: order.triggerPx,
                        amount: order.sz,
                        origQty: order.sz,
                        side: order.side.toUpperCase(),
                        positionSide: order.posSide.toUpperCase(),
                        updateTime: +order.uTime,
                        time: +order.uTime,
                    };
                    return a;
                });
                if (params.orderId) return results[0] || {};
                else return results;
            } else {
                path = "/api/v5/trade/order-algo";
                data = {
                    instId: symbol,
                    algoId: params.orderId,
                };
                res = await this.call_get(path, data);

                if (res.code === "0") {
                    let results = res.data.map((order) => {
                        console.log(order);
                        let status = this.getOrderStatus(order.state);
                        let a = {
                            symbol: order.instId,
                            status: status,
                            orderType: order.ordType.toUpperCase(),
                            type:
                                order.slTriggerPxType?.toUpperCase() + order.ordType?.toUpperCase(),
                            orderId: order.algoId || order.ordId,
                            orderStatus: status,
                            price: order.slTriggerPx || order.tpTriggerPx,
                            stopPrice: order.triggerPx,
                            amount: order.sz,
                            origQty: order.sz,
                            side: order.side.toUpperCase(),
                            positionSide: order.posSide.toUpperCase(),
                            updateTime: +order.uTime,
                            time: +order.uTime,
                        };
                        return a;
                    });
                    if (params.orderId) return results[0] || {};
                    else return results;
                }
            }
        } catch (error) {
            console.error(error);
            if (params.orderId) return {};
            else return [];
        }
    };

    futuresOpenOrders = async (symbol) => this.futuresGetAllOrdersOfSymbol(symbol);
    async futuresIncome(data = {}) {
        try {
            let path = "/api/v5/account/positions-history";
            let params = {
                instType: "SWAP",
            };
            if (data.startTime) params.before = data.startTime; //.toString();
            if (data.endTime) params.after = data.endTime; //.toString();
            if (data.symbol) params.instId = data.symbol;
            let res = await this.call_get(path, params);
            if (res.code === "0") {
                return res.data.map((order) => {
                    return {
                        symbol: order.instId,
                        incomeType: "REALIZED_PNL",
                        income: order.realizedPnl,
                        time: +order.uTime,
                        date: new Date(+order.uTime),
                        // date2: new Date(+order.cTime),
                    };
                });
            } else return [];
        } catch (error) {
            return [];
        }
    }
    async futuresUserTrades(symbol) {
        try {
            let path = "/api/v5/trade/fills";
            let data = {
                instType: "SWAP",
                instId: symbol,
            };
            let res = await this.call_get(path, data);
            let newTradeHistorys = [];
            if (res.code === "0") {
                let tradeHistorys = res.data;
                let length = tradeHistorys.length;
                for (let i = length - 1; i >= 0; i--) {
                    let tradeHistory = tradeHistorys[i];
                    newTradeHistorys.push({
                        symbol: tradeHistory.instId,
                        price: tradeHistory.fillPx,
                        time: parseFloat(tradeHistory.ts),
                    });
                }
            }
            return newTradeHistorys;
        } catch (error) {
            return [];
        }
    }
}

module.exports = Okex;
