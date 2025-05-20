const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const FuturesProfitSchema = new Schema(
    {
        env: {
            type: String,
        },
        day: {
            type: Date,
        },
        profit: Number,
        status: String,
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = FuturesProfitSchema;
