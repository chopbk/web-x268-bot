const Position = require("../services/storages/position");
const Profit = require("../services/storages/profit");
const Balance = require("../services/storages/balance");
const {
  getBotInfo,
  getBalanceAndProfit,
  updateBalanceAndProfit,
} = require("../controllers/botController");
const delay = require("../services/utils/delay");

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

const handleRefreshPosition = async (socket) => {
  await Position.update();
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
    const handleSignalClient = getHandleSignalClient(accountName);
    const signalInfo = {
      symbol,
      side,
      per: percent || 100,
    };

    const result = await handleSignalClient.closePosition(signalInfo);
    socket.emit("close_position_result", result);
  } catch (error) {
    socket.emit("error", error.message);
  }
};

const handleCancelOrders = async (socket, { accountName, symbol }) => {
  try {
    const futuresClient = getFuturesClient(accountName);
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

module.exports = {
  handleTabChange,
  handleRefreshPosition,
  handleRefreshDashboard,
  handleCalculateProfit,
  handleClosePosition,
  handleCancelOrders,
  handleDisconnect,
};
