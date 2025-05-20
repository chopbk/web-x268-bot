const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const ConfigSchema = new Schema(
    {
        username: {
            type: String,
            index: true,
            unique: true,
        },
        exchange: String,
        api_key: String,
        api_secret: String,
        hedge_mode: {
            type: Boolean,
            default: true,
        },
        test: {
            type: Boolean,
            default: false,
        },
        options: {},
        password: String,
        sub_account: String,
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = ConfigSchema;
