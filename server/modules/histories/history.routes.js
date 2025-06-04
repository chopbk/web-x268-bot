const express = require("express");
const router = express.Router();
const HistoryService = require("./history.services");

router.post("/", async (req, res) => {
  try {
    const params = req.body;
    const query = {
      openTime: {
        $gt: new Date(params.start || new Date().toISOString().split("T")[0]),
        ...(params.end && { $lt: new Date(params.end) }),
      },
      ...(params.paper && { isPaper: true }),
      ...(params.type && { typeSignal: params.type }),
      ...(params.symbol && { symbol: params.symbol }),
      ...(params.side && { side: params.side }),

      ...(params.status && { status: params.status }),
      ...(params.copy && { isCopy: true }),
      ...(params.close && { isClosed: true }),
      ...(params.open && { isClosed: false }),
    };
    // env: params.user ? params.user : { $in: req.activeUsers },
    const activeUsers = params.user || req.activeUsers;

    const results = await HistoryService.findByUsers(activeUsers, query);

    res.json(results);
  } catch (error) {
    console.error("Error searching history:", error);
    res.status(500).json({ error: "Error searching history" });
  }
});
// POST /api/history/search - Tìm kiếm lịch sử
router.post("/search", async (req, res) => {
  try {
    const params = req.body;
    // env: params.user ? params.user : { $in: req.activeUsers },
    const activeUsers = !!params.user
      ? params.user.split(",")
      : req.activeUsers;

    const query = {
      openTime: {
        $gt: new Date(params.start),
        ...(params.end && { $lt: new Date(params.end) }),
      },

      ...(params.signal && {
        typeSignal: { $in: params.signal.split(",") },
      }),
      ...(params.symbol && { symbol: params.symbol }),
      ...(params.side && { side: params.side }),
      ...(params.status && { status: params.status }),
    };
    let results = [];
    if (params.isClosed) {
      if (params.account) {
        results = await HistoryService.findByAccount(params.account, query);
      } else {
        results = await HistoryService.findByUsers(activeUsers, query);
      }
    } else {
      // tìm kiếm ở monitor
    }

    res.json(results);
  } catch (error) {
    console.error("Error searching history:", error);
    res.status(500).json({ error: "Error searching history" });
  }
});

module.exports = router;
