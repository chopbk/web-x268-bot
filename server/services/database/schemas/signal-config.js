const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const SignalConfig = new Schema(
    {
        env: {
            type: String,
            index: true,
            unique: true,
        },
        excluded: {
            type: [String],
            default: ["BTCUSDT", "ETHUSDT"],
        },
        whitelist: {
            type: [String],
            default: [],
        },
        type_signal: [String],
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = SignalConfig;
