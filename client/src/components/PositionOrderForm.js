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
} from "@mui/material";
import {
  validateOrder,
  calculateSide,
  calculateQuantity,
  getOrderTypeOptions,
  formatOrderData,
} from "../utils/orderUtils";

const PositionOrderForm = ({
  position,
  newOrder,
  setNewOrder,
  handleCreateOrder,
  showSnackbar,
}) => {
  const handleInputChange = (field) => (event) => {
    setNewOrder((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };
  const handleVolumeChange = (e) => {
    const volume = e.target.value;
    const price = newOrder.price || newOrder.stopPrice;
    console.log(volume);
    if (volume && price) {
      const quantity = volume / price;
      setNewOrder((prev) => ({
        ...prev,
        volume,
        quantity,
      }));
    }
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

  const handleQuantityChange = (value) => {
    const price = newOrder.price || newOrder.stopPrice;
    if (value.toString().includes("%")) {
      const percent = parseInt(value);
      const quantity = calculateQuantity(percent, position?.positionAmt);
      setNewOrder((prev) => ({
        ...prev,
        quantity: quantity,
        volume: (quantity * price).toFixed(2),
      }));
    } else {
      setNewOrder((prev) => ({
        ...prev,
        quantity: value,
        volume: (value * price).toFixed(2),
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = validateOrder(newOrder, position);
    if (errors.length > 0) {
      showSnackbar(errors.join("\n"), "error");
      return;
    }

    const orderData = formatOrderData({
      ...newOrder,
      user: position.user,
      symbol: position.symbol,
      positionSide: position.positionSide,
      side: calculateSide(newOrder.orderType, position.positionSide),

      quantity: Number(newOrder.quantity),
      price: newOrder.price ? Number(newOrder.price) : "",
      stopPrice: newOrder.stopPrice ? Number(newOrder.stopPrice) : "",
    });

    handleCreateOrder(orderData);
  };

  return (
    <form onSubmit={handleSubmit}>
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
            onChange={(e) => handleQuantityChange(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Select
                    size="small"
                    value=""
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    sx={{
                      minWidth: "80px",
                      "& .MuiSelect-select": {
                        padding: "4px 8px",
                      },
                    }}
                  >
                    {[400, 300, 200, 100, 75, 50, 25, 10].map((percent) => (
                      <MenuItem
                        key={percent}
                        value={`${calculateQuantity(
                          percent,
                          position?.positionAmt
                        )}`}
                      >
                        {percent}%
                      </MenuItem>
                    ))}
                  </Select>
                </InputAdornment>
              ),
            }}
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

export default PositionOrderForm;
