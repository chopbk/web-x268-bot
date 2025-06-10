import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  TableSortLabel,
} from "@mui/material";
import axios from "axios";
import OrderForm from "../components/OrderForm";
import { calculateOrderVolume } from "../utils/orderUtils";
import { useSnackbar } from "../utils/snackbarUtils";

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { snackbar, handleCloseSnackbar, showSnackbar } = useSnackbar();

  // Filter states
  const [filters, setFilters] = useState({
    user: [],
    symbol: [],
    side: "",
    type: "",
    volume: "",
  });

  // Unique values for autocomplete
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [uniqueSymbols, setUniqueSymbols] = useState([]);

  // New order state
  const [newOrder, setNewOrder] = useState({
    orderType: "OPEN",
    type: "LIMIT",
    quantity: "0",
    price: "",
    stopPrice: "",
  });

  // Thêm state cho sắp xếp
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update unique values when orders change
  useEffect(() => {
    if (orders.length > 0) {
      const users = [...new Set(orders.map((order) => order.user))];
      const symbols = [...new Set(orders.map((order) => order.symbol))];
      setUniqueUsers(users);
      setUniqueSymbols(symbols);
    }
  }, [orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/order/all`
      );
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      showSnackbar(
        "Error fetching orders: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCreateOrder = async (orderData) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/order`,
        orderData
      );

      if (response.data.success) {
        showSnackbar(
          `${orderData.user} Tạo order ${orderData.type} ${orderData.side} ${orderData.symbol} thành công`,
          "success"
        );
        // Reset form
        setNewOrder({
          orderType: "OPEN",
          type: "LIMIT",
          quantity: "0",
          price: "",
          stopPrice: "",
        });
        // Refresh orders list
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error creating order:", error);
      showSnackbar(
        `Create order: ` + (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  const handleCancelOrder = async (order) => {
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/order/${order.orderId}`,
        {
          params: {
            user: order.user,
            symbol: order.symbol,
          },
        }
      );

      if (response.data.success) {
        showSnackbar(
          `${order.user} Hủy order ${order.orderId} ${order.origType} ${order.positionSide} ${order.symbol} thành công`,
          "success"
        );
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      showSnackbar(
        `Cancel order: ` + (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  const handleCancelAllOrders = async () => {
    try {
      const orderIds = orders.map((order) => order.orderId);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/order/cancel-all`,
        {
          user: filters.user,
          symbol: filters.symbol,
          orderIds: orderIds,
        }
      );

      if (response.data.code === "PARTIAL_SUCCESS") {
        const { success, failed } = response.data.data;
        const messages = [];

        if (success.length > 0) {
          messages.push(`Hủy thành công ${success.length} orders`);
        }

        failed.forEach((order) => {
          messages.push(`Cancel all orders: ${order.error}`);
        });

        showSnackbar(messages.join("\n"), "warning");
      } else {
        showSnackbar("Hủy orders thành công", "success");
      }

      await fetchOrders();
    } catch (error) {
      console.error("Error canceling all orders:", error);
      showSnackbar(
        `Cancel all orders: ` +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  // Filter orders based on filters
  const filteredOrders = orders.filter((order) => {
    return (
      (filters.user.length === 0 || filters.user.includes(order.user)) &&
      (filters.symbol.length === 0 || filters.symbol.includes(order.symbol)) &&
      (!filters.side || order.positionSide === filters.side) &&
      (!filters.type || order.origType === filters.type) &&
      (!filters.volume || order.origQty >= Number(filters.volume))
    );
  });

  // Xử lý thay đổi volume trong form tạo order mới
  const handleVolumeChange = (e) => {
    const volume = e.target.value;
    const price = newOrder.price || newOrder.stopPrice;
    if (volume && price) {
      const quantity = (volume / price).toFixed(4);
      setNewOrder((prev) => ({
        ...prev,
        volume,
        quantity,
      }));
    }
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    let price = newOrder.price || newOrder.stopPrice;
    setNewOrder((prev) => ({
      ...prev,
      quantity: value,
      volume: (value * price).toFixed(2),
    }));
  };

  // Hàm xử lý sắp xếp
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sắp xếp orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!orderBy) return 0;

    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // Xử lý các trường số
    if (
      orderBy === "price" ||
      orderBy === "stopPrice" ||
      orderBy === "origQty" ||
      orderBy === "time"
    ) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // Xử lý trường time
    if (orderBy === "time") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Xử lý trường volume
    if (orderBy === "volume") {
      aValue = parseFloat(calculateOrderVolume(a)) || 0;
      bValue = parseFloat(calculateOrderVolume(b)) || 0;
    }

    // Xử lý các trường text
    if (typeof aValue === "string" && typeof bValue === "string") {
      return order === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Xử lý các trường số
    if (aValue < bValue) {
      return order === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === "asc" ? 1 : -1;
    }
    return 0;
  });

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Orders
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={2}>
              <Autocomplete
                multiple
                size="small"
                options={uniqueUsers}
                value={filters.user}
                onChange={(event, newValue) => {
                  setFilters((prev) => ({
                    ...prev,
                    user: newValue,
                  }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="User" fullWidth />
                )}
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
                sx={{
                  "& .MuiAutocomplete-tag": {
                    maxWidth: "100px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            </Grid>
            <Grid item xs={2}>
              <Autocomplete
                multiple
                size="small"
                options={uniqueSymbols}
                value={filters.symbol}
                onChange={(event, newValue) => {
                  setFilters((prev) => ({
                    ...prev,
                    symbol: newValue,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Symbol"
                    fullWidth
                    sx={{ minWidth: "100px" }}
                  />
                )}
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
                sx={{
                  "& .MuiAutocomplete-tag": {
                    maxWidth: "100px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            </Grid>
            <Grid item xs={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Side</InputLabel>
                <Select
                  value={filters.side}
                  onChange={handleFilterChange("side")}
                  label="Side"
                  displayEmpty
                  sx={{ minWidth: "100px" }}
                >
                  <MenuItem value=""></MenuItem>
                  <MenuItem value="LONG">LONG</MenuItem>
                  <MenuItem value="SHORT">SHORT</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={handleFilterChange("type")}
                  label="Type"
                  displayEmpty
                  sx={{ minWidth: "100px" }}
                >
                  <MenuItem value=""></MenuItem>
                  <MenuItem value="LIMIT">LIMIT</MenuItem>
                  <MenuItem value="MARKET">MARKET</MenuItem>
                  <MenuItem value="STOP">STOP</MenuItem>
                  <MenuItem value="STOP_MARKET">STOP_MARKET</MenuItem>
                  <MenuItem value="TAKE_PROFIT">TAKE_PROFIT</MenuItem>
                  <MenuItem value="TAKE_PROFIT_MARKET">
                    TAKE_PROFIT_MARKET
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth
                size="small"
                label="Volume"
                type="number"
                value={filters.volume}
                onChange={handleFilterChange("volume")}
              />
            </Grid>
            <Grid item xs={2}>
              <Button
                variant="contained"
                color="error"
                onClick={handleCancelAllOrders}
                fullWidth
              >
                Cancel All Orders
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* New Order Form */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tạo Order Mới
          </Typography>
          <OrderForm
            position={null}
            newOrder={newOrder}
            setNewOrder={setNewOrder}
            handleCreateOrder={handleCreateOrder}
            showSnackbar={showSnackbar}
            handleVolumeChange={handleVolumeChange}
            handleQuantityChange={handleQuantityChange}
            users={uniqueUsers}
            symbols={uniqueSymbols}
          />
        </Paper>

        {/* Orders Table */}
        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "user"}
                        direction={orderBy === "user" ? order : "asc"}
                        onClick={() => handleSort("user")}
                      >
                        User
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "symbol"}
                        direction={orderBy === "symbol" ? order : "asc"}
                        onClick={() => handleSort("symbol")}
                      >
                        Symbol
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "origType"}
                        direction={orderBy === "origType" ? order : "asc"}
                        onClick={() => handleSort("origType")}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "side"}
                        direction={orderBy === "side" ? order : "asc"}
                        onClick={() => handleSort("side")}
                      >
                        Side
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "positionSide"}
                        direction={orderBy === "positionSide" ? order : "asc"}
                        onClick={() => handleSort("positionSide")}
                      >
                        Position Side
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "price"}
                        direction={orderBy === "price" ? order : "asc"}
                        onClick={() => handleSort("price")}
                      >
                        Price
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "stopPrice"}
                        direction={orderBy === "stopPrice" ? order : "asc"}
                        onClick={() => handleSort("stopPrice")}
                      >
                        Stop Price
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "origQty"}
                        direction={orderBy === "origQty" ? order : "asc"}
                        onClick={() => handleSort("origQty")}
                      >
                        Quantity
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "volume"}
                        direction={orderBy === "volume" ? order : "asc"}
                        onClick={() => handleSort("volume")}
                      >
                        Volume
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "status"}
                        direction={orderBy === "status" ? order : "asc"}
                        onClick={() => handleSort("status")}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "time"}
                        direction={orderBy === "time" ? order : "asc"}
                        onClick={() => handleSort("time")}
                      >
                        Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedOrders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>{order.user}</TableCell>
                      <TableCell>{order.symbol}</TableCell>
                      <TableCell>{order.origType}</TableCell>
                      <TableCell>{order.side}</TableCell>
                      <TableCell>{order.positionSide}</TableCell>
                      <TableCell>{order.price}</TableCell>
                      <TableCell>{order.stopPrice}</TableCell>
                      <TableCell>{order.origQty}</TableCell>
                      <TableCell>{calculateOrderVolume(order)}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>
                        {new Date(order.time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleCancelOrder(order)}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OrderPage;
