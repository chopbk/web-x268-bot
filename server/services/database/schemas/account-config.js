const mongoose = require("mongoose");

const Schema = mongoose.Schema;
//Create Schema
const ConfigSchema = new Schema(
    {
        env: {
            type: String,
            index: true,
            unique: true,
        },
        blacklist: {
            type: [String],
            default: ["BTCUSDT", "ETHUSDT"],
        },
        whitelist: {
            type: [String],
            default: [],
        },
        signals: {
            type: [String],
            default: [],
        },
        trade_config: {
            FIX_COST_AMOUNT: {
                type: Number,
                default: 100,
            },
            FIX_LEVERAGE: {
                type: Number,
                default: 20,
            },
            LONG_LEVERAGE: {
                type: Number,
                default: 20,
            },
            SHORT_LEVERAGE: {
                type: Number,
                default: 20,
            },

            HP: {
                type: Object,
                default: {
                    ON: false,
                    HP_PERCENT_TRIGGER: 0.45,
                    RHSL_PERCENT: 0.1,
                    RH_PERCENT: 0.1,
                },
            },

            SL: {
                TYPE: {
                    type: String,
                    default: "MARKET",
                },
                SL_CANDLE: {
                    type: String,
                    default: "5m",
                },
                SL_PERCENT: {
                    type: Number,
                    default: -0.3,
                },
                SL2_PERCENT: {
                    type: Number,
                    default: -0.4,
                },
                SLI_PERCENT: {
                    type: Number,
                    default: -0.3,
                },
                SL_TIME: {
                    type: Number,
                    default: 1.5,
                },
                POSITION: {
                    type: Boolean,
                    default: false,
                },
                MAX_LOSS: {
                    type: Number,
                    default: -500,
                },
            },
            OPEN: {
                TYPE: {
                    type: String,
                    enum: ["MARKET", "LIMIT", "STOPMARKET", "STOPLIMIT", "FOLLOWSIGNAL"],
                    default: "MARKET",
                },
                LIMIT: {
                    type: Boolean,
                    default: false,
                },
                MARKET: {
                    type: Boolean,
                    default: true,
                },
                SPREAD: {
                    type: Number,
                    default: 0.05,
                },
                WAIT: {
                    type: Number,
                    default: 30,
                },
                RISK: {
                    type: Number,
                    default: 4,
                },
                MARK: {
                    type: Number,
                    default: 10,
                },
                MAX_POSITION: {
                    type: Number,
                    default: 20,
                },
            },
            MARGIN: {
                type: Object,
                default: {
                    MODE: "FIX",
                    RATIO: 1,
                },
            },
            COPY: {
                type: Object,
                default: {
                    ON: false,
                    MAX_VOLUME: 20000,
                    RATE: 0.1,
                    FIX: false,
                    DCA: true,
                    FOLLOW: true,
                },
            },
            TP: {
                type: Object,
                default: {
                    TYPE: "FIX",
                    PERCENT: [0.1, 0.2],
                    TIME: 0,
                    CLOSE: 1,
                },
            },
            INTERVAL: {
                type: Number,
                default: 60,
            },

            WL: {
                type: Boolean,
                default: true,
            },
            TRAILING: {
                type: Object,
                default: {
                    ON: true,
                    SP_PERCENT: 0.01,
                    TRIGGER_PERCENT: 0.5,
                    R_PERCENT: 0.5,
                    TYPE: "FIX",
                },
            },

            ON: {
                type: Boolean,
                default: true,
            },
            LONG: {
                type: Boolean,
                default: true,
            },
            SHORT: {
                type: Boolean,
                default: false,
            },
            INVERT: {
                type: Boolean,
                default: false,
            },
            TP_PERCENT: {
                type: Array,
                default: [0.3, 1],
            },
            TP_TIME: {
                type: Number,
                default: 1.5,
            },
            PAPER: {
                type: Boolean,
                default: false,
            },
            MONITOR: {
                type: Boolean,
                default: true,
            },
            REPORT_PROFIT: {
                type: Boolean,
                default: true,
            },
            AUTO_CONFIG: {
                type: Boolean,
                default: false,
            },
            // SL_PERCENT: {
            //     type: Number,d
            //     default: -0.3,
            // },

            // end will delete when done
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
module.exports = ConfigSchema;
