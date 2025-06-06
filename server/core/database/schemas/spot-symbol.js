const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const SymbolInfosSchema = new Schema(
    {
        symbol: String,
        tickSize: Number,
        stepSize: Number,
        exchange: String,
        maxMarketQty: Number,
        minQty: Number,
    },
    { strict: "false", versionKey: false, timestamps: true }
);
module.exports = SymbolInfosSchema;
