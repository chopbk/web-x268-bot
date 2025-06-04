const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const MqttSchema = new Schema(
    {
        env: {
            type: String,
            index: true,
            unique: true,
        },
        runs: String,
        tele_env: String,
        tele_client_env: String,
        mqtt_env: String,
        uid_env: String,
        publish_signal: {
            type: Boolean,
            default: false,
        },
        is_server: {
            type: Boolean,
            default: false,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = MqttSchema;
