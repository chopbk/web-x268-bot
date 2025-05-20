const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const UserAccountSchema = new Schema(
  {
    username: {
      type: String,
      index: true,
      unique: true,
    },
    accounts: [{ type: String, field: "env", ref: "Account_Config" }],
    startTime: Date,
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
module.exports = UserAccountSchema;
