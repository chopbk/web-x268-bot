import React, { useState } from "react";
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
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";

function BalanceProfitTab({ userBalanceAndProfit, onCalculateProfit }) {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Tính tổng profit trong khoảng thời gian cho một user

  const handleCalculateProfit = async () => {
    try {
      setIsLoading(true);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      await onCalculateProfit({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    } catch (error) {
      console.error("Error calculating profit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">Available Balance</TableCell>
                <TableCell align="right">Total Profit</TableCell>
                <TableCell align="right">Fee</TableCell>
                <TableCell align="right">Ref</TableCell>
                <TableCell align="right">Funding</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {console.log(userBalanceAndProfit)}
              {userBalanceAndProfit && userBalanceAndProfit.length > 0 ? (
                userBalanceAndProfit.map((user) => {
                  // const userProfit = calculateUserProfit(user.profit);
                  let totalBalance = "";
                  let availableBalance = "";
                  user.balance.map((accountBalance) => {
                    totalBalance += `\n${parseFloat(
                      accountBalance.balance
                    ).toFixed(2)} ${accountBalance.asset}`;
                    availableBalance += `\n${parseFloat(
                      accountBalance.availableBalance
                    ).toFixed(2)} ${accountBalance.asset}`;
                  });

                  return (
                    <TableRow key={user.account}>
                      <TableCell>{user.account}</TableCell>
                      <TableCell align="right">{totalBalance}</TableCell>
                      <TableCell align="right">{availableBalance}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: user.profit >= 0 ? "green" : "red",
                        }}
                      >
                        {user.profit.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">{user.fee.toFixed(2)}</TableCell>
                      <TableCell align="right">{user.ref.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        {user.funding.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No data available
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
