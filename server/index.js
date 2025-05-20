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
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Lưu trữ các kết nối websocket theo account
const accountSockets = new Map();

// Hàm lấy thông tin vị thế

(async () => {
  let nodeEnv = process.env.NODE_ENV.toUpperCase();
  if (!nodeEnv) throw new Error("specific NODE_ENV");
  let users = ["B1", "B2", "B3", "B4", "B5", "B6"];
  await require("./services/database/mongodb").init();

  await SymbolInfos.init();
  await FuturesPrice.init();

  // init AccountConfig for traders and listeners
  await FuturesClient.init(users);
  await Position.init(users);
  io.on("connection", async (socket) => {
    console.log("Client connected");

    let positions = await Position.getAllPositions();
    socket.emit("positions_update", positions);
    const interval = setInterval(async () => {
      let positions = await Position.getAllPositions();
      socket.emit("positions_update", positions);
    }, 1000); // Cập nhật mỗi 5 giây
    // Lắng nghe sự kiện đăng ký theo dõi account
    socket.on("subscribe_account", async (accountName) => {
      console.log(`Client subscribed to account: ${accountName}`);
      accountSockets.set(accountName, socket);
      let positions = await Position.getAllPositions();
      socket.emit("positions_update", positions);
      const interval = setInterval(async () => {
        let positions = await Position.getAllPositions();
        socket.emit("positions_update", positions);
      }, 1000); // Cập nhật mỗi 5 giây
      // Gửi thông tin vị thế ban đầu

      // Bắt đầu theo dõi giá và cập nhật định kỳ

      // Lưu interval để clear khi disconnect
      socket.interval = interval;
    });
    socket.on("get_balance_profit", async (accountName) => {
      let balance = await FuturesClient.getBalance(accountName);
      let profit = await FuturesClient.getProfit(accountName);
      socket.emit("balance_profit", { balance, profit });
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
