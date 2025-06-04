const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const LeaderboardUidSchema = new Schema(
    {
        env: {
            type: String,
            index: true,
            unique: true,
        },
        interval: Number,
        uids: {
            type: [String],
        },
        binance: {
            type: Object,
            default: {
                ids: [],
                interval: 3,
                errorInterval: 120,
            },
        },
        bybit: {
            type: Object,
            default: {
                ids: [],
                interval: 3,
                errorInterval: 120,
                cookie: "",
                token: "",
            },
        },
        okex: {
            type: Object,
            default: {
                ids: [],
                interval: 10,
                errorInterval: 120,
            },
        },
        copy: {
            type: Object,
            default: {
                ids: [],
                interval: 3,
                errorInterval: 120,
            },
        },
        errorInterval: Number,
    },
    { strict: "false", versionKey: false, timestamps: true }
);
module.exports = LeaderboardUidSchema;
