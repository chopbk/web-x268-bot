var CryptoJS = require("crypto-js");
var moment = require("moment");
const crypto = require("crypto");
var HmacSHA256 = require("crypto-js/hmac-sha256");
var http = require("./../huobi/http");
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
        this.baseURL = "https://ftx.com";
        this.api_key = config.api_key || "";
        this.api_secret = config.api_secret || "";
        this.exchange = "ftx";
        this.lastId = Math.round(Math.random() * 500 + 10);
        this.sub_account = config.sub_account || false;
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
    get_headers = (ts, signature) => {
        let headers = Object.assign({}, DEFAULT_HEADERS);
        headers["FTX-TS"] = ts;
        headers["FTX-KEY"] = this.api_key;
        headers["FTX-SIGN"] = signature;
        if (this.sub_account) headers["FTX-SUBACCOUNT"] = this.sub_account;
        return headers;
    };
    get_signature(path, params, method) {
        let payload = "";
        if (params) payload = JSON.stringify(params);

        const start = +new Date();
        const signature = crypto
            .createHmac("sha256", this.api_secret)
            .update(start + method + path + payload)
            .digest("hex");
        return {
            ts,
            signature,
        };
    }
    call_post = async (path, params = false) => {
        try {
            let payload = "";
            if (params) payload = JSON.stringify(params);
            let url = this.baseURL + path;
            const start = +new Date();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "POST" + path + payload)
                .digest("hex");
            let data = await http.post(url, params, {
                timeout: 2000,
                headers: this.get_headers(start, signature),
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            logger.error(`[call_post] ${error}`);
            throw error;
        }
    };
    call_delete = async (path, params = false) => {
        try {
            let payload = "";
            if (params) {
                if (typeof params === "number") path += "/" + params;
                else payload = JSON.stringify(params);
            }

            let url = this.baseURL + path;
            const start = +new Date();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "DELETE" + path + payload)
                .digest("hex");
            let data = await http.delete(url, payload, {
                timeout: 2000,
                headers: this.get_headers(start, signature),
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            logger.error(`[call_delete] ${error}`);
            throw error;
        }
    };
    call_get = async (path, params = false) => {
        try {
            let payload = "";
            if (params) path += "?" + querystring.stringify(params);
            let url = this.baseURL + path;
            const start = +new Date();
            const signature = crypto
                .createHmac("sha256", this.api_secret)
                .update(start + "GET" + path + payload)
                .digest("hex");
            let data = await http.get(url, {
                timeout: 2000,
                headers: this.get_headers(start, signature),
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            console.log(error);
            throw error;
        }
    };
    async getAllContracts() {
        try {
            let path = "/api/futures";
            let res = await this.call_get(path);

            if (res.success == true) {
                let data = [];
                res.result.map((symbolInfo) => {
                    data.push({
                        symbol: symbolInfo.name,
                        tickSize: symbolInfo.priceIncrement,
                        stepSize: symbolInfo.sizeIncrement,
                    });
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
            let path = "/api/positions";
            let data = {
                showAvgPrice: true,
            };
            let res = await this.call_get(path, data);
            if (res.success === true) {
                let p = [];
                res.result.map((position) => {
                    if (position.size > 0)
                        p.push({
                            symbol: position.future,
                            positionAmt: position.size,
                            currentCost: position.cost,
                            costAmount: position.cost,
                            isolatedWallet: position.cost,
                            unRealizedProfit: position.recentPnl,
                            entryPrice: position.recentAverageOpenPrice,
                            markPrice: position.entryPrice,
                            liquidationPrice: position.estimatedLiquidationPrice.toNumber
                                ? position.estimatedLiquidationPrice.toNumber()
                                : position.estimatedLiquidationPrice || 0,
                            marginType: "cross",
                            leverage: 20,
                            positionSide: position.side == "buy" ? "LONG" : "SHORT",
                            updateTime: new Date(),
                        });
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
            let res = await this.futuresGetAllPositions(symbol, side);
            if (res.length > 0) {
                return res[0];
            } else return false;
        } catch (error) {
            logger.error(`[futuresGetOpenPositionBySymbolAndSide] ${error}`);
            return false;
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
            console.log(error);
            return [];
        }
    }

    futuresAccountBalance = async () => {
        let path = "/api/wallet/balances";
        let res = await this.call_get(path);
        let balance = 0;
        let crossUnPnl = "";
        let availableBalance = "";
        if (res.success == true) {
            res.result.forEach((r) => {
                let value = r.usdValue.toNumber ? r.usdValue.toNumber() : r.usdValue;
                balance += value;

                if (value > 10) {
                    crossUnPnl += `#${r.coin}-${r.total.toFixed(2)} `;
                    availableBalance += `#${r.coin}-${r.availableWithoutBorrow.toFixed(2)} `;
                }
            });
            return {
                balance,
                crossUnPnl,
                availableBalance,
            };
        }
    };
    async futuresLeverage(symbol, level) {
        let res = await this.call_post("/api/account/leverage", {
            leverage: level,
        });
        return res;
    }
    futuresOpenLong = async (symbol, price = "", size) => {
        let res = await this.call_post("/api/orders", {
            market: symbol,
            side: "buy",
            price: null,
            type: "market",
            size: size,
        });
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.success === true) {
            return {
                order_id: res.result.id,
                client_order_id: res.result.clientId,
                size: res.result.size,
                updateTime: new Date(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresLimitCloseLong = async (symbol, price, size) => {
        let res = await this.call_post("/api/conditional_orders", {
            market: symbol,
            side: "sell",
            triggerPrice: price,
            size: size,
            orderType: "limit",
            orderPrice: price,
            type: "takeProfit",
            reduceOnly: true,
        });
        logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.success === true) {
            return {
                orderId: res.result.id,
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };

    futuresTakeProfitLong = async (symbol, price, size) => {
        let res = await this.call_post("/api/conditional_orders", {
            market: symbol,
            side: "sell",
            triggerPrice: price,
            size: size,
            type: "takeProfit",
            reduceOnly: true,
        });
        logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.success === true) {
            return {
                orderId: res.result.id,
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresStopLossLong = async (symbol, price, size) => {
        let res = await this.call_post("/api/conditional_orders", {
            market: symbol,
            side: "sell",
            triggerPrice: price,
            size: size,
            type: "stop",
            reduceOnly: true,
        });
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.success === true) {
            return {
                orderId: res.result.id,
                status: "NEW",
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresMarketCloseLong = async (symbol, size = 0) => {
        let res = await this.call_post("/api/orders", {
            market: symbol,
            side: "sell",
            price: null,
            type: "market",
            size: size,
        });
        logger.debug(`Futures Close Long ${JSONbig.stringify(res)}`);
        if (res.success === true) {
            return {
                order_id: res.result.id,
                client_order_id: res.result.clientId,
                size: res.result.size,
                updateTime: new Date(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    async fututesCancelAll(symbol) {
        let params = {
            market: symbol,
        };
        let res = await this.call_delete("/api/orders", params);
        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = orders.orderId;
        let res = await this.call_delete("/api/conditional_orders", params);
        return res;
    };

    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        return this.fututesCancelAll(symbol);
    };
    futuresCancelMultiOrderOfSymbol = async (symbol) => {
        return this.futuresCancelAllOrdersOfSymbol(symbol);
    };
    futuresGetAllOrdersOfSymbol = async (symbol) => {
        try {
            let path = "/api/orders";
            let data = {
                market: symbol,
            };
            let res = await this.call_get(path, data);

            return res;
        } catch (error) {
            return [];
        }
    };
    async futuresIncome() {
        return [];
    }
    async futuresUserTrades(symbol) {
        try {
            let path = "/api/fills";
            let data = {
                market: symbol,
            };
            let res = await this.call_get(path, data);
            let newTradeHistorys = [];
            if (res.success == true) {
                let tradeHistorys = res.result;
                let length = tradeHistorys.length;
                for (let i = length - 1; i >= 0; i--) {
                    let tradeHistory = tradeHistorys[i];
                    newTradeHistorys.push({
                        symbol: tradeHistory.future,
                        price: tradeHistory.price,
                        time: new Date(tradeHistory.time),
                    });
                }
            }
            return newTradeHistorys;
        } catch (error) {
            return [];
        }
    }
}

module.exports = Huobi;
