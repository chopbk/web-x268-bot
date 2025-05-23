import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";

// Thêm component SummaryCard
const SummaryCard = ({ title, value, color = "inherit" }) => (
  <Card>
    <CardContent>
      <Typography color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h6" color={color}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

function DashboardTab({
  socket,
  users,
  onUsersChange,
  positions,
  userBalanceAndProfit,
}) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [botInfo, setBotInfo] = useState({
    version: "1.0.0",
    status: "Running",
    lastUpdate: new Date().toLocaleString(),
    totalPositions: 0,
    totalProfit: 0,
  });

  // Thêm hàm tính toán tổng hợp
  const calculateSummary = () => {
    const summary = {};

    positions?.forEach((position) => {
      if (!summary[position.user]) {
        summary[position.user] = {
          totalVolume: 0,
          totalRoi: 0,
          totalPnl: 0,
          positionCount: 0,
          todayProfit: 0,
          yesterdayProfit: 0,
          balance: 0,
        };
      }

      summary[position.user].totalVolume += parseFloat(position.volume) || 0;
      summary[position.user].totalRoi += parseFloat(position.roi) || 0;
      summary[position.user].totalPnl +=
        parseFloat(position.unRealizedProfit) || 0;
      summary[position.user].positionCount += 1;
    });

    // Cập nhật thông tin từ balance_profit

    userBalanceAndProfit?.forEach((data) => {
      if (!summary[data.account]) {
        summary[data.account] = {
          totalVolume: 0,
          totalRoi: 0,
          totalPnl: 0,
          positionCount: 0,
          todayProfit: 0,
          yesterdayProfit: 0,
          balance: 0,
        };
      }
      if (summary[data.account]) {
        summary[data.account].todayProfit = parseFloat(data.profit) || 0;
        summary[data.account].yesterdayProfit =
          parseFloat(data.yesterdayProfit?.profit) || 0;
        summary[data.account].balance = data.balance || 0;
        summary[data.account].availableBalance =
          parseFloat(data.availableBalance) || 0;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  useEffect(() => {
    // Lắng nghe sự kiện bot_info từ server
    socket.on("bot_info", (info) => {
      setBotInfo(info);
      setIsRefreshing(false);
    });

    return () => {
      socket.off("bot_info");
    };
  }, [socket]);

  const handleSaveUsers = () => {
    socket.emit("set_active_users", selectedUsers);
    onUsersChange(selectedUsers);
  };

  const handleRefreshDashboard = () => {
    setIsRefreshing(true);
    socket.emit("refreshDashboard");
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Bot Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h5">Bot Information</Typography>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshDashboard}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Dashboard"}
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Users
                    </Typography>
                    <Typography variant="h6">{botInfo.users}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={botInfo.status}
                      color={botInfo.status === "Running" ? "success" : "error"}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Last Update
                    </Typography>
                    <Typography variant="h6">{botInfo.lastUpdate}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Positions
                    </Typography>
                    <Typography variant="h6">
                      {botInfo.totalPositions}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      YesterDay Profit
                    </Typography>
                    <Typography variant="h6">
                      {botInfo.totalProfitYesterday?.toFixed(1)} USDT
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Today Profit
                    </Typography>
                    <Typography variant="h6">
                      {botInfo.totalProfit?.toFixed(1)} USDT
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Unrealized Profit
                    </Typography>
                    <Typography variant="h6">
                      {botInfo.unrealizedProfit?.toFixed(1)} USDT
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Account Summary Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Tổng hợp theo Account
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Available Balance</TableCell>
                    <TableCell align="right">Tổng Volume</TableCell>
                    <TableCell align="right">Tổng ROI</TableCell>
                    <TableCell align="right">Tổng PNL</TableCell>
                    <TableCell align="right">Today Profit</TableCell>
                    <TableCell align="right">Yesterday Profit</TableCell>
                    <TableCell align="right">Số Position</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(summary).map(([account, data]) => (
                    <TableRow key={account}>
                      <TableCell component="th" scope="row">
                        {account}
                      </TableCell>
                      <TableCell align="right">{data.balance}</TableCell>
                      <TableCell align="right">
                        {data.availableBalance.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {data.totalVolume.toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: data.totalRoi >= 0 ? "green" : "red" }}
                      >
                        {data.totalRoi.toFixed(2)}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: data.totalPnl >= 0 ? "green" : "red" }}
                      >
                        {data.totalPnl.toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: data.todayProfit >= 0 ? "green" : "red" }}
                      >
                        {data.todayProfit.toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: data.yesterdayProfit >= 0 ? "green" : "red",
                        }}
                      >
                        {data.yesterdayProfit.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">{data.positionCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardTab;
