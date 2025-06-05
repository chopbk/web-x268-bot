import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";

const PositionDetailDialog = ({ open, onClose, position, onCancelOrder }) => {
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const calculateQuantity = (percent) => {
    if (!position) return "0";
    const amount = Math.abs(position.positionAmt);
    return ((amount * percent) / 100).toFixed(3);
  };
  const [newOrder, setNewOrder] = useState({
    orderType: "CLOSE",
    type: "LIMIT",
    quantity: "0",
    price: "",
    stopPrice: "",
  });

  useEffect(() => {
    if (open && position) {
      fetchOrders();
      fetchOrderHistory();
    }
  }, [open, position]);

  useEffect(() => {
    if (position) {
      setNewOrder((prev) => ({
        ...prev,
        quantity: calculateQuantity(100),
      }));
    }
  }, [position]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/order`,
        {
          params: {
            user: position.user,
            symbol: position.symbol,
            side: position.positionSide,
          },
        }
      );
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/order/history`,
        {
          params: {
            user: position.user,
            symbol: position.symbol,
            side: position.positionSide,
          },
        }
      );
      console.log(response.data.data);
      if (response.data.success) {
        setOrderHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
    } finally {
      setLoadingHistory(false);
    }
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
  const handleCancelOrder = async (order) => {
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/order/${order.orderId}`,
        {
          params: {
            user: position.user,
            symbol: position.symbol,
          },
        }
      );

      if (response.data.success) {
        showSnackbar(
          `${position.user}  Hủy order ${order.orderId} ${order.origType} ${position.positionSide}  ${position.symbol}  thành công`,
          "success"
        );
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      showSnackbar(
        `${position.user} ${position.symbol} ${position.positionSide} Cancel order ${order.orderId} ${order.origType} ` +
          (error.response?.data?.message || error.message),
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
          user: position.user,
          symbol: position.symbol,
          orderIds: orderIds,
        }
      );

      if (response.data.code === "PARTIAL_SUCCESS") {
        const { success, failed } = response.data.data;

        const messages = [];

        if (success.length > 0) {
          messages.push(
            ` ${position.user} ${position.symbol} ${position.positionSide} Hủy thành công ${success.length} orders`
          );
        }

        failed.forEach((order) => {
          messages.push(
            `${position.user} ${position.symbol} ${position.positionSide} Cancel all orders: ${order.error}`
          );
        });

        showSnackbar(messages.join("\n"), "warning");
      } else {
        showSnackbar(
          `${position.user} Hủy orders ${position.symbol} ${position.positionSide} thành công`,
          "success"
        );
      }

      await fetchOrders();
    } catch (error) {
      console.error("Error canceling all orders:", error);

      if (error.response?.data?.code === "PARTIAL_SUCCESS") {
        const { success, failed } = error.response.data.data;

        const messages = [];

        if (success.length > 0) {
          messages.push(
            `${position.user} Hủy ${success.length} orders ${position.symbol} ${position.positionSide} thành công`
          );
        }

        failed.forEach((order) => {
          messages.push(
            `${position.user} ${position.symbol} ${position.positionSide} Cancel all orders: ${order.error}`
          );
        });

        showSnackbar(messages.join("\n"), "warning");
      } else {
        showSnackbar(
          `${position.user} ${position.symbol} ${position.positionSide} Cancel all orders: ` +
            (error.response?.data?.message || error.message),
          "error"
        );
      }
    }
  };

  const calculateSide = () => {
    if (newOrder.orderType === "OPEN") {
      return position.positionSide === "LONG" ? "BUY" : "SELL";
    } else {
      return position.positionSide === "LONG" ? "SELL" : "BUY";
    }
  };

  const handleQuantityChange = (value) => {
    if (value.includes("%")) {
      const percent = parseInt(value);
      setNewOrder((prev) => ({
        ...prev,
        quantity: calculateQuantity(percent),
      }));
    } else {
      setNewOrder((prev) => ({
        ...prev,
        quantity: value,
      }));
    }
  };

  // Validate order type và các trường liên quan
  const validateOrder = () => {
    const errors = [];

    // Validate orderType và type
    if (
      newOrder.orderType === "OPEN" &&
      (newOrder.type === "TAKE_PROFIT" ||
        newOrder.type === "TAKE_PROFIT_MARKET")
    ) {
      errors.push("Không thể tạo TAKE_PROFIT order khi mở vị thế mới");
    }

    // Validate quantity
    if (
      newOrder.type !== "TAKE_PROFIT_MARKET" &&
      newOrder.type !== "STOP_MARKET" &&
      (!newOrder.quantity || Number(newOrder.quantity) <= 0)
    ) {
      errors.push("Vui lòng nhập số lượng");
    }

    // Validate price
    if (
      newOrder.type !== "MARKET" &&
      newOrder.type !== "STOP_MARKET" &&
      newOrder.type !== "TAKE_PROFIT_MARKET" &&
      (!newOrder.price || Number(newOrder.price) <= 0)
    ) {
      errors.push("Vui lòng nhập giá");
    }

    // Validate stopPrice
    if (
      (newOrder.type === "STOP_MARKET" ||
        newOrder.type === "STOP" ||
        newOrder.type === "TAKE_PROFIT" ||
        newOrder.type === "TAKE_PROFIT_MARKET") &&
      (!newOrder.stopPrice || Number(newOrder.stopPrice) <= 0)
    ) {
      errors.push("Vui lòng nhập giá dừng");
    }

    return errors;
  };

  const handleCreateOrder = async () => {
    try {
      // Validate trước khi gửi
      const errors = validateOrder();
      if (errors.length > 0) {
        showSnackbar(errors.join("\n"), "error");
        return;
      }

      // Chuyển đổi quantity và price từ string sang number
      const orderData = {
        user: position.user,
        symbol: position.symbol,
        positionSide: position.positionSide,
        side: calculateSide(),
        ...newOrder,
        quantity: Number(newOrder.quantity),
        price: newOrder.price ? Number(newOrder.price) : 0,
        stopPrice: newOrder.stopPrice ? Number(newOrder.stopPrice) : 0,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/order`,
        orderData
      );

      if (response.data.success) {
        showSnackbar(
          `${position.user} Tạo order ${newOrder.type} ${calculateSide()} ${
            position.symbol
          } thành công`,
          "success"
        );
        // Reset form với quantity mặc định là 100%
        setNewOrder({
          orderType: "CLOSE",
          type: "LIMIT",
          quantity: calculateQuantity(100),
          price: "",
          stopPrice: "",
        });
        // Refresh orders list
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error creating order:", error);
      showSnackbar(
        `${position.user} ${position.symbol} ${position.positionSide} Create order: ` +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  // Cập nhật lại các options của type dựa trên orderType
  const getOrderTypeOptions = () => {
    const baseTypes = [
      { value: "LIMIT", label: "LIMIT" },
      { value: "MARKET", label: "MARKET" },
      { value: "STOP", label: "STOP" },
      { value: "STOP_MARKET", label: "STOP_MARKET" },
    ];

    if (newOrder.orderType === "CLOSE") {
      return [
        ...baseTypes,
        { value: "TAKE_PROFIT", label: "TAKE_PROFIT" },
        { value: "TAKE_PROFIT_MARKET", label: "TAKE_PROFIT_MARKET" },
      ];
    }

    return baseTypes;
  };

  const handleInputChange = (field) => (event) => {
    setNewOrder((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  if (!position) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chi tiết vị thế - {position.symbol}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Thông tin vị thế
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Account:</Typography>
                <Typography>{position.user}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Position Side:</Typography>
                <Typography
                  color={position.positionSide === "LONG" ? "green" : "red"}
                >
                  {position.positionSide}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Leverage:</Typography>
                <Typography>{position.leverage}x</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Entry Price:</Typography>
                <Typography>{position.entryPrice}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Mark Price:</Typography>
                <Typography>{position.markPrice}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Liquidation Price:</Typography>
                <Typography>{position.liquidationPrice}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">ROI:</Typography>
                <Typography color={position.roi >= 0 ? "green" : "red"}>
                  {position.roi.toFixed(2)}%
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">PNL:</Typography>
                <Typography
                  color={position.unRealizedProfit >= 0 ? "green" : "red"}
                >
                  {position.unRealizedProfit.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Volume:</Typography>
                <Typography>{position.volume}</Typography>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={14}>
            <Typography variant="h6" gutterBottom>
              Tạo Order Mới
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={newOrder.orderType}
                    onChange={handleInputChange("orderType")}
                    label="Order"
                  >
                    <MenuItem value="OPEN">Open</MenuItem>
                    <MenuItem value="CLOSE">Close</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newOrder.type}
                    onChange={handleInputChange("type")}
                    label="Type"
                  >
                    {getOrderTypeOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quantity</InputLabel>
                  <Select
                    value={newOrder.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    label="Quantity"
                  >
                    <MenuItem value={calculateQuantity(100)}>100%</MenuItem>
                    <MenuItem value={calculateQuantity(75)}>75%</MenuItem>
                    <MenuItem value={calculateQuantity(50)}>50%</MenuItem>
                    <MenuItem value={calculateQuantity(25)}>25%</MenuItem>
                    <MenuItem value={calculateQuantity(10)}>10%</MenuItem>
                    <MenuItem value="">
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Custom"
                        value={newOrder.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Price"
                  type="number"
                  value={newOrder.price}
                  onChange={handleInputChange("price")}
                  disabled={
                    newOrder.type === "MARKET" ||
                    newOrder.type === "STOP_MARKET" ||
                    newOrder.type === "TAKE_PROFIT_MARKET"
                  }
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Stop Price"
                  type="number"
                  value={newOrder.stopPrice}
                  onChange={handleInputChange("stopPrice")}
                  disabled={
                    ![
                      "STOP",
                      "STOP_MARKET",
                      "TAKE_PROFIT",
                      "TAKE_PROFIT_MARKET",
                    ].includes(newOrder.type)
                  }
                />
              </Grid>
              <Grid item xs={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateOrder}
                  fullWidth
                >
                  Create
                </Button>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Danh sách Orders</Typography>
              {orders.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleCancelAllOrders}
                >
                  Cancel All Orders
                </Button>
              )}
            </Box>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>OrderId</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Side</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Stop Price</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell>{order.orderId}</TableCell>
                        <TableCell>{order.origType}</TableCell>
                        <TableCell>{order.side}</TableCell>
                        <TableCell>{order.price}</TableCell>
                        <TableCell>{order.stopPrice}</TableCell>
                        <TableCell>{order.origQty}</TableCell>
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
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Lịch sử Orders
            </Typography>
            {loadingHistory ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>OrderId</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Side</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Stop Price</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderHistory.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell>{order.orderId}</TableCell>
                        <TableCell>{order.origType}</TableCell>
                        <TableCell>{order.side}</TableCell>
                        <TableCell>{order.price}</TableCell>
                        <TableCell>{order.stopPrice}</TableCell>
                        <TableCell>{order.origQty}</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell>
                          {new Date(order.time).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
      </DialogContent>
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
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PositionDetailDialog;
