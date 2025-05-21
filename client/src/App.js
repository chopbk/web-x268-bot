import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Container, Tabs, Tab, Box, Typography } from "@mui/material";
import DashboardTab from "./tabs/DashboardTab";
import PositionsTab from "./tabs/PositionsTab";
import BalanceProfitTab from "./tabs/BalanceProfitTab";
import ConfigTab from "./tabs/ConfigTab";

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

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    // Gửi sự kiện click tab đến server
    socket.emit("tab_changed", {
      tabIndex: newValue,
      tabName: ["Dashboard", "Positions", "Balance & Profit", "Config"][
        newValue
      ],
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

    return () => {
      socket.off("positions_update");
      socket.off("balance_profit");
      socket.off("config_data");
      socket.off("error");
      socket.off("users_list");
      socket.off("active_users");
    };
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

  return (
    <Container maxWidth="xl" sx={{ mt: 4, px: 4 }}>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab label="Dashboard" />
        <Tab label="Positions" />
        <Tab label="Balance & Profit" />
        <Tab label="Config" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
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
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
    </Container>
  );
}

export default App;
