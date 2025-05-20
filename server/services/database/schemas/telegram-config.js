const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const TelegramCfgSchema = new Schema(
    {
        env: {
            type: String,
            index: true,
            unique: true,
        },
        token: String,
        id_test: [String],
        id_report: [String],
        id_command: [String],
        id_monitor: [String],
        id_leaderboard: [String],
        id_error: [String],
        id_delay: [String],
        id_log: [String],
        listen: Boolean,
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = TelegramCfgSchema;
