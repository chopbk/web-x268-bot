/**
 * @file  create connection of mongooDB
 * @author tamnd12
 * @date 19/02/2020
 */
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const UserApiSchema = require("./schemas/user-api");
const AccountConfigSchema = require("./schemas/account-config");
const MqttConfigSchema = require("./schemas/mqtt-config");
const SignalConfigSchema = require("./schemas/signal-config");
const TelegramConfigSchema = require("./schemas/telegram-config");
const SymbolInfosSchema = require("./schemas/symbol-infos");
const FuturesSymbolSchema = require("./schemas/futures-symbol");
const AccountStaticSchema = require("./schemas/account-static");
const FuturesProfitSchema = require("./schemas/futures-profit");
const SpotSymbolSchema = require("./schemas/spot-symbol");
const UserAccountSchema = require("./schemas/user-account");
const UserProfitSchema = require("./schemas/user-profit");
const TelegramClientSchema = require("./schemas/telegram-client");
const MonitorPositionSchema = require("./schemas/monitor-position");
const LeaderboardUidSchema = require("./schemas/leaderboard-uid");
const ForwarderSchema = require("./schemas/forwarder.schema");
const SignalInfoSchema = require("./schemas/signal-info");
const SignalHistorySchema = require("./schemas/signal-history");
class MongoDb {
  constructor() {}
  async init() {
    let conn = null;
    try {
      let url = process.env.MONGODB || this.config.url;
      logger.debug("[mongoLoader] connect to " + url);
      // await mongoose.connect(url, this.config.options);
      conn = await mongoose.createConnection(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,

        autoIndex: true, //this is the code I added that solved it all

        maxPoolSize: 12,
        minPoolSize: 2,
      });

      conn.on("connected", console.log);
      conn.on("disconnected", console.log);
      this.UserApiModel = conn.model("User_Api", UserApiSchema);
      this.AccountConfigModel = conn.model(
        "Account_Config",
        AccountConfigSchema
      );
      this.MqttConfigModel = conn.model("Mqtt_Config", MqttConfigSchema);
      this.SignalConfigModel = conn.model("Signal_Config", SignalConfigSchema);
      this.TelegramConfigModel = conn.model(
        "Telegram_Config",
        TelegramConfigSchema
      );
      this.SymbolInfoModel = conn.model("Symbol_Info", SymbolInfosSchema);
      this.FuturesSymbolModel = conn.model(
        "Futures_Symbol",
        FuturesSymbolSchema
      );
      this.AccountStaticModel = conn.model(
        "Account_Static",
        AccountStaticSchema
      );
      this.AccoutnStaticModel_old = conn.model(
        "Account_Static_Old",
        AccountStaticSchema
      );
      this.FuturesProfitModel = conn.model(
        "Futures_Profit",
        FuturesProfitSchema
      );
      this.SpotSymbolModel = conn.model("Spot_Symbol", SpotSymbolSchema);
      this.UserAccountModel = conn.model("User_Account", UserAccountSchema);
      this.TelegramClientModel = conn.model(
        "Telegram_Client",
        TelegramClientSchema
      );
      this.MonitorPositionModel = conn.model(
        "Monitor_Position",
        MonitorPositionSchema
      );
      this.UserProfitModel = conn.model("User_Profit", UserProfitSchema);
      this.LeaderboardUidModel = conn.model(
        "Leaderboard_Uid",
        LeaderboardUidSchema
      );
      this.ForwarderModel = conn.model("Forwarder", ForwarderSchema);
      this.SignalInfoModel = conn.model("Signal_Infos", SignalInfoSchema);
      this.SignalHistoryModel = conn.model(
        "Signal_History",
        SignalHistorySchema
      );
    } catch (error) {
      throw error;
    }

    return conn;
  }
  getSignalConfig() {
    return this.SignalConfigModel;
  }
  getAccountConfigModel() {
    return this.AccountConfigModel;
  }
  getMqttConfigModel() {
    return this.MqttConfigModel;
  }
  getTelegramConfigModel() {
    return this.TelegramConfigModel;
  }
  getSymbolInfoModel() {
    return this.SymbolInfoModel;
  }
  getFuturesSymbolModel() {
    return this.FuturesSymbolModel;
  }
  getAccountStaticModel() {
    return this.AccountStaticModel;
  }
  getFuturesProfitModel() {
    return this.FuturesProfitModel;
  }
  getSpotSymbolModel() {
    return this.SpotSymbolModel;
  }
  getUserAccountModel() {
    return this.UserAccountModel;
  }
  getTelegramClientModel() {
    return this.TelegramClientModel;
  }
}
module.exports = new MongoDb();
