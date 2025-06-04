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
  Autocomplete,
  Chip,
  Snackbar,
  Alert,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import UpdateIcon from "@mui/icons-material/Update";
import PositionDetailDialog from "../components/PositionDetailDialog";
import axios from "axios";

// Thay thế FilterSelect bằng FilterAutocomplete
const FilterAutocomplete = memo(
  ({ field, label, values, selectedValues, onFilterChange }) => {
    return (
      <Autocomplete
        multiple
        options={values}
        value={selectedValues}
        onChange={(event, newValue) => {
          onFilterChange(field, newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            sx={{
              minWidth: 120,
              maxWidth: 200,
              "& .MuiAutocomplete-tag": {
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
              "& .MuiAutocomplete-input": {
                width: "0 !important",
              },
              "& .MuiAutocomplete-endAdornment": {
                top: "calc(50% - 14px)",
              },
            }}
          />
        )}
        sx={{
          width: 200,
          "& .MuiAutocomplete-inputRoot": {
            padding: "0 8px",
          },
          "& .MuiAutocomplete-tag": {
            margin: "2px",
            maxWidth: "100px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }}
        size="small"
        disableCloseOnSelect
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              size="small"
              {...getTagProps({ index })}
              sx={{
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            />
          ))
        }
      />
    );
  }
);

// Thêm lại FilterSelect component
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
  handleClosePosition: propHandleClosePosition,
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
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false);

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

  const handleUpdatePositions = async () => {
    setIsUpdating(true);
    if (!socket.connected) {
      // call API to update position
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/position/update`
      );
    } else {
      socket.emit("refreshPosition");
    }
    // Tự động tắt trạng thái updating sau 2 giây
    setTimeout(() => {
      setIsUpdating(false);
    }, 2000);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "success") => {
    // Đóng snackbar hiện tại nếu đang mở
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    }, 500);

    // Delay 100ms trước khi hiển thị snackbar mới
    setTimeout(() => {
      setSnackbar({
        open: true,
        message,
        severity,
      });
    }, 500);
  };

  const handleCancelAllOrders = async (symbol, side) => {
    try {
      const user =
        positions.find((p) => p.symbol === symbol && p.positionSide === side)
          ?.user || "";
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/order/cancel-all`,
        {
          user: user,
          symbol: symbol,
          side: side,
        }
      );
      const messages = [];
      const { success, failed } = response.data.data;
      success.forEach((userResult) => {
        if (userResult.success?.length > 0) {
          messages.push(
            `${userResult.user} ${symbol} ${side} Huỷ Order ${userResult.success.length} thành công \n`
          );
        }
      });

      // Xử lý các positions thất bại
      failed.forEach((userResult) => {
        messages.push(
          `${user} ${symbol} ${side} Error canceling orders: ${userResult.error}\n`
        );
      });

      showSnackbar(messages.join(""), "warning");
      socket.emit("refreshPosition");
    } catch (error) {
      console.error("Error canceling orders:", error);
      showSnackbar(
        "Error canceling orders: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  const handleUpdatePosition = async (position) => {
    try {
      // check socket.io is connected
      if (!socket.connected) {
        // call API to update position
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/position/update`,
          {
            user: position.user,
            symbol: position.symbol,
            side: position.positionSide,
          }
        );
      } else {
        socket.emit("refreshPosition", {
          user: position.user,
          symbol: position.symbol,
          side: position.positionSide,
        });
      }

      showSnackbar(
        `Đang cập nhật position ${position.user} ${position.symbol} ${position.positionSide}...`
      );
    } catch (error) {
      showSnackbar("Lỗi khi cập nhật position: " + error.message, "error");
    }
  };

  const handleCloseAllPositions = async () => {
    try {
      // Lấy danh sách user từ filter
      const selectedUsers = filters.user;

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/position/closeAll`,
        {
          // Nếu có filter user thì gửi danh sách user, nếu không thì gửi mảng rỗng
          users: selectedUsers.length > 0 ? selectedUsers : [],
        }
      );

      // Nếu có lỗi một phần
      if (response.data.code === "PARTIAL_SUCCESS") {
        const { success, failed } = response.data.data;

        // Tạo message chi tiết cho từng user
        const messages = [];

        // Xử lý các positions thành công
        success.forEach((userResult) => {
          if (userResult.success?.length > 0) {
            messages.push(
              `User ${userResult.user}: Đóng thành công ${userResult.success.length} positions\n`
            );
          }
        });

        // Xử lý các positions thất bại
        failed.forEach((userResult) => {
          messages.push(`User ${userResult.user}: ${userResult.error}\n`);
        });

        showSnackbar(messages.join(""), "warning");
      } else {
        // Nếu tất cả thành công
        showSnackbar("Đóng tất cả vị thế thành công");
      }

      socket.emit("refreshPosition");
    } catch (error) {
      // Xử lý lỗi từ response
      if (error.response?.data?.code === "PARTIAL_SUCCESS") {
        const { success, failed } = error.response.data.data;

        const messages = [];

        // Xử lý các positions thành công
        success.forEach((userResult) => {
          if (userResult.success?.length > 0) {
            messages.push(
              `User ${userResult.user}: Đóng thành công ${userResult.success.length} positions\n`
            );
          }
        });

        // Xử lý các positions thất bại
        failed.forEach((userResult) => {
          messages.push(`User ${userResult.user}: ${userResult.error}\n`);
        });

        showSnackbar(messages.join(""), "warning");
      } else {
        // Xử lý lỗi khác
        showSnackbar(
          "Lỗi khi đóng tất cả vị thế: " +
            (error.response?.data?.message || error.message),
          "error"
        );
      }
    }
    setCloseAllDialogOpen(false);
  };

  const handleClosePosition = async (symbol, side, percent) => {
    try {
      const position = positions.find(
        (p) => p.symbol === symbol && p.positionSide === side
      );
      if (!position) {
        throw new Error("Position not found");
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/position/close`,
        {
          user: position.user,
          symbol: symbol,
          side: side,
          percent: percent,
        }
      );

      showSnackbar("Đóng position thành công");

      // Refresh positions sau khi đóng
      socket.emit("refreshPosition");
    } catch (error) {
      showSnackbar(
        "Lỗi khi đóng position: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
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

  const handleRowClick = (position) => {
    setSelectedPosition(position);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPosition(null);
  };

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
        <FilterAutocomplete
          field="user"
          label="Account"
          values={uniqueValues.user}
          selectedValues={filters.user}
          onFilterChange={handleFilterChange}
        />
        <FilterAutocomplete
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
        <Button
          variant="contained"
          color="error"
          startIcon={<CloseIcon />}
          onClick={() => setCloseAllDialogOpen(true)}
        >
          Close All
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
              <TableRow
                key={index}
                onClick={() => handleRowClick(position)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
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
                  <Box sx={{ width: 150, px: 2 }}>
                    <Slider
                      value={closePercents[position.symbol] || 100}
                      onChange={(e, newValue) =>
                        handleClosePercentChange(position.symbol, newValue)
                      }
                      min={1}
                      max={100}
                      valueLabelDisplay="auto"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<CloseIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePosition(
                          position.symbol,
                          position.positionSide,
                          closePercents[position.symbol] || 100
                        );
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<UpdateIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePosition(position);
                      }}
                    >
                      Update
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelAllOrders(
                          position.symbol,
                          position.positionSide
                        );
                      }}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            whiteSpace: "pre-line",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <PositionDetailDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        position={selectedPosition}
        onCancelOrder={handleCancelAllOrders}
      />

      {/* Close All Confirmation Dialog */}
      <Dialog
        open={closeAllDialogOpen}
        onClose={() => setCloseAllDialogOpen(false)}
      >
        <DialogTitle>Xác nhận đóng tất cả vị thế</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn đóng tất cả vị thế đang mở không?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseAllDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleCloseAllPositions} color="error">
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PositionsTab;
