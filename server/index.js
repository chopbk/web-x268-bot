const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const FuturesPrice = require("./modules/prices/price.storages");
const SymbolInfos = require("./modules/symbols/symbol.storages");
const FuturesClient = require("./core/clients");
const PositionServices = require("./modules/positions/position.services");
const ProfitServices = require("./modules/profits/profit.services");
const BalanceServices = require("./modules/balances/balance.services");
const UserdataStream = require("./modules/user-data/user-data.stream");
const initSocket = require("./core/socket");

const positionRoutes = require("./modules/positions/position.routes");
const orderRoutes = require("./modules/orders/order.routes");
const activeUsersMiddleware = require("./core/middlewares/active-users.middleware");
const loggerMiddleware = require("./core/middlewares/logger.middleware");
const logger = require("./core/utils/logger");
// Lưu trữ users từ socket
let activeUsers = process.env.USERS.toUpperCase().split(",") || ["V"];

// Hàm khởi tạo server
const startServer = async () => {
  try {
    let nodeEnv = process.env.NODE_ENV.toUpperCase();
    if (!nodeEnv) throw new Error("specific NODE_ENV");

    // Khởi tạo MongoDB trước
    logger.info("Initializing MongoDB...");
    await require("./core/database/mongodb").init();
    logger.info("MongoDB initialized successfully");

    // Khởi tạo các services khác
    logger.info("Initializing other services...");
    await FuturesClient.init(activeUsers);
    await SymbolInfos.init();
    await FuturesPrice.init();

    await PositionServices.init(activeUsers);
    await ProfitServices.init(activeUsers);
    await BalanceServices.init(activeUsers);
    await UserdataStream.init(activeUsers);

    logger.info("Other services initialized successfully");

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

    // Middleware để parse JSON
    app.use(express.json());

    // Middleware để log request
    app.use(loggerMiddleware);

    // Middleware để thêm users vào req
    app.use(activeUsersMiddleware);

    app.use("/api/users", require("./modules/users/user.routes"));
    // Use routes
    app.use("/api/signal", require("./modules/signals/signal.routes"));

    // Thêm route history
    app.use("/api/history", require("./modules/histories/history.routes"));

    // Routes
    app.use("/api/position", positionRoutes);
    app.use("/api/order", orderRoutes);

    // Khởi tạo HTTP server
    const server = http.createServer(app);

    // Khởi tạo Socket.IO
    initSocket(server, activeUsers);

    // Khởi động server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Khởi động server
startServer();
