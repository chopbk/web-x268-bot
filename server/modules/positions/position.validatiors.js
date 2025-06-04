const positionSchemas = {
  getPosition: {
    params: {
      symbol: {
        required: true,
        type: "string",
      },
    },
    query: {
      user: {
        required: true,
        type: "string",
      },
      side: {
        required: true,
        type: "string",
        enum: ["LONG", "SHORT"],
      },
    },
  },
  closePosition: {
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
        enum: ["LONG", "SHORT"],
      },
      percent: {
        required: true,
        type: "number",
        min: 0,
        max: 100,
      },
    },
  },
  closeAllPositions: {
    body: {
      user: {
        required: false,
        type: "string",
      },
    },
  },
};

module.exports = {
  positionSchemas,
};
