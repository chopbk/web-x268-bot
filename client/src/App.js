import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import PositionsTab from "./tabs/PositionsTab";
import BalanceProfitTab from "./tabs/BalanceProfitTab";
import ConfigTab from "./tabs/ConfigTab";

const socket = io("http://localhost:3001");

function App() {
  const [tab, setTab] = useState(0);
  const [accountName, setAccountName] = useState("");
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [profit, setProfit] = useState(null);
  const [config, setConfig] = useState(null);
  const [closePercent, setClosePercent] = useState(100);
  const [error, setError] = useState("");

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    if (!accountName) return;
    if (newValue === 0) {
      socket.emit("subscribe_account", accountName);
    } else if (newValue === 1) {
      socket.emit("get_balance_profit", accountName);
    } else if (newValue === 2) {
      socket.emit("get_config", accountName);
    }
  };

  // Socket listeners
  useEffect(() => {
    socket.on("positions_update", setPositions);
    socket.on("balance_profit", ({ balance, profit }) => {
      setBalance(balance);
      setProfit(profit);
    });
    socket.on("config_data", setConfig);
    socket.on("error", setError);

    return () => {
      socket.off("positions_update");
      socket.off("balance_profit");
      socket.off("config_data");
      socket.off("error");
    };
  }, []);

  const handleSubscribe = () => {
    if (accountName) {
      if (tab === 0) socket.emit("subscribe_account", accountName);
      if (tab === 1) socket.emit("get_balance_profit", accountName);
      if (tab === 2) socket.emit("get_config", accountName);
    }
  };

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Account Name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleSubscribe}>
          Load
        </Button>
        {tab === 0 && (
          <TextField
            label="Close Percent"
            type="number"
            value={closePercent}
            onChange={(e) => setClosePercent(e.target.value)}
            sx={{ ml: 2, width: 150 }}
          />
        )}
      </Box>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab label="Positions" />
        <Tab label="Balance & Profit" />
        <Tab label="Config" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {tab === 0 && (
          <PositionsTab
            positions={positions}
            closePercent={closePercent}
            handleClosePosition={handleClosePosition}
            handleCancelOrders={handleCancelOrders}
          />
        )}
        {tab === 1 && <BalanceProfitTab balance={balance} profit={profit} />}
        {tab === 2 && (
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
