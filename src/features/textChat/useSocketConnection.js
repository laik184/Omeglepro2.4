// ✅ useSocketConnection.js — Final Optimized Version (Text Chat)
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocketConnection(callbacks = {}, roomType = "text") {
  const socketRef = useRef(null);

  useEffect(() => {
    // ⚙️ Replace this with your actual backend server URL
    const SERVER_URL = "https://your-server-url.com";

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ✅ Connection Events
    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      socket.emit("join-room", roomType);
      socket.emit("start-matching");
      callbacks.onConnected?.();
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
      callbacks.onDisconnected?.(reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
      callbacks.onConnectError?.(error);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[Socket] Reconnected after ${attempt} attempts`);
      callbacks.onReconnect?.(attempt);
    });

    // ✅ Dynamic Event Registration
    const events = {
      "user-count": "onUserCount",
      searching: "onSearching",
      matched: "onMatched",
      "receive-message": "onReceiveMessage",
      "stranger-typing": "onStrangerTyping",
      "stranger-stop-typing": "onStrangerStopTyping",
      "stranger-disconnected": "onStrangerDisconnected",
      "you-disconnected": "onYouDisconnected",
      blocked: "onBlocked",
      "feedback-received": "onFeedbackReceived",
      "report-success": "onReportSuccess",
      "report-failed": "onReportFailed",
      "message-delivered": "onMessageDelivered",
      "message-rate-limited": "onMessageRateLimited",
      "connection-error": "onConnectionError",
    };

    Object.entries(events).forEach(([event, handler]) => {
      if (callbacks[handler]) {
        socket.on(event, callbacks[handler]);
      }
    });

    // ✅ Cleanup on unmount
    return () => {
      console.log("[Socket] Cleaning up...");
      socket.emit("leave-room", roomType);
      socket.disconnect();
    };
  }, [roomType]);

  return socketRef;
}
