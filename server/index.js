const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const Calculate = require("./services/utils/calculate");
const FuturesPrice = require("./services/storages/prices");
const SymbolInfos = require("./services/storages/symbol-info");
const FuturesClient = require("./services/storages/client");
const Position = require("./services/storages/position");
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

// Hàm lấy thông tin vị thế

(async () => {
  let nodeEnv = process.env.NODE_ENV.toUpperCase();
  if (!nodeEnv) throw new Error("specific NODE_ENV");
  let users = ["B1", "B4"];
  await require("./services/database/mongodb").init();

  await SymbolInfos.init();
  await FuturesPrice.init();

  // init AccountConfig for traders and listeners
  await FuturesClient.init(users);
  // await Position.init(users);
  const getBalanceAndProfit = async (startDate, endDate) => {
    if (!startDate) startDate = new Date().toLocaleDateString();
    if (!endDate) endDate = new Date().toLocaleDateString();
    let BalanceAndProfits = [];
    for (let user of users) {
      let balances = await FuturesClient.getBalance(user);
      let profit = await FuturesClient.getProfit(user, startDate, endDate);
      BalanceAndProfits.push({
        account: user,
        balance: balances,
        ...profit,
      });
    }
    return BalanceAndProfits;
  };
  // let BalanceAndProfits = await getBalanceAndProfit();
  io.on("connection", async (socket) => {
    console.log("Client connected");

    // let positions = await Position.getAllPositions();
    // socket.emit("positions_update", positions);
    // const interval = setInterval(async () => {
    //   let positions = await Position.getAllPositions();
    //   socket.emit("positions_update", positions);
    // }, 20000); // Cập nhật mỗi 5 giây
    // Lắng nghe sự kiện đăng ký theo dõi account
    // socket.interval = interval;

    let BalanceAndProfits = await getBalanceAndProfit();
    socket.emit("balance_profit", BalanceAndProfits);

    socket.on("calculate_profit", async ({ startDate, endDate }) => {
      try {
        console.log("calculate_profit", { startDate, endDate });

        let BalanceAndProfits = await getBalanceAndProfit(startDate, endDate);
        socket.emit("balance_profit", BalanceAndProfits);
      } catch (error) {
        console.error("Error calculating profit:", error);
        socket.emit("error", "Failed to calculate profit");
      }
    });
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
