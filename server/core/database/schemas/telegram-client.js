const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const TelegramClientSchema = new Schema(
  {
    env: {
      type: String,
      index: true,
      unique: true,
    },
    channels: [
      {
        id: String,
        name: String,
        ocr: {
          type: Boolean,
          default: false,
        },
        fwd: [String],
        keepNameOnFwd: Boolean,
      },
    ],
    stringSession: String,
    apiId: Number,
    apiHash: String,
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
module.exports = TelegramClientSchema;
