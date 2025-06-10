// Validate order type và các trường liên quan
export const validateOrder = (newOrder, position) => {
  const errors = [];

  // Validate orderType và type
  if (
    newOrder.orderType === "OPEN" &&
    (newOrder.type === "TAKE_PROFIT" || newOrder.type === "TAKE_PROFIT_MARKET")
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

  if (position) {
    const sign = position.positionSide === "LONG" ? 1 : -1;
    let signString = sign === 1 ? "lớn hơn" : "nhỏ hơn";
    if (newOrder.orderType === "CLOSE") {
      if (newOrder.type === "STOP_MARKET" || newOrder.type === "STOP") {
        signString = sign === 1 ? "nhỏ hơn" : "lớn hơn";
        if (sign * newOrder.stopPrice > sign * position.markPrice) {
          errors.push(
            `Giá dừng phải ${signString} giá hiện tại ${position.markPrice}`
          );
        }
      }
      if (
        newOrder.type === "TAKE_PROFIT" ||
        newOrder.type === "TAKE_PROFIT_MARKET"
      ) {
        if (sign * newOrder.stopPrice < sign * position.markPrice) {
          errors.push(
            `Giá take profit phải ${signString} giá hiện tại ${position.markPrice}`
          );
        }
      }
    }
  }

  return errors;
};

// Tính toán side dựa trên orderType và positionSide
export const calculateSide = (orderType, positionSide) => {
  if (orderType === "OPEN") {
    return positionSide === "LONG" ? "BUY" : "SELL";
  } else {
    return positionSide === "LONG" ? "SELL" : "BUY";
  }
};

// Tính toán quantity dựa trên phần trăm
export const calculateQuantity = (percent, positionAmt) => {
  if (!positionAmt) return "0";
  const amount = Math.abs(positionAmt);
  return ((amount * percent) / 100).toFixed(3);
};

// Lấy danh sách order type options dựa trên orderType
export const getOrderTypeOptions = (orderType) => {
  const baseTypes = [
    { value: "LIMIT", label: "LIMIT" },
    { value: "MARKET", label: "MARKET" },
    { value: "STOP", label: "STOP" },
    { value: "STOP_MARKET", label: "STOP_MARKET" },
  ];

  if (orderType === "CLOSE") {
    return [
      ...baseTypes,
      { value: "TAKE_PROFIT", label: "TAKE_PROFIT" },
      { value: "TAKE_PROFIT_MARKET", label: "TAKE_PROFIT_MARKET" },
    ];
  }

  return baseTypes;
};

// Format order data trước khi gửi lên server
export const formatOrderData = (orderData) => {
  const formattedData = {
    ...orderData,
    quantity: Number(orderData.quantity),
  };

  // Xử lý price
  if (
    ["MARKET", "STOP_MARKET", "TAKE_PROFIT_MARKET"].includes(orderData.type)
  ) {
    delete formattedData.price;
  } else {
    formattedData.price = orderData.price ? Number(orderData.price) : "";
  }

  // Xử lý stopPrice
  if (
    !["STOP", "STOP_MARKET", "TAKE_PROFIT", "TAKE_PROFIT_MARKET"].includes(
      orderData.type
    )
  ) {
    delete formattedData.stopPrice;
  } else {
    formattedData.stopPrice = orderData.stopPrice
      ? Number(orderData.stopPrice)
      : "";
  }

  return formattedData;
};

export const calculateOrderVolume = (order) => {
  const price = parseFloat(order.price) || parseFloat(order.stopPrice);
  const quantity = order.origQty
    ? parseFloat(order.origQty)
    : parseFloat(order.positionAmt);
  return Math.floor(quantity * price);
};
