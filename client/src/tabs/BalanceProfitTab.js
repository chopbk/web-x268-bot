import React from "react";
import { Box, Typography, Paper } from "@mui/material";

function BalanceProfitTab({ balance, profit }) {
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Balance</Typography>
        <pre style={{ margin: 0 }}>
          {balance ? JSON.stringify(balance, null, 2) : "No data"}
        </pre>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Today's Profit</Typography>
        <pre style={{ margin: 0 }}>
          {profit ? JSON.stringify(profit, null, 2) : "No data"}
        </pre>
      </Paper>
    </Box>
  );
}

export default BalanceProfitTab;
