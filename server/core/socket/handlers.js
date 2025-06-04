const Position = require("../../modules/positions/position.services");
const Profit = require("../../modules/profits/profit.services");
const Balance = require("../../modules/balances/balance.services");
const {
  getBotInfo,
  getBalanceAndProfit,
  updateBalanceAndProfit,
} = require("../utils/dashboard");
const delay = require("../utils/delay");
const FuturesClient = require("../clients");
const MongoDb = require("../database/mongodb");

const handleTabChange = async (socket, { tabIndex, tabName }) => {
  console.log(`Client switched to tab: ${tabName} (${tabIndex})`);

  switch (tabIndex) {
    case 0: // Dashboard tab
      socket.emit("bot_info", await getBotInfo(socket.activeUsers));
      await Profit.update();
      socket.emit("bot_info", await getBotInfo(socket.activeUsers));
      break;
    case 1: // Positions tab
      let positions = await Position.getAllPositions();
      socket.emit("positions_update", positions);
      // Cập nhật vị thế mỗi 15 giây cho socket khi có vị thế
      if (positions.length != 0 && !socket.interval) {
        socket.interval = setInterval(async () => {
          let positions = await Position.getAllPositions();
          socket.emit("positions_update", positions);
        }, 1000 * 5);
      }
      break;
    case 2: // Balance & Profit tab
      socket.emit(
        "balance_profit",
        await getBalanceAndProfit(socket.activeUsers)
      );
      await Profit.update();
      socket.emit(
        "balance_profit",
        await getBalanceAndProfit(socket.activeUsers)
      );

      break;
    case 3: // Config tab
      break;
    case 4: // Signal Config tab
      // Không cần xử lý gì vì đã dùng REST API
      break;
  }
};

const handleRefreshPosition = async (socket, data) => {
  if (data) {
    await Position.updateBySymbolAndSide(data.user, data.symbol, data.side);
  } else {
    await Position.update();
  }
  let positions = await Position.getAllPositions();
  socket.emit("positions_update", positions);
};

const handleRefreshDashboard = async (socket) => {
  try {
    await Profit.update();
    await delay(100);
    socket.emit("bot_info", await getBotInfo(socket.activeUsers));
  } catch (error) {
    console.error("Error refreshing dashboard:", error);
    socket.emit("error", "Failed to refresh dashboard");
  }
};

const handleCalculateProfit = async (
  socket,
  { startDate, endDate, selectedUser }
) => {
  try {
    console.log("calculate_profit", { startDate, endDate, selectedUser });
    if (!selectedUser || !socket.activeUsers.includes(selectedUser))
      selectedUser = socket.activeUsers;
    else selectedUser = [selectedUser];
    let calculateBalanceAndProfit = await updateBalanceAndProfit(
      startDate,
      endDate,
      selectedUser
    );
    socket.emit("balance_profit", calculateBalanceAndProfit);
  } catch (error) {
    console.error("Error calculating profit:", error);
    socket.emit("error", "Failed to calculate profit");
  }
};

const handleClosePosition = async (
  socket,
  { accountName, symbol, side, percent }
) => {
  try {
    const futuresClient = FuturesClient.getFuturesClient(accountName);
    const result = await futuresClient.futuresMarketClosePosition(
      symbol,
      side,
      percent
    );
    socket.emit("close_position_result", result);
  } catch (error) {
    socket.emit("error", error.message);
  }
};

const handleCancelOrders = async (socket, { accountName, symbol }) => {
  try {
    const futuresClient = FuturesClient.getFuturesClient(accountName);
    const result = await futuresClient.futuresCancelAllOrdersOfSymbol(symbol);
    socket.emit("cancel_orders_result", result);
  } catch (error) {
    socket.emit("error", error.message);
  }
};

const handleDisconnect = (socket) => {
  console.log("Client disconnected");
  if (socket.interval) {
    clearInterval(socket.interval);
  }

  // Xóa socket khỏi Map
  //   for (let [account, sock] of accountSockets.entries()) {
  //     if (sock === socket) {
  //       accountSockets.delete(account);
  //       break;
  //     }
  //   }
};

const handleSearchHistory = async (socket, params) => {
  try {
    const query = {
      env: params.selectedUser
        ? params.selectedUser
        : { $in: socket.activeUsers },
      openTime: {
        $gt: new Date(params.startDate),
        ...(params.endDate && { $lt: new Date(params.endDate) }),
      },
      ...(params.isPaper && { isPaper: true }),
      // ...(params.type && { typeSignal: { $in: params.type.split(",") } }),
      ...(params.signal && {
        typeSignal: { $in: params.signal.split(",") },
      }),
      ...(params.symbol && { symbol: params.symbol }),
      ...(params.side && { side: params.side }),
      ...(params.status && { status: params.status }),
      ...(params.isCopy && { isCopy: true }),
      ...(params.isClosed && { isClosed: true }),
      ...(params.isOpen && { isClosed: false }),
    };

    const results = await MongoDb.getAccountStaticModel()
      .find(query)
      .sort({ openTime: -1 })
      .lean();

    socket.emit("history_results", results);
  } catch (error) {
    console.error("Error searching history:", error);
    socket.emit("error", "Error searching history");
  }
};

module.exports = {
  handleTabChange,
  handleRefreshPosition,
  handleRefreshDashboard,
  handleCalculateProfit,
  handleClosePosition,
  handleCancelOrders,
  handleDisconnect,
  handleSearchHistory,
};
