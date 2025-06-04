const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const ForwarderSchema = new Schema(
    {
        channelId: String,
        channelName: String,
        fwdChatId: String,
        fwdMessage: {},
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = ForwarderSchema;
