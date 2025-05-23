import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

function HistoryTab({ socket, users }) {
  const [searchParams, setSearchParams] = useState({
    startDate: new Date(),
    endDate: new Date(),
    selectedUser: "",
    type: "",
    symbol: "",
    side: "",
    status: "",
    isPaper: false,
    isCopy: false,
    isClosed: false,
    isOpen: false,
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    socket.emit("search_history", searchParams);
  };

  // Lắng nghe kết quả tìm kiếm
  React.useEffect(() => {
    socket.on("history_results", (results) => {
      setSearchResults(results);
      setIsLoading(false);
    });

    return () => {
      socket.off("history_results");
    };
  }, [socket]);

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Tra cứu lịch sử kèo
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Từ ngày"
                value={searchParams.startDate}
                onChange={(newValue) =>
                  setSearchParams({ ...searchParams, startDate: newValue })
                }
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Đến ngày"
                value={searchParams.endDate}
                onChange={(newValue) =>
                  setSearchParams({ ...searchParams, endDate: newValue })
                }
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Account</InputLabel>
              <Select
                value={searchParams.selectedUser}
                onChange={(e) =>
                  setSearchParams({
                    ...searchParams,
                    selectedUser: e.target.value,
                  })
                }
              >
                <MenuItem value="">Tất cả</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user} value={user}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Loại tín hiệu</InputLabel>
              <Select
                value={searchParams.type}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, type: e.target.value })
                }
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="SIGNAL">Signal</MenuItem>
                <MenuItem value="COPY">Copy</MenuItem>
                <MenuItem value="PAPER">Paper</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Cặp tiền"
              value={searchParams.symbol}
              onChange={(e) =>
                setSearchParams({ ...searchParams, symbol: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Hướng</InputLabel>
              <Select
                value={searchParams.side}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, side: e.target.value })
                }
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="LONG">Long</MenuItem>
                <MenuItem value="SHORT">Short</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={searchParams.status}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, status: e.target.value })
                }
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="WIN">Win</MenuItem>
                <MenuItem value="LOSS">Loss</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                label="Paper"
                color={searchParams.isPaper ? "primary" : "default"}
                onClick={() =>
                  setSearchParams({
                    ...searchParams,
                    isPaper: !searchParams.isPaper,
                  })
                }
              />
              <Chip
                label="Copy"
                color={searchParams.isCopy ? "primary" : "default"}
                onClick={() =>
                  setSearchParams({
                    ...searchParams,
                    isCopy: !searchParams.isCopy,
                  })
                }
              />
              <Chip
                label="Đã đóng"
                color={searchParams.isClosed ? "primary" : "default"}
                onClick={() =>
                  setSearchParams({
                    ...searchParams,
                    isClosed: !searchParams.isClosed,
                  })
                }
              />
              <Chip
                label="Đang mở"
                color={searchParams.isOpen ? "primary" : "default"}
                onClick={() =>
                  setSearchParams({
                    ...searchParams,
                    isOpen: !searchParams.isOpen,
                  })
                }
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bảng kết quả */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Thời gian</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Cặp tiền</TableCell>
              <TableCell>Hướng</TableCell>
              <TableCell>Volume</TableCell>
              <TableCell>Entry</TableCell>
              <TableCell>Exit</TableCell>
              <TableCell>ROE</TableCell>
              <TableCell>Profit</TableCell>
              <TableCell>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((result, index) => (
              <TableRow key={index}>
                <TableCell>
                  {new Date(result.openTime).toLocaleString()}
                </TableCell>
                <TableCell>{result.env}</TableCell>
                <TableCell>{result.typeSignal}</TableCell>
                <TableCell>{result.symbol}</TableCell>
                <TableCell>{result.side}</TableCell>
                <TableCell>{result.volume}</TableCell>
                <TableCell>{result.entryPrice}</TableCell>
                <TableCell>{result.exitPrice}</TableCell>
                <TableCell sx={{ color: result.roe >= 0 ? "green" : "red" }}>
                  {result.roe.toFixed(2)}%
                </TableCell>
                <TableCell sx={{ color: result.profit >= 0 ? "green" : "red" }}>
                  {result.profit.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={result.status}
                    color={result.status === "WIN" ? "success" : "error"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default HistoryTab;
