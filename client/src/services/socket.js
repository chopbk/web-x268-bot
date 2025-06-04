import { io } from "socket.io-client";

let socket = null;

export const initSocket = () => {
  if (!socket) {
    const SOCKET_URL =
      process.env.REACT_APP_API_URL ||
      window.location.origin.replace("3000", "3001");

    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Xử lý các sự kiện kết nối
    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.log("Socket connection error:", error);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("Socket reconnection attempt:", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.log("Socket reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.log("Socket reconnection failed");
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
