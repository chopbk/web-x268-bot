const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const SignalInfo = new Schema(
    {
        signal: String,
        status: {
            type: String,
            enum: ["OPEN", "CLOSE"],
            default: "CLOSE",
        },
        side: {
            type: String,
            enum: ["LONG", "SHORT"],
        },
        symbol: String,
        type: {
            type: String,
            enum: ["SWING", "SCALP"],
            default: "SCALP",
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
SignalInfo.index({ signal: 1, side: 1, symbol: 1 }, { unique: true });
module.exports = SignalInfo;
