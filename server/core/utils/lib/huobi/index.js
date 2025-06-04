var CryptoJS = require("crypto-js");
var moment = require("moment");
var HmacSHA256 = require("crypto-js/hmac-sha256");
var http = require("./http");
var url = require("url");
var JSONbig = require("json-bigint");
const logger = require("../../logger");
const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36",
};

class Huobi {
    constructor(config = {}) {
        this.baseURL = "https://api.hbdm.com";
        this.api_key = config.api_key;
        this.api_secret = config.api_secret;
        this.exchange = "huobi";
        this.lastId = Math.round(Math.random() * 500 + 10);
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

    call_post = async (path, params = {}) => {
        try {
            path = this.baseURL + path;
            var host = url.parse(path).host;
            var cpath = url.parse(path).path;
            var body = Object.assign(this.get_body(), params);
            var payload = this.sign_sha("POST", host, cpath, body);

            let payloadPath = `${path}?${payload}`;
            let data = await http.post(payloadPath, body, {
                timeout: 1000,
                headers: DEFAULT_HEADERS,
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            console.log(error.message);
            throw error;
        }
    };
    call_get = async (path) => {
        try {
            let url = this.baseURL + path;
            let data = await http.get(url, {
                timeout: 1000,
                headers: DEFAULT_HEADERS,
            });
            let json = JSONbig.parse(data);
            return json;
        } catch (error) {
            throw error;
        }
    };
    async getAllContracts() {
        try {
            let path = "/linear-swap-api/v1/swap_contract_info";
            let res = await this.call_get(path);
            if (res.status == "ok") {
                let data = res.data.map((symbolInfo) => {
                    return {
                        symbol: symbolInfo.contract_code,
                        tickSize: !!symbolInfo.price_tick.toNumber
                            ? symbolInfo.price_tick.toNumber()
                            : symbolInfo.price_tick,
                        stepSize: !!symbolInfo.contract_size.toNumber
                            ? symbolInfo.contract_size.toNumber()
                            : symbolInfo.contract_size,
                    };
                });
                return data;
            } else return [];
        } catch (error) {
            console.log(error.message);
            return [];
        }
    }
    futuresGetAllPositions = async (symbol = false, side = false) => {
        try {
            let res = await this.call_post("/linear-swap-api/v1/swap_cross_position_info", {});
            if (res.status == "ok") {
                let p = res.data.map((position) => {
                    return {
                        symbol: position.contract_code,
                        positionAmt: position.volume.toNumber(),
                        currentCost: position.position_margin.toNumber(),
                        costAmount: position.position_margin.toNumber(),
                        isolatedWallet: position.position_margin.toNumber(),
                        unRealizedProfit: position.profit.toNumber(),
                        entryPrice: position.cost_open.toNumber(),
                        markPrice: position.last_price,
                        liquidationPrice: position.liquidationPrice || 0,
                        marginType: position.margin_mode ? "cross" : "isolated",
                        leverage: position.lever_rate,
                        positionSide: position.direction == "buy" ? "LONG" : "SHORT",
                    };
                });
                if (!!side) p = p.filter((position) => position.positionSide === side);
                if (!!symbol) {
                    let s = symbol;
                    p = p.filter((position) => position.symbol === s);
                }
                return p;
            } else return [];
        } catch (error) {
            console.log(error.message);
            return [];
        }
    };
    futuresGetOpenPosition = async (symbol) => {
        try {
            let res = await this.call_post("/linear-swap-api/v1/swap_cross_position_info", {
                contract_code: symbol,
            });
            if (res.status == "ok") {
                let position = res.data[0];
                return {
                    symbol: position.contract_code,
                    positionAmt: position.volume.toNumber(),
                    currentCost: position.position_margin.toNumber(),
                    costAmount: position.position_margin.toNumber(),
                    isolatedWallet: position.position_margin.toNumber(),
                    unRealizedProfit: position.profit.toNumber(),
                    entryPrice: position.cost_open.toNumber(),
                    markPrice: position.last_price,
                    liquidationPrice: position.liquidationPrice || 0,
                    marginType: position.margin_mode ? "cross" : "isolated",
                    leverage: position.lever_rate,
                    positionSide: position.direction == "buy" ? "LONG" : "SHORT",
                    updateTime: new Date(),
                };
            } else return false;
        } catch (error) {
            console.log(error.message);
            return false;
        }
    };
    futuresGetOpenPositionBySymbolAndSide = async (symbol, side) => {
        try {
            let res = await this.call_post("/linear-swap-api/v1/swap_cross_position_info", {
                contract_code: symbol,
            });
            logger.debug(`[futuresGetOpenPositionBySymbolAndSide] ${JSONbig.stringify(res)}`);
            if (res.status == "ok" && res.data.length > 0) {
                let direction = side == "LONG" ? "buy" : "sell";
                let position = res.data.find((p) => p.direction == direction);

                return {
                    symbol: position.contract_code,
                    positionAmt: position.volume.toNumber(),
                    currentCost: position.position_margin.toNumber(),
                    costAmount: position.position_margin.toNumber(),
                    isolatedWallet: position.position_margin.toNumber(),
                    unRealizedProfit: position.profit.toNumber(),
                    entryPrice: position.cost_open.toNumber
                        ? position.cost_open.toNumber()
                        : position.cost_open,
                    markPrice: position.last_price,
                    liquidationPrice: position.liquidationPrice || 0,
                    marginType: position.margin_mode ? "cross" : "isolated",
                    leverage: position.lever_rate,
                    positionSide: position.direction == "buy" ? "LONG" : "SHORT",
                    updateTime: new Date(),
                };
            } else return false;
        } catch (error) {
            console.log(error.message);
            return false;
        }
    };
    futuresAccountBalance = async () => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_account_info", {});
        if (res.status == "ok") {
            let balance = res.data[0];
            return {
                balance: balance.withdraw_available.toNumber
                    ? balance.withdraw_available.toNumber()
                    : balance.withdraw_available,
                crossUnPnl: balance.margin_position.toNumber
                    ? balance.margin_position.toNumber()
                    : balance.margin_position,
                availableBalance: balance.margin_balance.toNumber
                    ? balance.margin_balance.toNumber()
                    : balance.margin_balance,
            };
        }
    };
    async futuresLeverage(symbol, level) {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_switch_lever_rate", {
            contract_code: symbol,
            lever_rate: level,
        });
        return res;
    }
    futuresOpenLong = async (symbol, price = "", size, leverage) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_order", {
            client_order_id: this.lastId++,
            contract_code: symbol,
            offset: "open",
            lever_rate: leverage,
            order_price_type: "optimal_20_ioc",
            direction: "buy",
            volume: size,
            price: "",
        });
        logger.debug(`Futures Open Log ${JSONbig.stringify(res)}`);
        if (res.status === "ok") {
            return {
                order_id: res.data.order_id.toNumber(),
                client_order_id: res.data.client_order_id,
                updateTime: new Date(),
            };
        } else {
            res.code = true;
            return res;
        }
    };
    futuresOpenLongWithTpSl = async (symbol, size, leverage, tpPrice, slPrice) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_order", {
            client_order_id: this.lastId++,
            check_min_volume: 0,
            contract_code: symbol,
            direction: "buy",
            lever_rate: leverage,
            offset: "open",
            order_price_type: "optimal_20_ioc",
            price: "",
            volume: size,
            tp_trigger_price: tpPrice,
            //tp_order_price: tpPrice,
            tp_order_price_type: "optimal_20",
            sl_trigger_price: slPrice,
            //sl_order_price: slPrice,
            sl_order_price_type: "optimal_20",
        });

        return res;
    };
    futuresTpSlLong = async (symbol, size, tpPrice, slPrice) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_order", {
            contract_code: symbol,
            offset: "open",
            direction: "sell",
            volume: size,
            tp_trigger_price: tpPrice,
            //tp_order_price: tpPrice,
            tp_order_price_type: "optimal_20",
            sl_trigger_price: slPrice,
            //sl_order_price: slPrice,
            sl_order_price_type: "optimal_20",
        });
        if (res.status == "ok") {
            return {
                tp_order: res.data.tp_order.order_id_str,
                sl_order: res.data.sl_order.order_id_str,
                status: "NEW",
            };
        }
        return res;
    };
    futuresLimitCloseLong = async (symbol, price, size, leverage) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_order", {
            client_order_id: this.lastId++,
            price,
            contract_code: symbol,
            offset: "close",
            direction: "sell",
            volume: size,
            lever_rate: leverage,
            order_price_type: "limit",
            price: price,
        });
        logger.debug(`[futuresLimitCloseLong] ${JSONbig.stringify(res)}`);
        if (res.status == "ok") {
            return {
                orderId: res.data.order_id_str,
                status: "NEW",
            };
        }
        console.log("futuresLimitCloseLong");
        console.log(res);
        return res;
    };

    futuresTakeProfitLong = async (symbol, price, size) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_order", {
            contract_code: symbol,
            offset: "open",
            direction: "sell",
            volume: size,
            tp_trigger_price: price,
            tp_order_price_type: "optimal_20",
        });
        logger.debug(`[futuresTakeProfitLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.status == "ok") {
            return {
                orderId: res.data.tp_order.order_id_str,
                status: "NEW",
            };
        }
        console.log("futuresTakeProfitLong");
        console.log(res);
        return res;
    };
    futuresStopLossLong = async (symbol, price, size) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_order", {
            contract_code: symbol,
            offset: "open",
            direction: "sell",
            volume: size,
            sl_trigger_price: price,
            sl_order_price_type: "optimal_20",
        });

        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.status == "ok") {
            return {
                orderId: res.data.sl_order.order_id_str,
                status: "NEW",
            };
        }
        console.log(res);
        return res;
    };
    futuresStopLossTriggerLong = async (symbol, price, size) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_trigger_order", {
            contract_code: symbol,
            offset: "close",
            direction: "sell",
            order_price: "",
            order_price_type: "optimal_20",
            volume: size,
            trigger_price: price,
            trigger_type: "le",
        });
        console.log(res);
        logger.debug(`[futuresStopLossLong] ${JSONbig.stringify(res)}`);
        logger.debug(`${symbol} ${price} ${size}`);
        if (res.status == "ok") {
            return {
                orderId: res.data.order_id_str,
                status: "NEW",
            };
        }
        console.log(res);
        return res;
    };
    futuresMarketCloseLong = async (symbol, size = 0) => {
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_order", {
            contract_code: symbol,
            direction: "sell",
            offset: "close",
            order_price_type: "optimal_20",
            volume: size,
            price: "",
        });
        logger.debug(`[futuresMarketCloseLong] ${JSONbig.stringify(res)}`);
        if (res.status == "ok") {
            return {
                orderId: res.data.order_id_str,
                status: "NEW",
            };
        }
        console.log("futuresMarketCloseLong");
        console.log(res);
        return res;
    };
    async fututesCancelAll(symbol) {
        let params = {
            contract_code: symbol,
        };
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_cancelall", params);
        return res;
    }
    futuresCancel = async (symbol, orders) => {
        let params = {
            contract_code: symbol,
            order_id: orders.orderId,
        };
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_cancel", params);
        return res;
    };
    futuresCancelMultiOrderOfSymbol = async (symbol) => {
        return this.futuresCancelAllOrdersOfSymbol(symbol);
    };
    fututesCancelAllTpSl = async (symbol) => {
        let params = {
            contract_code: symbol,
        };
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_cancelall", params);
        return res;
    };
    futuresCancelAllOrdersOfSymbol = async (symbol) => {
        return this.fututesCancelAll(symbol).then(() => this.fututesCancelAllTpSl(symbol));
    };
    async fututesGetAllTpSl(symbol) {
        let params = {
            contract_code: symbol,
        };
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_tpsl_openorders", params);
        return res;
    }
    futuresGetAllOrdersOfSymbol(symbol) {}
    fututesCancelAllTrailing = async (symbol) => {
        let params = {
            contract_code: symbol,
        };
        let res = await this.call_post("/linear-swap-api/v1/swap_cross_track_cancelall", params);
        return res;
    };
    async futuresIncome() {
        return [];
    }
    async futuresUserTrades() {
        return [];
    }
}

module.exports = Huobi;
