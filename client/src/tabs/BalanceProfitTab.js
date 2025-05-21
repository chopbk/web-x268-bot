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

  // Cập nhật localData khi có dữ liệu mới
  useEffect(() => {
    if (userBalanceAndProfit) {
      setLocalData(userBalanceAndProfit);
      setIsLoading(false);
      setBalance(userBalanceAndProfit); // Cập nhật balance vào context
    }
  }, [userBalanceAndProfit]);

  const handleCalculateProfit = async () => {
    try {
      setIsLoading(true);
      setError("");
      setLocalData([]); // Xóa dữ liệu cũ khi bắt đầu tính toán mới

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
                <TableCell>Account</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">Available </TableCell>
                <TableCell align="right">Unrealized</TableCell>
                <TableCell align="right">Profit</TableCell>
                <TableCell align="right">Fee</TableCell>
                <TableCell align="right">Ref</TableCell>
                <TableCell align="right">Funding</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {localData && localData.length > 0 ? (
                <>
                  {localData.map((user) => {
                    let totalBalance = 0;
                    let availableBalance = 0;
                    let unrealizedProfit = 0;
                    console.log(user);
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
                  <TableCell colSpan={7} align="center">
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
