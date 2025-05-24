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
  Autocomplete,
  IconButton,
  Tooltip,
  TableSortLabel,
} from "@mui/material";
import ArrayDisplay from "../component/ArrayDisplay";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FilterListIcon from "@mui/icons-material/FilterList";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
const URL = `${process.env.REACT_APP_API_URL}`;

// Component FilterRow
const FilterRow = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    time: "",
    account: "",
    type: "",
    symbol: "",
    side: "",
    volume: "",
    entry: "",
    exit: "",
    roe: "",
    profit: "",
    status: "",
    user: "",
  });

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <TableRow>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter time"
          value={filters.time}
          onChange={(e) => handleFilterChange("time", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter account"
          value={filters.account}
          onChange={(e) => handleFilterChange("account", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter type"
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter symbol"
          value={filters.symbol}
          onChange={(e) => handleFilterChange("symbol", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter side"
          value={filters.side}
          onChange={(e) => handleFilterChange("side", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter volume"
          value={filters.volume}
          onChange={(e) => handleFilterChange("volume", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter entry"
          value={filters.entry}
          onChange={(e) => handleFilterChange("entry", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter exit"
          value={filters.exit}
          onChange={(e) => handleFilterChange("exit", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter ROE"
          value={filters.roe}
          onChange={(e) => handleFilterChange("roe", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter profit"
          value={filters.profit}
          onChange={(e) => handleFilterChange("profit", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter status"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          placeholder="Filter user"
          value={filters.user}
          onChange={(e) => handleFilterChange("user", e.target.value)}
        />
      </TableCell>
    </TableRow>
  );
};

// Component SortableTableCell
const SortableTableCell = ({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}) => {
  return (
    <TableCell>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {label}
        <Box>
          <IconButton
            size="small"
            onClick={() => onSort(field, "asc")}
            color={
              sortField === field && sortDirection === "asc"
                ? "primary"
                : "default"
            }
          >
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onSort(field, "desc")}
            color={
              sortField === field && sortDirection === "desc"
                ? "primary"
                : "default"
            }
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </TableCell>
  );
};

function HistoryPage() {
  const today = new Date(new Date().toISOString().split("T")[0]);
  const endOfToDay = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [searchParams, setSearchParams] = useState({
    start: today,
    end: endOfToDay,
    user: "",
    account: "",
    type: "",
    symbol: "",
    side: "",
    status: "",
    isPaper: false,
    isCopy: false,
    isClosed: true,
    isOpen: false,
    signal: "",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({
    time: "",
    account: "",
    type: "",
    symbol: "",
    side: "",
    volume: "",
    profit: "",
    status: "",
    user: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [showDetails, setShowDetails] = useState(false);
  const [showTypeDetails, setShowTypeDetails] = useState(false);
  const [showSymbolDetails, setShowSymbolDetails] = useState(false);

  // Thêm state cho filter bảng tổng hợp
  const [summaryFilter, setSummaryFilter] = useState({
    status: "", // WIN/LOSS
    minTotalTrades: "",
    minWinRate: "",
    minAvgRoe: "",
  });

  // Thêm state cho sắp xếp bảng thống kê
  const [summarySortConfig, setSummarySortConfig] = useState({
    key: "",
    direction: "asc",
  });

  // Lấy danh sách users khi component mount
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${URL}/api/users`);
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
    const fetchHistory = async () => {
      try {
        let today = new Date().toISOString().split("T")[0];
        const response = await axios.post(`${URL}/api/history`, {
          start: "2025-05-22", //today
        });
        setSearchResults(response.data);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${URL}/api/history/search`,
        searchParams
      );
      console.log(response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lấy danh sách các giá trị unique cho filter
  const getUniqueValues = (field) => {
    return [...new Set(searchResults.map((item) => item[field]))].filter(
      Boolean
    );
  };

  // Filter function
  const filteredResults = searchResults.filter((result) => {
    return (
      (!filter.time ||
        new Date(result.openTime).getTime() >=
          new Date(filter.time).getTime()) &&
      (!filter.user || result.user === filter.user) &&
      (!filter.account || result.env === filter.account) &&
      (!filter.type ||
        result.typeSignal.toLowerCase().includes(filter.type.toLowerCase())) &&
      (!filter.symbol ||
        result.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) &&
      (!filter.side ||
        result.side.toLowerCase().includes(filter.side.toLowerCase())) &&
      (!filter.volume || Number(result.volume) >= Number(filter.volume)) &&
      (!filter.profit || Number(result.profit) >= Number(filter.profit)) &&
      (!filter.status ||
        result.status.toLowerCase().includes(filter.status.toLowerCase()))
    );
  });

  // Sort function
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Sắp xếp filteredResults
  const sortedResults = [...filteredResults].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    let aValue = a[key];
    let bValue = b[key];

    // Handle date sorting
    if (key === "openTime") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle number sorting
    if (["volume", "entryPrice", "closePrice", "roe", "profit"].includes(key)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // Handle string sorting for user
    if (key === "user") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (direction === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Tính toán thống kê
  const calculateStats = () => {
    if (sortedResults.length === 0) return null;

    // Tính tổng số account
    const uniqueAccounts = new Set(sortedResults.map((item) => item.env)).size;

    // Tính tỉ lệ win theo loại
    const typeStats = {};
    const accountStats = {};
    // Tính tỉ lệ win theo symbol
    const symbolStats = {};

    sortedResults.forEach((item) => {
      let accountType = item.typeSignal + " " + item.env;
      if (!typeStats[accountType]) {
        typeStats[accountType] = {
          user: item.user,
          account: item.env,
          type: item.typeSignal,
          win: 0,
          total: 0,
          totalProfitWin: 0,
          totalProfitLoss: 0,
          totalProfit: 0,
          totalRoe: 0,
          avgRoe: 0,
          avgProfit: 0,
        };
      }
      if (!accountStats[item.env]) {
        accountStats[item.env] = { win: 0, total: 0 };
      }
      if (!symbolStats[item.symbol]) {
        symbolStats[item.symbol] = { win: 0, total: 0 };
      }

      typeStats[accountType].total++;
      typeStats[accountType].totalProfit += Number(item.profit);
      typeStats[accountType].totalRoe += Number(item.roe);

      if (item.status === "WIN") {
        typeStats[accountType].win++;
        typeStats[accountType].totalProfitWin += Number(item.profit);
      } else {
        typeStats[accountType].totalProfitLoss += Number(item.profit);
      }

      accountStats[item.env].total++;
      if (item.status === "WIN") {
        accountStats[item.env].win++;
      }

      symbolStats[item.symbol].total++;
      if (item.status === "WIN") {
        symbolStats[item.symbol].win++;
      }
    });
    Object.entries(typeStats).forEach(([type, stats]) => {
      stats.avgRoe = stats.totalRoe / stats.total;
      stats.avgProfit = stats.totalProfit / stats.total;
    });
    const typeStatsText = Object.entries(typeStats)
      .map(([type, stats]) => `${type}: ${stats.win}/${stats.total}\n`)
      .join(", ");
    const accountStatsText = Object.entries(accountStats)
      .map(([account, stats]) => `${account}: ${stats.win}/${stats.total}\n`)
      .join(", ");
    const symbolStatsText = Object.entries(symbolStats)
      .map(([symbol, stats]) => `${symbol}: ${stats.win}/${stats.total}\n`)
      .join(", ");

    const totalVolume = sortedResults.reduce(
      (sum, item) => sum + Number(item.volume),
      0
    );
    // Tính volume trung bình
    const avgVolume = totalVolume / sortedResults.length;

    // Tính ROE trung bình
    const avgRoe =
      sortedResults.reduce((sum, item) => sum + Number(item.roe), 0) /
      sortedResults.length;

    // Tính tổng profit
    const totalProfit = sortedResults.reduce(
      (sum, item) => sum + Number(item.profit),
      0
    );
    const avgProfit = totalProfit / sortedResults.length;

    // Tính tỉ lệ WIN/LOSS/TOTAL
    const total = sortedResults.length;
    const totalWin = sortedResults.filter(
      (item) => item.status === "WIN"
    ).length;
    const totalLoss = total - totalWin;
    const totalDraw = total - totalWin - totalLoss;

    return {
      total,
      uniqueAccounts,
      typeStatsText,
      accountStatsText,
      symbolStatsText,
      totalVolume,
      avgVolume,
      avgRoe,
      avgProfit,
      totalProfit,
      totalWin,
      totalLoss,
      totalDraw,
      typeStats,
      symbolStats,
    };
  };

  const stats = calculateStats();

  // Filter function cho bảng tổng hợp
  const filteredTypeStats = stats
    ? Object.entries(stats.typeStats).filter(([_, data]) => {
        const isWin = data.totalProfit >= 0;
        const winRate = (data.win / data.total) * 100;

        return (
          (!summaryFilter.status ||
            (summaryFilter.status === "WIN" && isWin) ||
            (summaryFilter.status === "LOSS" && !isWin)) &&
          (!summaryFilter.minTotalTrades ||
            data.total >= Number(summaryFilter.minTotalTrades)) &&
          (!summaryFilter.minWinRate ||
            winRate >= Number(summaryFilter.minWinRate)) &&
          (!summaryFilter.minAvgRoe ||
            data.avgRoe >= Number(summaryFilter.minAvgRoe))
        );
      })
    : [];

  // Hàm sắp xếp cho bảng thống kê
  const handleSummarySort = (key) => {
    setSummarySortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Sắp xếp filteredTypeStats
  const sortedTypeStats = [...filteredTypeStats].sort((a, b) => {
    const { key, direction } = summarySortConfig;
    if (!key) return 0;

    const [_, dataA] = a;
    const [__, dataB] = b;

    let aValue, bValue;

    switch (key) {
      case "account":
        aValue = dataA.account;
        bValue = dataB.account;
        break;
      case "type":
        aValue = dataA.type;
        bValue = dataB.type;
        break;
      case "totalProfit":
        aValue = dataA.totalProfit;
        bValue = dataB.totalProfit;
        break;
      case "winRate":
        aValue = (dataA.win / dataA.total) * 100;
        bValue = (dataB.win / dataB.total) * 100;
        break;
      case "avgRoe":
        aValue = dataA.avgRoe;
        bValue = dataB.avgRoe;
        break;
      case "totalProfitWin":
        aValue = dataA.totalProfitWin;
        bValue = dataB.totalProfitWin;
        break;
      case "totalProfitLoss":
        aValue = dataA.totalProfitLoss;
        bValue = dataB.totalProfitLoss;
        break;
      case "win":
        aValue = dataA.win;
        bValue = dataB.win;
        break;
      case "total":
        aValue = dataA.total;
        bValue = dataB.total;
        break;
      case "avgProfit":
        aValue = dataA.avgProfit;
        bValue = dataB.avgProfit;
        break;
      case "user":
        aValue = dataA.user;
        bValue = dataB.user;
        break;
      default:
        return 0;
    }

    if (direction === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

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
                value={searchParams.start}
                onChange={(newValue) =>
                  setSearchParams({ ...searchParams, start: newValue })
                }
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Đến ngày"
                value={searchParams.end}
                onChange={(newValue) =>
                  setSearchParams({ ...searchParams, end: newValue })
                }
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Autocomplete
              freeSolo
              options={users}
              value={searchParams.user}
              onChange={(event, newValue) => {
                console.log("Selected user:", newValue);
                setSearchParams({
                  ...searchParams,
                  user: newValue ? newValue.toUpperCase() : "",
                });
              }}
              onInputChange={(event, newInputValue) => {
                console.log("Input value:", newInputValue);
                setSearchParams({
                  ...searchParams,
                  user: newInputValue ? newInputValue.toUpperCase() : "",
                });
              }}
              sx={{ minWidth: 150 }}
              renderInput={(params) => (
                <TextField {...params} label="User" fullWidth />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              sx={{ minWidth: 150 }}
              fullWidth
              label="Account"
              value={
                searchParams.account ? searchParams.account.toUpperCase() : ""
              }
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  account: e.target.value.toUpperCase(),
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth sx={{ minWidth: 150 }}>
              <InputLabel>Loại tín hiệu</InputLabel>
              <Select
                multiple
                value={searchParams.type ? searchParams.type.split(",") : []}
                onChange={(e) =>
                  setSearchParams({
                    ...searchParams,
                    type: e.target.value.join(","),
                  })
                }
                renderValue={(selected) => selected.join(", ")}
              >
                <MenuItem value="SIGNAL">Signal</MenuItem>
                <MenuItem value="COPY">Copy</MenuItem>
                <MenuItem value="PAPER">Paper</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Signal"
              value={
                searchParams.signal ? searchParams.signal.toUpperCase() : ""
              }
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  signal: e.target.value.toUpperCase(),
                })
              }
            />
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
              <InputLabel>Side</InputLabel>
              <Select
                value={searchParams.side}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, side: e.target.value })
                }
                sx={{ width: "100px" }}
              >
                <MenuItem value="">Long/Short</MenuItem>
                <MenuItem value="LONG">Long</MenuItem>
                <MenuItem value="SHORT">Short</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={searchParams.status}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, status: e.target.value })
                }
                sx={{ width: "100px" }}
              >
                <MenuItem value="">All</MenuItem>
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

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Kết quả tìm kiếm
      </Typography>

      {/* Bảng Filter */}
      <TableContainer component={Paper} sx={{ mb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell colSpan={11}>
                <Typography variant="h6">Bộ lọc</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ padding: "4px" }}>
                <TextField
                  size="small"
                  type="date"
                  placeholder="Filter time"
                  value={filter.time}
                  onChange={(e) =>
                    setFilter({ ...filter, time: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("user")}
                  value={filter.user}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, user: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter user (exact match)"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("env")}
                  value={filter.account}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, account: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter account (exact match)"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("typeSignal")}
                  value={filter.type}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, type: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter type"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("symbol")}
                  value={filter.symbol}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, symbol: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter symbol"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("side")}
                  value={filter.side}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, side: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter side"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Min volume"
                  value={filter.volume}
                  onChange={(e) =>
                    setFilter({ ...filter, volume: e.target.value })
                  }
                  InputProps={{
                    inputProps: { min: 0 },
                  }}
                  fullWidth
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Min profit"
                  value={filter.profit}
                  onChange={(e) =>
                    setFilter({ ...filter, profit: e.target.value })
                  }
                  fullWidth
                />
              </TableCell>
              <TableCell sx={{ padding: "4px" }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={getUniqueValues("status")}
                  value={filter.status}
                  onChange={(event, newValue) => {
                    setFilter({ ...filter, status: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Filter status"
                      fullWidth
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bảng thống kê chi tiết theo loại */}
      {stats && (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell colSpan={11}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5">Thống kê chi tiết</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Trạng thái</InputLabel>
                      <Select
                        value={summaryFilter.status}
                        onChange={(e) =>
                          setSummaryFilter({
                            ...summaryFilter,
                            status: e.target.value,
                          })
                        }
                        label="Trạng thái"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="WIN">Win</MenuItem>
                        <MenuItem value="LOSS">Loss</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="number"
                      label="Min Total Trades"
                      value={summaryFilter.minTotalTrades}
                      onChange={(e) =>
                        setSummaryFilter({
                          ...summaryFilter,
                          minTotalTrades: e.target.value,
                        })
                      }
                      InputProps={{ inputProps: { min: 0 } }}
                      sx={{ width: 150 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Min Win Rate (%)"
                      value={summaryFilter.minWinRate}
                      onChange={(e) =>
                        setSummaryFilter({
                          ...summaryFilter,
                          minWinRate: e.target.value,
                        })
                      }
                      InputProps={{ inputProps: { min: 0, max: 100 } }}
                      sx={{ width: 150 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Min Avg ROE (%)"
                      value={summaryFilter.minAvgRoe}
                      onChange={(e) =>
                        setSummaryFilter({
                          ...summaryFilter,
                          minAvgRoe: e.target.value,
                        })
                      }
                      sx={{ width: 150 }}
                    />
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={summarySortConfig.key === "account"}
                    direction={
                      summarySortConfig.key === "account"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("account")}
                  >
                    <Typography variant="subtitle1">Account</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={summarySortConfig.key === "type"}
                    direction={
                      summarySortConfig.key === "type"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("type")}
                  >
                    <Typography variant="subtitle1">Loại</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "totalProfit"}
                    direction={
                      summarySortConfig.key === "totalProfit"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("totalProfit")}
                  >
                    <Typography variant="subtitle1">Total Profit</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "winRate"}
                    direction={
                      summarySortConfig.key === "winRate"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("winRate")}
                  >
                    <Typography variant="subtitle1">Win Rate</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "avgRoe"}
                    direction={
                      summarySortConfig.key === "avgRoe"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("avgRoe")}
                  >
                    <Typography variant="subtitle1">ROE</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "totalProfitWin"}
                    direction={
                      summarySortConfig.key === "totalProfitWin"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("totalProfitWin")}
                  >
                    <Typography variant="subtitle1">Profit Win</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "totalProfitLoss"}
                    direction={
                      summarySortConfig.key === "totalProfitLoss"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("totalProfitLoss")}
                  >
                    <Typography variant="subtitle1">Loss</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "win"}
                    direction={
                      summarySortConfig.key === "win"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("win")}
                  >
                    <Typography variant="subtitle1">Win</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "total"}
                    direction={
                      summarySortConfig.key === "total"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("total")}
                  >
                    <Typography variant="subtitle1">Total</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "avgProfit"}
                    direction={
                      summarySortConfig.key === "avgProfit"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("avgProfit")}
                  >
                    <Typography variant="subtitle1">Avg Profit</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={summarySortConfig.key === "avgRoe"}
                    direction={
                      summarySortConfig.key === "avgRoe"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("avgRoe")}
                  >
                    <Typography variant="subtitle1">Avg ROE</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={summarySortConfig.key === "user"}
                    direction={
                      summarySortConfig.key === "user"
                        ? summarySortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSummarySort("user")}
                  >
                    <Typography variant="subtitle1">User</Typography>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTypeStats.map(([type, data]) => (
                <TableRow key={type}>
                  <TableCell>
                    <Typography variant="body1">{data.account}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">{data.type}</Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: data.totalProfit >= 0 ? "green" : "red",
                    }}
                  >
                    <Typography variant="body1">
                      {Math.floor(data.totalProfit)}$
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      {((data.win / data.total) * 100).toFixed(2)}%
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: data.totalRoe >= 0 ? "green" : "red",
                    }}
                  >
                    <Typography variant="body1">
                      {Math.floor(data.avgRoe)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      {Math.floor(data.totalProfitWin)}$
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      {Math.floor(data.totalProfitLoss)}$
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">{data.win}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">{data.total}</Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: data.totalProfit >= 0 ? "green" : "red",
                    }}
                  >
                    <Typography variant="body1">
                      {Math.floor(data.avgProfit)}$
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: data.totalRoe >= 0 ? "green" : "red",
                    }}
                  >
                    <Typography variant="body1">
                      {Math.floor(data.totalRoe)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">{data.user}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Bảng kết quả chi tiết */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={11}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="h6">Chi tiết giao dịch</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowDetails(!showDetails)}
                    color="primary"
                  >
                    {showDetails ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "openTime"}
                  direction={
                    sortConfig.key === "openTime" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("openTime")}
                >
                  Thời gian
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "env"}
                  direction={
                    sortConfig.key === "env" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("env")}
                >
                  Account
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "typeSignal"}
                  direction={
                    sortConfig.key === "typeSignal"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSort("typeSignal")}
                >
                  Loại
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "symbol"}
                  direction={
                    sortConfig.key === "symbol" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("symbol")}
                >
                  Cặp tiền
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "side"}
                  direction={
                    sortConfig.key === "side" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("side")}
                >
                  Hướng
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "volume"}
                  direction={
                    sortConfig.key === "volume" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("volume")}
                >
                  Volume
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "entryPrice"}
                  direction={
                    sortConfig.key === "entryPrice"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSort("entryPrice")}
                >
                  Entry
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "closePrice"}
                  direction={
                    sortConfig.key === "closePrice"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSort("closePrice")}
                >
                  Exit
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "roe"}
                  direction={
                    sortConfig.key === "roe" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("roe")}
                >
                  ROE
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "profit"}
                  direction={
                    sortConfig.key === "profit" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("profit")}
                >
                  Profit
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "status"}
                  direction={
                    sortConfig.key === "status" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("status")}
                >
                  Trạng thái
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "user"}
                  direction={
                    sortConfig.key === "user" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("user")}
                >
                  User
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showDetails &&
              sortedResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(result.openTime).toLocaleString()}
                  </TableCell>
                  <TableCell>{result.env}</TableCell>
                  <TableCell>{result.typeSignal}</TableCell>
                  <TableCell>{result.symbol}</TableCell>
                  <TableCell>{result.side}</TableCell>
                  <TableCell>{Math.floor(result.volume)}</TableCell>
                  <TableCell>{result.entryPrice}</TableCell>
                  <TableCell>{result.closePrice}</TableCell>
                  <TableCell sx={{ color: result.roe >= 0 ? "green" : "red" }}>
                    {result.roe ? result.roe.toFixed(2) : "0.00"}%
                  </TableCell>
                  <TableCell
                    sx={{ color: result.profit >= 0 ? "green" : "red" }}
                  >
                    {result.profit ? result.profit.toFixed(2) : "0.00"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={result.status}
                      color={result.status === "WIN" ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>{result.user}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default HistoryPage;
