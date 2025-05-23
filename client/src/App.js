import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import DashboardTab from "./tabs/DashboardTab";
import PositionsTab from "./tabs/PositionsTab";
import BalanceProfitTab from "./tabs/BalanceProfitTab";
import ConfigTab from "./tabs/ConfigTab";
import SignalConfigTab from "./tabs/SignalConfigTab";
import { BalanceProvider } from "./context/BalanceContext";

// const socket = io("http://167.179.108.96:3001", {
//   transports: ["websocket", "polling"],
//   reconnection: true,
//   reconnectionAttempts: 5,
//   reconnectionDelay: 1000,
// });
const socket = io(window.location.origin.replace("3000", "3001"), {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function App() {
  const [tab, setTab] = useState(0);
  const [accountName, setAccountName] = useState("");
  const [positions, setPositions] = useState([]);
  const [userBalanceAndProfit, setUserBalanceAndProfit] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");
  const [closePercent, setClosePercent] = useState(100);
  const [notifications, setNotifications] = useState([]);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    // Gửi sự kiện click tab đến server
    socket.emit("tab_changed", {
      tabIndex: newValue,
      tabName: [
        "Dashboard",
        "Positions",
        "Balance & Profit",
        "Config",
        "Signal",
      ][newValue],
    });
  };

  const handleCalculateProfit = async ({
    startDate,
    endDate,
    selectedUser,
  }) => {
    socket.emit("calculate_profit", {
      startDate,
      endDate,
      selectedUser,
    });
  };

  // Socket listeners
  useEffect(() => {
    socket.on("positions_update", setPositions);
    socket.on("balance_profit", setUserBalanceAndProfit);
    socket.on("config_data", setConfig);
    socket.on("error", setError);
    socket.on("users_list", setUsers);
    socket.on("active_users", setActiveUsers);
    socket.on("position_notifications", (newNotifications) => {
      // Thêm thời gian hiển thị cho mỗi thông báo
      const notificationsWithTime = newNotifications.map((notification) => ({
        ...notification,
        showTime: Date.now(),
      }));
      setNotifications((prev) => [...prev, ...notificationsWithTime]);
    });

    return () => {
      socket.off("positions_update");
      socket.off("balance_profit");
      socket.off("config_data");
      socket.off("error");
      socket.off("users_list");
      socket.off("active_users");
      socket.off("position_notifications");
    };
  }, []);

  // Thêm useEffect để tự động xóa thông báo sau 5s
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNotifications((prev) =>
        prev.filter((notification) => now - notification.showTime < 20000)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClosePosition = (symbol, side) => {
    socket.emit("close_position", {
      accountName,
      symbol,
      side,
      percent: closePercent,
    });
  };

  const handleCancelOrders = (symbol) => {
    socket.emit("cancel_orders", {
      accountName,
      symbol,
    });
  };

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
  };

  const handleConfigSave = (newConfig) => {
    socket.emit("set_config", { accountName, config: newConfig });
  };

  const handleUsersChange = (newActiveUsers) => {
    setActiveUsers(newActiveUsers);
  };

  // Xử lý đóng thông báo
  const handleCloseNotification = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Hàm render thông báo
  const renderNotification = (notification) => {
    switch (notification.type) {
      case "ORDER_FILLED":
        return (
          <Alert
            severity={notification.profit >= 0 ? "success" : "error"}
            onClose={() =>
              handleCloseNotification(notifications.indexOf(notification))
            }
          >
            ${notification.user} {notification.signal} {notification.orderType}{" "}
            {notification.side} {notification.symbol} - Profit:{" "}
            {notification.profit.toFixed(2)}$ - Volume: {notification.volume}$ -
            Price: {notification.price}
          </Alert>
        );
      case "POSITION_CLOSED":
        return (
          <Alert
            severity={notification.profit >= 0 ? "success" : "error"}
            onClose={() =>
              handleCloseNotification(notifications.indexOf(notification))
            }
          >
            CLOSE {notification.signal} {notification.symbol} -{" "}
            {notification.side} - Profit: {notification.profit.toFixed(2)}$ -
            Volume: {notification.volume}$ - Price: {notification.price}
          </Alert>
        );
      case "POSITION_OPENED":
        return (
          <Alert
            severity="info"
            onClose={() =>
              handleCloseNotification(notifications.indexOf(notification))
            }
          >
            OPEN {notification.signal} {notification.orderType}{" "}
            {notification.symbol} {notification.side} Entry:{" "}
            {notification.entryPrice} - Volume: {notification.volume}$
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <BalanceProvider>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ height: "100vh", width: "100vw", overflow: "auto" }}
      >
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="Positions" />
          <Tab label="Balance & Profit" />
          <Tab label="Config" />
          <Tab label="Signal" />
        </Tabs>
        <Box sx={{ p: 2, height: "calc(100vh - 48px)" }}>
          {tab === 0 && (
            <DashboardTab
              socket={socket}
              users={users}
              onUsersChange={handleUsersChange}
            />
          )}
          {tab === 1 && (
            <PositionsTab
              positions={positions}
              closePercent={closePercent}
              handleClosePosition={handleClosePosition}
              handleCancelOrders={handleCancelOrders}
              socket={socket}
            />
          )}
          {tab === 2 && (
            <BalanceProfitTab
              userBalanceAndProfit={userBalanceAndProfit}
              onCalculateProfit={handleCalculateProfit}
              users={activeUsers}
            />
          )}
          {tab === 3 && (
            <ConfigTab
              config={config}
              onConfigChange={handleConfigChange}
              onConfigSave={handleConfigSave}
            />
          )}
          {tab === 4 && <SignalConfigTab />}
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>

        {/* Sửa lại phần hiển thị thông báo */}
        <Box
          sx={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            maxWidth: 400,
          }}
        >
          {notifications.map((notification, index) => (
            <Snackbar
              key={index}
              open={true}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              sx={{
                position: "relative",
                transform: "none",
                top: "auto",
                right: "auto",
                bottom: "auto",
                left: "auto",
                marginBottom: 1,
              }}
            >
              {renderNotification(notification)}
            </Snackbar>
          ))}
        </Box>
      </Container>
    </BalanceProvider>
  );
}

export default App;
