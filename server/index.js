const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const delay = require("./services/utils/delay");
const FuturesPrice = require("./services/storages/prices");
const SymbolInfos = require("./services/storages/symbol-info");
const FuturesClient = require("./services/storages/client");
const Position = require("./services/storages/position");
const Profit = require("./services/storages/profit");
const Balance = require("./services/storages/balance");

const app = express();
app.use(
  cors({
    origin: "*", // Cho phép tất cả các domain
    methods: ["GET", "POST"],
    credentials: true,
  })
);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Cho phép tất cả các domain
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true, // Cho phép Engine.IO version 3
  transports: ["websocket", "polling"], // Cho phép cả websocket và polling
});

// Lưu trữ các kết nối websocket theo account
const accountSockets = new Map();

let users = process.env.USERS.toUpperCase().split(",") || ["V"];
// Hàm lấy thông tin vị thế
const getBotInfo = async (users) => {
  const positions = await Position.getAllPositions();
  let todayProfits = await Profit.getTodayProfit();
  let yesterdayProfits = await Profit.getYesterdayProfit();
  let balances = await Balance.getAllBalance();

  let todayProfit = Object.keys(todayProfits).reduce(
    (sum, user) => sum + todayProfits[user].profit,
    0
  );
  let yesterdayProfit = Object.keys(yesterdayProfits).reduce(
    (sum, user) => sum + yesterdayProfits[user].profit,
    0
  );
  let totalBalance = Object.keys(balances).reduce(
    (sum, user) => sum + balances[user].availableBalance,
    0
  );
  let unrealizedProfit = Object.keys(balances).reduce(
    (sum, user) => sum + balances[user].unrealizedProfit,
    0
  );
  return {
    version: "1.0.0",
    status: "Running",
    users: users.join(", "),
    lastUpdate: new Date().toLocaleString(),
    totalPositions: positions.length,
    totalUser: users.length,
    totalProfit: todayProfit,
    totalProfitYesterday: yesterdayProfit,
    totalBalance: totalBalance,
    unrealizedProfit: unrealizedProfit,
  };
};
const getBalanceAndProfit = async (users) => {
  let result = [];
  let profits = await Profit.getTodayProfit();
  let balances = await Balance.getAllBalance();
  for (let user of users) {
    result.push({
      account: user,
      ...balances[user],
      ...profits[user],
    });
  }
  return result;
};
const updateBalanceAndProfit = async (startDate, endDate, users) => {
  if (!startDate) startDate = new Date().toLocaleDateString();
  if (!endDate) endDate = new Date().toLocaleDateString();
  let result = [];
  let profits = await Profit.updateProfit(users, startDate, endDate);
  let balances = await Balance.updateBalance(users);
  for (let user of users) {
    result.push({
      account: user,
      ...balances[user],
      ...profits[user],
    });
  }
  return result;
};
(async () => {
  let nodeEnv = process.env.NODE_ENV.toUpperCase();
  if (!nodeEnv) throw new Error("specific NODE_ENV");

  await require("./services/database/mongodb").init();

  await SymbolInfos.init();
  await FuturesPrice.init();

  // init AccountConfig for traders and listeners
  await FuturesClient.init(users);
  await Position.init(users);
  await Profit.init(users);
  await Balance.init(users);
  let balanceAndProfits = await getBalanceAndProfit(users);
  let botInfo = await getBotInfo(users);

  console.log(`init done for ${users}`);
  io.on("connection", async (socket) => {
    console.log("Client connected");
    socket.activeUsers = users;
    // Gửi danh sách users khi client kết nối
    socket.emit("users_list", users);

    // socket.emit("balance_profit", balanceAndProfits);
    socket.emit("active_users", socket.activeUsers);
    socket.emit("bot_info", botInfo);

    // Xử lý sự kiện click tab
    socket.on("tab_changed", async ({ tabIndex, tabName }) => {
      console.log(`Client switched to tab: ${tabName} (${tabIndex})`);

      // Xử lý dữ liệu tương ứng với từng tab
      switch (tabIndex) {
        case 0: // Dashboard tab
          socket.emit("bot_info", await getBotInfo(socket.activeUsers));
          break;
        case 1: // Positions tab
          let positions = await Position.getAllPositions();
          socket.emit("positions_update", positions);
          // Cập nhật vị thế mỗi 10 giây cho socket khi có vị thế
          if (positions.length != 0 && !socket.interval) {
            socket.interval = setInterval(async () => {
              let positions = await Position.getAllPositions();
              socket.emit("positions_update", positions);
            }, 1000 * 15);
          }

          break;
        case 2: // Balance & Profit tab
          balanceAndProfits = await getBalanceAndProfit(socket.activeUsers);
          socket.emit("balance_profit", balanceAndProfits);
          break;
        case 3: // Config tab
          // const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          // socket.emit("config_data", config);
          break;
      }
    });

    // Xử lý sự kiện set active users
    socket.on("set_active_users", (users) => {
      socket.activeUsers = users;
    });

    socket.on("refreshPosition", async () => {
      await Position.update();
      let positions = await Position.getAllPositions();
      socket.emit("positions_update", positions);
    });
    socket.on("refreshDashboard", async () => {
      try {
        // await Position.update();
        // await delay(100);
        await Profit.update();
        await delay(1000);
        await Balance.update();
        socket.emit("bot_info", await getBotInfo(socket.activeUsers));
      } catch (error) {
        console.error("Error refreshing dashboard:", error);
        socket.emit("error", "Failed to refresh dashboard");
      }
    });

    socket.on(
      "calculate_profit",
      async ({ startDate, endDate, selectedUser }) => {
        try {
          console.log("calculate_profit", { startDate, endDate, selectedUser });
          if (!selectedUser || !users.includes(selectedUser))
            selectedUser = users;
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
      }
    );
    // Xử lý đóng vị thế
    socket.on(
      "close_position",
      async ({ accountName, symbol, side, percent }) => {
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
      }
    );

    // Xử lý hủy order
    socket.on("cancel_orders", async ({ accountName, symbol }) => {
      try {
        const futuresClient = getFuturesClient(accountName);
        const result = await futuresClient.futuresCancelAllOrdersOfSymbol(
          symbol
        );
        socket.emit("cancel_orders_result", result);
      } catch (error) {
        socket.emit("error", error.message);
      }
    });

    // Xử lý ngắt kết nối
    socket.on("disconnect", () => {
      console.log("Client disconnected");
      if (socket.interval) {
        clearInterval(socket.interval);
      }

      // Xóa socket khỏi Map
      for (let [account, sock] of accountSockets.entries()) {
        if (sock === socket) {
          accountSockets.delete(account);
          break;
        }
      }
    });
  });
})();
// Xử lý kết nối websocket

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
