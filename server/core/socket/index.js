const socketIo = require("socket.io");
const Position = require("../../modules/positions/position.services");
const { getBotInfo, getBalanceAndProfit } = require("../utils/dashboard");

const {
  handleTabChange,
  handleRefreshPosition,
  handleRefreshDashboard,
  handleCalculateProfit,
  handleClosePosition,
  handleCancelOrders,
  handleDisconnect,
  handleSearchHistory,
} = require("./handlers");

const initSocket = (server, activeUsers) => {
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

  console.log(`Bot info initialized for ${activeUsers}`);

  // Socket.IO event handlers
  io.on("connection", async (socket) => {
    console.log("Client connected");
    socket.activeUsers = activeUsers;

    // Gửi danh sách users khi client kết nối
    socket.emit("users_list", activeUsers);
    socket.emit("active_users", socket.activeUsers);
    socket.emit("bot_info", await getBotInfo(activeUsers));
    let positions = await Position.getAllPositions();
    socket.emit("positions_update", positions);
    if (positions.length != 0 && !socket.interval) {
      socket.interval = setInterval(async () => {
        positions = await Position.getAllPositions();
        socket.emit("positions_update", positions);
      }, 1000 * 5);
    }
    socket.emit(
      "balance_profit",
      await getBalanceAndProfit(socket.activeUsers)
    );

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
    socket.on("search_history", (params) =>
      handleSearchHistory(socket, params)
    );
    socket.on("disconnect", () => handleDisconnect(socket));
  });

  return io;
};

module.exports = initSocket;
