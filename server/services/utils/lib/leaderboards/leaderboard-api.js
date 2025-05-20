const got = require("got");
const BASE_API = "https://www.binance.com/bapi/futures/";
const axios = require("axios");
const FuturesPrices = require("../../../local-storages/futures-prices");
const logger = require("../../logger");
module.exports = {
    id: null,
    tradeType: null,
    init(payload) {
        this.id = payload.id;
        this.tradeType = payload.tradeType;
    },
    async getOtherPosition(id, headers) {
        try {
            let url = BASE_API + "v1/public/future/leaderboard/getOtherPosition";
            url = BASE_API + "v2/private/future/leaderboard/getOtherPosition";
            const payload = {
                json: {
                    encryptedUid: id,
                    tradeType: "PERPETUAL",
                },
            };
            // console.log(headers);
            // headers = {
            //     Cookie: `p20t=web.13160827.832E2892B969985E854B4F47AAD069E2`,
            //     Clienttype: "web",
            //     Csrftoken: "5685498b52db97e85800d3cb17a1308ca",
            //     Usertoken: "5685498b52db97e85800d3cb17a1308a",
            //     // lang: "en",
            //     // "Content-Type": "application/json",
            //     "User-Agent":
            //         "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            // };
            const { data } = await axios.post(url, payload.json, {
                headers: headers,
            });
            // console.log(data);
            if (!!data?.success)
                return data.data?.otherPositionRetList
                    ? data.data?.otherPositionRetList.map((pos) => {
                          let side = pos.amount > 0 ? "LONG" : "SHORT";
                          let volume = Math.abs(pos.amount * pos.entryPrice);
                          return {
                              side: side,
                              volume: volume,
                              costAmount: (pos.amount * pos.entryPrice) / pos.leverage,
                              ...pos,
                          };
                      })
                    : [];
            return false;
        } catch (error) {
            // console.log(error.response?.data);

            throw error;
        }
    },
    async getPositionStatus(ids, tradeType = "PERPETUAL") {
        try {
            const url = BASE_API + "v1/public/future/leaderboard/getPositionStatus";
            const payload = {
                encryptedUidList: ids,
                tradeType: tradeType,
            };
            const { data } = await axios.post(url, payload);
            if (!!data?.success) return data.data;
            return false;
        } catch (error) {
            throw error;
        }
    },
    async getTraderWagonInfo(id) {
        try {
            let url =
                "https://www.traderwagon.com/v1/public/social-trading/lead-portfolio/get-portfolio/";
            url += id;
            const { data } = await axios.get(url);
            let result = data.data;
            if (!result) result = { positionVisible: false, name: id };
            if (result.positionVisible == false) return false;
            else
                return {
                    nickName: result.name,
                    ...result,
                };
        } catch (error) {
            throw error;
        }
    },
    async getTraderWagonPosition(id) {
        try {
            let url =
                "https://www.traderwagon.com/v1/public/social-trading/lead-portfolio/get-position-info/";

            url += id;
            const { data } = await axios.get(url);
            if (!!data.data)
                return data.data.map((pos) => {
                    return {
                        symbol: pos.symbol,
                        entryPrice: parseFloat(pos.entryPrice),
                        markPrice: parseFloat(pos.markPrice || pos.entryPrice),
                        pnl: parseFloat(pos.unrealizedProfit),
                        roe:
                            (parseFloat(pos.unrealizedProfit) * pos.leverage) /
                            (parseFloat(pos.entryPrice) * parseFloat(pos.positionAmount)),
                        amount: parseFloat(pos.positionAmount),
                        leverage: pos.leverage,
                        positionSide: parseFloat(pos.positionAmount) > 0 ? "LONG" : "SHORT",
                        side: parseFloat(pos.positionAmount) > 0 ? "LONG" : "SHORT",
                        costAmount: (pos.amount * pos.entryPrice) / pos.leverage,
                        volume: Math.abs(pos.amount * pos.entryPrice),
                        updateTimeStamp: Date.now(),
                    };
                });
            else return false;
        } catch (error) {
            throw error;
        }
    },
    async getBybitPosition(id, headers) {
        try {
            let url =
                "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=";

            url += id + `&timeStamp=${Date.now()}`; //YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
            // console.log(url);
            const { data } = await axios.get(url, {
                headers: headers,
            });

            if (data?.retMsg == "success") {
                let result = data.result;
                if (result.openTradeInfoProtection !== 0) {
                    logger.error(`[getBybitPosition] ${JSON.stringify(result)}`);
                    return false;
                }
                let res = await Promise.all(
                    result.data.map(async (pos) => {
                        let amount = parseFloat(pos.sizeX) / 100000000;
                        let leverage = parseFloat(pos.leverageE2) / 100;
                        let markPrice = await FuturesPrices.getSymbolPrice(pos.symbol);
                        let entryPrice = parseFloat(pos.entryPrice);
                        let side = pos.side === "Sell" ? "SHORT" : "LONG";
                        let sign = pos.side === "Sell" ? -1 : 1;
                        let roe = ((markPrice - entryPrice) * sign * leverage) / entryPrice;
                        let pnl = (amount * markPrice * roe) / leverage;
                        let costAmount = (amount * entryPrice) / leverage;
                        let volume = Math.abs(amount * entryPrice);
                        return {
                            symbol: pos.symbol,
                            entryPrice: entryPrice,
                            markPrice: markPrice,
                            pnl: pnl,
                            roe: roe,
                            amount: amount,
                            leverage: leverage,
                            positionSide: side,
                            side: side,
                            costAmount,
                            volume,
                            updateTimeStamp: data.time,
                        };
                    })
                );
                return res;
            }
            // logger.error(`[getBybitPosition] ${JSON.stringify(data)}`);
            throw new Error(`[getBybitPosition  ${JSON.stringify(data)}`);
        } catch (error) {
            throw error;
        }
    },
    async getOkexPosition(id) {
        try {
            let url = "https://www.okx.com/priapi/v5/ecotrade/public/position-summary?uniqueName=";

            url += id + `&t=${Date.now()}`; //YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
            // console.log(url);

            const { data } = await axios.get(url);
            if (data?.code == "0") {
                let result = data.data;
                let res = await Promise.all(
                    result.map(async (pos) => {
                        let symbol = pos.instId.replace(/-/g, "").replace(/SWAP/g, "");
                        let amount = (parseFloat(pos.margin) * pos.lever) / pos.openAvgPx;
                        let side = "LONG";
                        if (pos.posSide == "short") side = "SHORT";
                        else if (pos.posSide == "net" && parseFloat(pos.availSubPos) < 0)
                            side = "SHORT";
                        let volume = Math.abs(pos.margin * pos.lever);
                        return {
                            symbol: symbol,
                            entryPrice: +pos.openAvgPx,
                            markPrice: +pos.markPx,
                            pnl: +pos.pnl,
                            roe: +pos.pnlRatio,
                            amount: amount,
                            leverage: +pos.lever,
                            positionSide: side,
                            side: side,
                            costAmount: +pos.margin,
                            volume,
                            updateTimeStamp: +pos.uTime,
                        };
                    })
                );
                return res;
            }
            throw new Error(`[getOkexPosition  ${JSON.stringify(data)}`);
        } catch (error) {
            throw error;
        }
    },
    async getBinanceCopyPosition(id, headers) {
        try {
            let url =
                "https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/lead-data/positions?symbol=AGIXUSDT&portfolioId=";
            // let url =
            // "https://www.binance.com/bapi/futures/v1/private/future/copy-trade/lead-portfolio/check-position?portfolioId=";
            url += id; //YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
            // console.log(url);

            const { data } = await axios.get(url, {
                headers: headers,
            });

            if (data?.success == true) {
                let result = data.data;
                let res = [];
                result.map((pos) => {
                    let amount = parseFloat(pos.positionAmount);
                    if (amount !== 0) {
                        let markPrice = +pos.markPrice;
                        let entryPrice = +pos.entryPrice;
                        let side =
                            pos.positionSide === "BOTH"
                                ? amount > 0
                                    ? "LONG"
                                    : "SHORT"
                                : pos.positionSide;
                        let sign = pos.positionSide === "SHORT" ? -1 : 1;
                        let roe = ((markPrice - entryPrice) * sign * pos.leverage) / entryPrice;
                        let costAmount = (amount * entryPrice) / pos.leverage;
                        let volume = Math.abs(amount * entryPrice);
                        res.push({
                            symbol: pos.symbol,
                            entryPrice: entryPrice,
                            markPrice: markPrice,
                            pnl: +pos.unrealizedProfit,
                            roe: roe,
                            amount: amount,
                            leverage: pos.leverage,
                            positionSide: side,
                            side: side,
                            costAmount: costAmount,
                            volume,
                            updateTimeStamp: Date.now(),
                        });
                    } else return false;
                });

                return res;
            }
            logger.error(`[getBinanceCopyPosition  ${JSON.stringify(data)}`);
            return false;
        } catch (error) {
            logger.error(`[getBinanceCopyPosition  ${JSON.stringify(error)}`);
            throw error;
        }
    },
    async getBinanceCopyTraderInfo(id, headers) {
        try {
            let url =
                "https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/lead-portfolio/detail?portfolioId=";
            url += id; //YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
            const { data } = await axios.get(url, {
                headers: headers,
            });
            if (data?.success != true) return false;
            if (data.data?.positionShow == false) return false;
            data.data.nickName = data.data.nickname;
            return data.data;
        } catch (error) {
            throw error;
        }
    },

    async getOkexTraderInfo(id) {
        try {
            let url = "https://www.okx.com/priapi/v5/ecotrade/public/basic-info?uniqueName=";
            url += id + `&t=${Date.now()}`; //YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
            const { data } = await axios.get(url);

            if (data?.code !== "0") return false;
            let result = data.data[0];
            return result;
        } catch (error) {
            throw error;
        }
    },
    async getBybitTraderInfo(id) {
        try {
            let url = "https://api2.bybit.com/fapi/beehive/private/v1/pub-leader/info?leaderMark=";
            url += id;
            const { data } = await axios.get(url);

            if (data?.retMsg !== "success") return false;
            let result = data.result;
            return {
                nickName: result.leaderUserName,
                ...result,
            };
        } catch (error) {
            throw error;
        }
    },
    async getLeaderboardRank(periodType = "MONTHLY", statisticsType = "ROI", limit = 100) {
        const url = BASE_API + "v3/public/future/leaderboard/getLeaderboardRank";
        //"https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getLeaderboardRank";
        const payload = {
            json: {
                isShared: true,
                periodType: periodType,
                statisticsType: statisticsType,
                tradeType: "PERPETUAL",
                limit: limit,
            },
        };
        const { data } = await got.post(url, payload).json();
        return data;
    },
    async getOtherPerformance(id) {
        try {
            const url = BASE_API + "v1/public/future/leaderboard/getOtherPerformance";
            let payload = {
                json: {
                    encryptedUid: id,
                    tradeType: "PERPETUAL",
                },
            };
            const { data } = await got.post(url, payload).json();

            return data;
        } catch (error) {
            throw error;
        }
    },
    async getOtherLeaderboardBaseInfo(id) {
        try {
            const url = BASE_API + "v1/public/future/leaderboard/getOtherLeaderboardBaseInfo";
            let payload = {
                json: {
                    encryptedUid: id,
                    tradeType: "PERPETUAL",
                },
            };

            const { data } = await axios.post(url, payload.json);

            if (data.success !== true) return false;
            if (data.data?.positionShared == false) return false;
            else return data.data;
        } catch (error) {
            throw error;
        }
    },
    async searchLeaderboard(periodType = "EXACT_YEARLY", pnlGainType = "LEVEL5", sortType = "ROI") {
        try {
            const url = BASE_API + "v1/public/future/leaderboard/searchLeaderboard";
            let payload = {
                json: {
                    isShared: true,
                    tradeType: "PERPETUAL",
                    periodType: periodType,
                    pnlGainType: pnlGainType,
                    type: "filterResults",
                    sortType: sortType,
                    limit: "200",
                },
            };
            const { data } = await got.post(url, payload).json();

            return data;
        } catch (error) {
            throw error;
        }
    },
    async getRecentPosition(id) {
        try {
            let url =
                "https://backend.copyfuture.me/binance/leaderboard/get-user-positions?encUserId=";
            url += id;
            const data = await got(url).json();

            return data;
        } catch (error) {
            throw error;
        }
    },
};
