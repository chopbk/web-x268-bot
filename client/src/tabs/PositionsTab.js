import React, { useState, useEffect, useMemo, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  TableSortLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";

// Tách FilterSelect thành component riêng
const FilterSelect = memo(
  ({ field, label, values, selectedValues, onFilterChange }) => {
    const allSelected = values.length === selectedValues.length;

    const handleSelectAll = () => {
      if (allSelected) {
        onFilterChange(field, []);
      } else {
        onFilterChange(field, values);
      }
    };

    return (
      <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
        <InputLabel>{label}</InputLabel>
        <Select
          multiple
          value={selectedValues}
          onChange={(e) => onFilterChange(field, e.target.value)}
          input={<OutlinedInput label={label} />}
          renderValue={(selected) => selected.join(", ")}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300,
              },
            },
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left",
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left",
            },
            // Thêm các props này để giữ menu mở
            keepMounted: true,
            disablePortal: true,
          }}
        >
          <MenuItem onClick={handleSelectAll}>
            <Checkbox checked={allSelected} />
            <ListItemText primary={allSelected ? "Clear All" : "Select All"} />
          </MenuItem>
          <MenuItem divider />
          {values.map((value) => (
            <MenuItem key={value} value={value}>
              <Checkbox checked={selectedValues.indexOf(value) > -1} />
              <ListItemText primary={value} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
);

// Thêm component SummaryCard
const SummaryCard = ({ title, value, color = "inherit" }) => (
  <Paper
    sx={{
      p: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minWidth: 150,
    }}
  >
    <Typography variant="subtitle2" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h6" color={color}>
      {value}
    </Typography>
  </Paper>
);

function PositionsTab({
  positions,
  closePercent,
  handleClosePosition,
  handleCancelOrders,
  socket,
}) {
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [closePercents, setClosePercents] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [filters, setFilters] = useState({
    user: [],
    symbol: [],
    positionSide: [],
    type: [],
  });
  const [uniqueValues, setUniqueValues] = useState({
    user: [],
    symbol: [],
    positionSide: [],
    type: [],
  });

  // Sử dụng useMemo để tối ưu performance
  const memoizedUniqueValues = useMemo(() => {
    return {
      user: [...new Set(positions.map((pos) => pos.user))],
      symbol: [...new Set(positions.map((pos) => pos.symbol))],
      positionSide: [...new Set(positions.map((pos) => pos.positionSide))],
      type: [...new Set(positions.map((pos) => pos.type))],
    };
  }, [positions]);

  // Cập nhật uniqueValues khi memoizedUniqueValues thay đổi
  useEffect(() => {
    setUniqueValues(memoizedUniqueValues);
  }, [memoizedUniqueValues]);

  const getUniqueValues = (field) => {
    return uniqueValues[field] || [];
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isPositionFiltered = (position) => {
    return Object.entries(filters).every(([field, values]) => {
      if (values.length === 0) return true;
      return values.includes(position[field]);
    });
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleClosePercentChange = (symbol, value) => {
    setClosePercents((prev) => ({
      ...prev,
      [symbol]: value,
    }));
  };

  const handleUpdatePositions = () => {
    setIsUpdating(true);
    socket.emit("refreshPosition");
    // Tự động tắt trạng thái updating sau 2 giây
    setTimeout(() => {
      setIsUpdating(false);
    }, 2000);
  };

  const sortedPositions = [...positions]
    .filter(isPositionFiltered)
    .sort((a, b) => {
      if (!orderBy) return 0;

      let aValue = a[orderBy];
      let bValue = b[orderBy];

      if (
        orderBy === "roi" ||
        orderBy === "unRealizedProfit" ||
        orderBy === "leverage"
      ) {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }

      if (aValue < bValue) {
        return order === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === "asc" ? 1 : -1;
      }
      return 0;
    });

  const columns = [
    { id: "user", label: "Account" },
    { id: "symbol", label: "Symbol" },
    { id: "positionSide", label: "Side" },
    { id: "leverage", label: "Leverage" },
    { id: "entryPrice", label: "Entry" },
    { id: "markPrice", label: "Price" },
    { id: "liquidationPrice", label: "Liq" },
    { id: "roi", label: "ROI" },
    { id: "unRealizedProfit", label: "PNL" },
    { id: "volume", label: "Volume" },
    { id: "type", label: "Type" },
  ];

  // Thêm hàm tính toán tổng hợp cho toàn bộ positions
  const calculateTotalSummary = () => {
    return sortedPositions.reduce(
      (acc, position) => {
        acc.totalVolume += parseFloat(position.volume) || 0;
        acc.totalRoi += parseFloat(position.roi) || 0;
        acc.totalPnl += parseFloat(position.unRealizedProfit) || 0;
        acc.positionCount += 1;
        return acc;
      },
      {
        totalVolume: 0,
        totalRoi: 0,
        totalPnl: 0,
        positionCount: 0,
      }
    );
  };

  const totalSummary = calculateTotalSummary();

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FilterSelect
          field="user"
          label="Account"
          values={uniqueValues.user}
          selectedValues={filters.user}
          onFilterChange={handleFilterChange}
        />
        <FilterSelect
          field="symbol"
          label="Symbol"
          values={uniqueValues.symbol}
          selectedValues={filters.symbol}
          onFilterChange={handleFilterChange}
        />
        <FilterSelect
          field="positionSide"
          label="Side"
          values={uniqueValues.positionSide}
          selectedValues={filters.positionSide}
          onFilterChange={handleFilterChange}
        />
        <FilterSelect
          field="type"
          label="Type"
          values={uniqueValues.type}
          selectedValues={filters.type}
          onFilterChange={handleFilterChange}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleUpdatePositions}
          disabled={isUpdating}
        >
          {isUpdating ? "Updating..." : "Update Positions"}
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id}>
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : "asc"}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell>Close %</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Thêm hàng tổng hợp */}
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell colSpan={4} sx={{ fontWeight: "bold" }}>
                Tổng hợp
              </TableCell>
              <TableCell colSpan={3}></TableCell>
              <TableCell
                sx={{
                  color: totalSummary.totalRoi >= 0 ? "green" : "red",
                  fontWeight: "bold",
                }}
              >
                {totalSummary.totalRoi.toFixed(2)}%
              </TableCell>
              <TableCell
                sx={{
                  color: totalSummary.totalPnl >= 0 ? "green" : "red",
                  fontWeight: "bold",
                }}
              >
                {totalSummary.totalPnl.toFixed(2)}
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                {totalSummary.totalVolume.toFixed(2)}
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                {totalSummary.positionCount}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
            {sortedPositions.map((position, index) => (
              <TableRow key={index}>
                <TableCell>{position.user}</TableCell>
                <TableCell
                  sx={{
                    color: position.positionSide === "LONG" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {position.symbol}
                </TableCell>
                <TableCell
                  sx={{
                    color: position.positionSide === "LONG" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {position.positionSide}
                </TableCell>
                <TableCell
                  sx={{
                    color: position.positionSide === "LONG" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {position.leverage}x
                </TableCell>
                <TableCell>{position.entryPrice}</TableCell>
                <TableCell>{position.markPrice}</TableCell>
                <TableCell>{position.liquidationPrice}</TableCell>
                <TableCell sx={{ color: position.roi >= 0 ? "green" : "red" }}>
                  {position.roi.toFixed(2)}%
                </TableCell>
                <TableCell
                  sx={{
                    color: position.unRealizedProfit >= 0 ? "green" : "red",
                  }}
                >
                  {position.unRealizedProfit.toFixed(2)}
                </TableCell>
                <TableCell>{position.volume}</TableCell>
                <TableCell>{position.type}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={closePercents[position.symbol] || 100}
                    onChange={(e) =>
                      handleClosePercentChange(position.symbol, e.target.value)
                    }
                    inputProps={{ min: 1, max: 100 }}
                    sx={{ width: "80px" }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<CloseIcon />}
                      onClick={() =>
                        handleClosePosition(
                          position.symbol,
                          position.positionSide,
                          closePercents[position.symbol] || 100
                        )
                      }
                    >
                      Close
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancelOrders(position.symbol)}
                    >
                      Cancel Orders
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PositionsTab;
