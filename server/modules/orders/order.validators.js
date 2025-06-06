const orderSchemas = {
  createOrder: {
    body: {
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: true,
        type: "string",
      },
      side: {
        required: true,
        type: "string",
        enum: ["BUY", "SELL"],
      },
      positionSide: {
        required: true,
        type: "string",
        enum: ["LONG", "SHORT"],
      },
      type: {
        required: true,
        type: "string",
        enum: [
          "LIMIT",
          "STOP_MARKET",
          "STOP",
          "MARKET",
          "TAKE_PROFIT_MARKET",
          "TAKE_PROFIT",
        ],
      },
      orderType: {
        required: true,
        type: "string",
        enum: ["OPEN", "CLOSE"],
      },
      /** quantity: không yêu cầu khi   */
      quantity: {
        required: function (body) {
          return (
            body.type !== "TAKE_PROFIT_MARKET" && body.type !== "STOP_MARKET"
          );
        },
        type: "number",
        min: 0,
      },
      price: {
        required: function (body) {
          return (
            body.type !== "MARKET" &&
            body.type !== "STOP_MARKET" &&
            body.type !== "TAKE_PROFIT_MARKET"
          );
        },
        type: "number",
        min: 0,
        validate: function (value, body) {
          if (
            body.type === "MARKET" ||
            body.type === "STOP_MARKET" ||
            body.type === "TAKE_PROFIT_MARKET"
          ) {
            return value === 0;
          }
          return true;
        },
      },
      stopPrice: {
        required: function (body) {
          return (
            body.type === "STOP_MARKET" ||
            body.type === "STOP" ||
            body.type === "TAKE_PROFIT" ||
            body.type === "TAKE_PROFIT_MARKET"
          );
        },
        type: "number",
        min: 0,
        validate: function (value, body) {
          if (body.type === "LIMIT" || body.type === "MARKET") {
            return value === "";
          }
          return true;
        },
      },
    },
  },
  cancelOrder: {
    params: {
      id: {
        required: true,
        type: "string",
      },
    },
    query: {
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: true,
        type: "string",
      },
    },
  },
  cancelAllOrders: {
    body: {
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: false,
        type: "string",
      },
      orderIds: {
        required: false,
        type: "object",
        items: {
          type: "number",
        },
      },
    },
  },
  getOrder: {
    query: {
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: true,
        type: "string",
      },
      orderId: {
        required: true,
        type: "string",
      },
    },
  },
  getAllOrders: {
    query: {
      user: {
        required: false,
        type: "string",
      },
      symbol: {
        required: false,
        type: "string",
      },
      side: {
        required: false,
        type: "string",
        enum: ["LONG", "SHORT"],
      },
    },
  },

  getOpenOrders: {
    query: {
      symbol: {
        required: false,
        type: "string",
      },
      side: {
        required: false,
        type: "string",
      },
      user: {
        required: true,
        type: "string",
      },
    },
  },
  getOrderHistory: {
    query: {
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: false,
        type: "string",
      },
      side: {
        required: false,
        type: "string",
        enum: ["LONG", "SHORT"],
      },
    },
  },
};

module.exports = {
  orderSchemas,
};
