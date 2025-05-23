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
const UserdataStream = require("./services/storages/userdata-stream");
const {
  getBotInfo,
  getBalanceAndProfit,
  updateBalanceAndProfit,
} = require("./controllers/botController");

// Import routes
const signalConfigRoutes = require("./routes/signalConfig");

// Import socket handlers
const {
  handleTabChange,
  handleRefreshPosition,
  handleRefreshDashboard,
  handleCalculateProfit,
  handleClosePosition,
  handleCancelOrders,
  handleDisconnect,
} = require("./socket/handlers");

// Lưu trữ users từ socket
let activeUsers = process.env.USERS.toUpperCase().split(",") || ["V"];

// Hàm lấy thông tin vị thế

// Hàm khởi tạo server
const startServer = async () => {
  try {
    let nodeEnv = process.env.NODE_ENV.toUpperCase();
    if (!nodeEnv) throw new Error("specific NODE_ENV");

    // Khởi tạo MongoDB trước
    console.log("Initializing MongoDB...");
    await require("./services/database/mongodb").init();
    console.log("MongoDB initialized successfully");

    // Khởi tạo các services khác
    console.log("Initializing other services...");
    await FuturesClient.init(activeUsers);
    await SymbolInfos.init();
    await FuturesPrice.init();

    await Position.init(activeUsers);
    await Profit.init(activeUsers);
    await Balance.init(activeUsers);
    await UserdataStream.init(activeUsers);

    console.log("Other services initialized successfully");

    // Khởi tạo Express app
    const app = express();

    // Cấu hình CORS
    let url = process.env.URL;
    let origin = ["http://localhost:3000", "http://127.0.0.1:3000"];
    if (url) origin.push(`${url}`);
    app.use(
      cors({
        origin,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      })
    );

    // Middleware để parse JSONenv
    app.use(express.json());

    // Middleware để thêm users vào req
    app.use((req, res, next) => {
      req.activeUsers = activeUsers;
      next();
    });

    // Use routes
    app.use("/api/signal-configs", signalConfigRoutes);

    // Khởi tạo HTTP server
    const server = http.createServer(app);

    // Khởi tạo Socket.IO
    const io = socketIo(server, {
      cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      allowEIO3: true,
      transports: ["websocket", "polling"],
    });
    // Gán io vào global để có thể sử dụng ở các file khác
    global.io = io;
    // Lấy thông tin bot

    console.log(`Bot info initialized for ${activeUsers}`);

    // Socket.IO event handlers
    io.on("connection", async (socket) => {
      console.log("Client connected");
      socket.activeUsers = activeUsers;

      // Gửi danh sách users khi client kết nối
      socket.emit("users_list", activeUsers);
      socket.emit("active_users", socket.activeUsers);
      socket.emit("bot_info", await getBotInfo(activeUsers));

      // Socket event handlers
      socket.on("tab_changed", (data) => handleTabChange(socket, data));
      socket.on("set_active_users", (users) => {
        socket.activeUsers = users;
        activeUsers = users; // Cập nhật activeUsers khi có thay đổi
      });
      socket.on("refreshPosition", () => handleRefreshPosition(socket));
      socket.on("refreshDashboard", () => handleRefreshDashboard(socket));
      socket.on("calculate_profit", (data) =>
        handleCalculateProfit(socket, data)
      );
      socket.on("close_position", (data) => handleClosePosition(socket, data));
      socket.on("cancel_orders", (data) => handleCancelOrders(socket, data));
      socket.on("disconnect", () => handleDisconnect(socket));
    });

    // Khởi động server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Khởi động server
startServer();
