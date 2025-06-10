import React from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  InputAdornment,
  Autocomplete,
  Chip,
} from "@mui/material";
import {
  validateOrder,
  calculateSide,
  getOrderTypeOptions,
  formatOrderData,
} from "../utils/orderUtils";

const OrderForm = ({
  newOrder,
  setNewOrder,
  handleCreateOrder,
  showSnackbar,
  handleVolumeChange,
  handleQuantityChange,
  users = [],
  symbols = [],
}) => {
  const handleInputChange = (field) => (event) => {
    setNewOrder((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = validateOrder(newOrder);
    if (errors.length > 0) {
      showSnackbar(errors.join("\n"), "error");
      return;
    }
    const orderData = formatOrderData({
      ...newOrder,
      side: calculateSide(newOrder.orderType, newOrder.positionSide),
      quantity: Number(newOrder.quantity),
      price: newOrder.price ? Number(newOrder.price) : "",
      stopPrice: newOrder.stopPrice ? Number(newOrder.stopPrice) : "",
    });

    handleCreateOrder(orderData);
  };

  const handlePriceChange = (field) => (e) => {
    const newPrice = e.target.value;

    setNewOrder((prev) => {
      const updatedOrder = {
        ...prev,
        [field]: newPrice,
      };

      // Lấy giá trị price mới nhất
      const price =
        field === "price"
          ? newPrice
          : field === "stopPrice"
          ? newPrice
          : prev.price;

      // Nếu có quantity thì tính volume
      if (updatedOrder.quantity) {
        const quantity = Number(updatedOrder.quantity);
        const volume = Math.floor(quantity * price);
        return {
          ...updatedOrder,
          volume,
        };
      }

      // Nếu có volume thì tính quantity
      if (updatedOrder.volume) {
        const volume = Number(updatedOrder.volume);
        const quantity = volume / price;
        return {
          ...updatedOrder,
          quantity,
        };
      }

      return updatedOrder;
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={2}>
          <Autocomplete
            size="small"
            options={users}
            sx={{ minWidth: "100px" }}
            value={newOrder.user || ""}
            onChange={(_, newValue) => {
              setNewOrder((prev) => ({
                ...prev,
                user: newValue,
              }));
            }}
            renderInput={(params) => <TextField {...params} label="User" />}
            freeSolo
            disableClearable
          />
        </Grid>
        <Grid item xs={2}>
          <Autocomplete
            size="small"
            sx={{ minWidth: "200px" }}
            options={symbols}
            value={newOrder.symbol || ""}
            inputValue={newOrder.symbol || ""}
            onInputChange={(_, newInputValue) => {
              setNewOrder((prev) => ({
                ...prev,
                symbol: newInputValue,
              }));
            }}
            onChange={(_, newValue) => {
              setNewOrder((prev) => ({
                ...prev,
                symbol: newValue || "",
              }));
            }}
            renderInput={(params) => <TextField {...params} label="Symbol" />}
            freeSolo
            disableClearable
          />
        </Grid>
        <Grid item xs={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Side</InputLabel>
            <Select
              value={newOrder.positionSide || ""}
              onChange={handleInputChange("positionSide")}
              label="Side"
            >
              <MenuItem value="LONG">Long</MenuItem>
              <MenuItem value="SHORT">Short</MenuItem>
            </Select>
          </FormControl>
        </Grid>
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
              {getOrderTypeOptions(newOrder.orderType).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
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
            onChange={handlePriceChange("price")}
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
            onChange={handlePriceChange("stopPrice")}
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
        <Grid item xs={2}>
          <TextField
            fullWidth
            size="small"
            label="Volume"
            type="number"
            value={newOrder.volume || ""}
            onChange={handleVolumeChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">USDT</InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={2}>
          <TextField
            fullWidth
            size="small"
            label="Quantity"
            type="number"
            value={newOrder.quantity}
            onChange={handleQuantityChange}
          />
        </Grid>
        <Grid item xs={1}>
          <Button variant="contained" color="primary" type="submit" fullWidth>
            Create
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default OrderForm;
