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
      type: {
        required: true,
        type: "string",
        enum: ["LIMIT", "MARKET"],
      },
      quantity: {
        required: true,
        type: "number",
        min: 0,
      },
      price: {
        required: function (body) {
          return body.type === "LIMIT";
        },
        type: "number",
        min: 0,
      },
      positionSide: {
        required: true,
        type: "string",
        enum: ["LONG", "SHORT"],
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
      user: {
        required: true,
        type: "string",
      },
      symbol: {
        required: false,
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
