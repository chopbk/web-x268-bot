const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const AccountStaticSchema = new Schema(
    {
        env: String,
        typeSignal: String,
        symbol: String,
        side: String,
        entryPrice: Number,
        closePrice: Number,
        futuresLeverage: Number,
        costAmount: Number,
        positionAmt: Number,
        volume: Number,
        openTime: Date,
        closeTime: Date,
        status: String,
        roe: Number,
        profit: Number,
        tps: [Number],
        isCopy: Boolean,
        isLimit: Boolean,
        isClosed: {
            type: Boolean,
            default: false,
        },
        isPaper: {
            type: Boolean,
            default: false,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = AccountStaticSchema;
