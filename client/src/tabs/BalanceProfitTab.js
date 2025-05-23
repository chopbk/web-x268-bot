import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Grid,
  Button,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import { useBalance } from "../context/BalanceContext";

function BalanceProfitTab({ userBalanceAndProfit, onCalculateProfit, users }) {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [localData, setLocalData] = useState([]);
  const { setBalance } = useBalance();
  const [orderBy, setOrderBy] = useState("account");
  const [order, setOrder] = useState("asc");

  // Cập nhật localData khi có dữ liệu mới
  useEffect(() => {
    if (userBalanceAndProfit) {
      setLocalData(userBalanceAndProfit);
      setIsLoading(false);
      setBalance(userBalanceAndProfit);
    }
  }, [userBalanceAndProfit]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortData = (data) => {
    return data.sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Xử lý các trường hợp đặc biệt
      if (orderBy === "balance") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (orderBy === "account") {
        return order === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === "asc"
        ? (aValue || 0) - (bValue || 0)
        : (bValue || 0) - (aValue || 0);
    });
  };

  const handleCalculateProfit = async () => {
    try {
      setIsLoading(true);
      setError("");
      setLocalData([]);

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      await onCalculateProfit({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        selectedUser,
      });
    } catch (error) {
      console.error("Error calculating profit:", error);
      setError("Failed to calculate profit. Please try again.");
      setIsLoading(false);
    }
  };

  const createSortHandler = (property) => () => {
    handleRequestSort(property);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                value={selectedUser}
                label="User"
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user} value={user}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: startDate,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CalculateIcon />}
              onClick={handleCalculateProfit}
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? "Calculating..." : "Calculate Profit"}
            </Button>
          </Grid>
        </Grid>

        {isLoading && (
          <Box sx={{ width: "100%", mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Calculating profit for selected date range...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "account"}
                    direction={orderBy === "account" ? order : "asc"}
                    onClick={createSortHandler("account")}
                  >
                    Account
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "balance"}
                    direction={orderBy === "balance" ? order : "asc"}
                    onClick={createSortHandler("balance")}
                  >
                    Balance
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "availableBalance"}
                    direction={orderBy === "availableBalance" ? order : "asc"}
                    onClick={createSortHandler("availableBalance")}
                  >
                    Available
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "unrealizedProfit"}
                    direction={orderBy === "unrealizedProfit" ? order : "asc"}
                    onClick={createSortHandler("unrealizedProfit")}
                  >
                    Unrealized
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "profit"}
                    direction={orderBy === "profit" ? order : "asc"}
                    onClick={createSortHandler("profit")}
                  >
                    Profit
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "fee"}
                    direction={orderBy === "fee" ? order : "asc"}
                    onClick={createSortHandler("fee")}
                  >
                    Fee
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "ref"}
                    direction={orderBy === "ref" ? order : "asc"}
                    onClick={createSortHandler("ref")}
                  >
                    Ref
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "funding"}
                    direction={orderBy === "funding" ? order : "asc"}
                    onClick={createSortHandler("funding")}
                  >
                    Funding
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {localData && localData.length > 0 ? (
                <>
                  {sortData([...localData]).map((user) => {
                    let totalBalance = 0;
                    let availableBalance = 0;
                    let unrealizedProfit = 0;
                    if (user) {
                      totalBalance = user.balance || 0;
                      availableBalance = user.availableBalance || 0;
                      unrealizedProfit = user.unrealizedProfit || 0;
                    }

                    return (
                      <TableRow key={user.account}>
                        <TableCell>{user.account}</TableCell>
                        <TableCell align="right">{totalBalance}</TableCell>
                        <TableCell align="right">
                          {availableBalance.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {unrealizedProfit.toFixed(2)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: user.profit >= 0 ? "green" : "red",
                          }}
                        >
                          {user.profit?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {user.fee?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {user.ref?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {user.funding?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
                    <TableCell align="right"></TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        color:
                          localData.reduce(
                            (sum, user) => sum + user.availableBalance,
                            0
                          ) >= 0
                            ? "green"
                            : "red",
                      }}
                    >
                      {localData
                        .reduce((sum, user) => sum + user.availableBalance, 0)
                        .toFixed(2)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        color:
                          localData.reduce(
                            (sum, user) => sum + user.unrealizedProfit,
                            0
                          ) >= 0
                            ? "green"
                            : "red",
                      }}
                    >
                      {localData
                        .reduce((sum, user) => sum + user.unrealizedProfit, 0)
                        .toFixed(2)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        color:
                          localData.reduce(
                            (sum, user) => sum + user.profit,
                            0
                          ) >= 0
                            ? "green"
                            : "red",
                      }}
                    >
                      {localData
                        .reduce((sum, user) => sum + user.profit, 0)
                        .toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {localData
                        .reduce((sum, user) => sum + user.fee, 0)
                        .toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {localData
                        .reduce((sum, user) => sum + user.ref, 0)
                        .toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {localData
                        .reduce((sum, user) => sum + user.funding, 0)
                        .toFixed(2)}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {isLoading ? "Calculating..." : "No data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default BalanceProfitTab;
