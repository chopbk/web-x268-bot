const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const SymbolInfosSchema = new Schema(
    {
        symbol: {
            type: String,
            index: true,
            unique: true,
        },
        filters: Array,
    },
    { strict: "false", versionKey: false, timestamps: true }
);
module.exports = SymbolInfosSchema;
