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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";

function DashboardTab({ socket, users, onUsersChange }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [botInfo, setBotInfo] = useState({
    version: "1.0.0",
    status: "Running",
    lastUpdate: new Date().toLocaleString(),
    totalPositions: 0,
    totalProfit: 0,
  });

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
                      Total Profit
                    </Typography>
                    <Typography variant="h6">{botInfo.totalProfit}</Typography>
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
                      {botInfo.unrealizedProfit} USDT
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* User Selection */}
        {/* <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Active Users
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Users</InputLabel>
              <Select
                multiple
                value={selectedUsers}
                onChange={(e) => setSelectedUsers(e.target.value)}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Stack>
                )}
              >
                {users.map((user) => (
                  <MenuItem key={user} value={user}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveUsers}
              fullWidth
            >
              Save Active Users
            </Button>
          </Paper>
        </Grid> */}
      </Grid>
    </Box>
  );
}

export default DashboardTab;
