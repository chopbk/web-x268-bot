import { useState } from "react";

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

  return {
    snackbar,
    handleCloseSnackbar,
    showSnackbar,
  };
};
