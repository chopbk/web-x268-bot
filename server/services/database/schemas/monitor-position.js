const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const MonitorPositionSchema = new Schema(
    {
        symbol: String,
        side: String,
        prices: {},
        orders: {},
        symbolInfo: {},
        startTime: Date,
        profits: {},
        futuresLeverage: Number,
        type: String,
        isLimit: Boolean,
        position: {},
        lang: String,
        positionAmt: Number,
        config: {},
        env: String,
        closed: {
            type: Boolean,
            default: false,
        },
        futuresClientName: String,
        isCopy: {
            type: Boolean,
            default: false,
        },
        report: {
            // messageId: id của message chính report đã gửi
            // monitorMessageId: id của message monitor report đã gửi đến
            // monitorChatId: chatId của monitor
            // monitorMessageId: id của message monitor report đã gửi đến, chúng ta có thể edit message này
        },
    },
    { strict: "false", versionKey: false, timestamps: true }
);
module.exports = MonitorPositionSchema;
