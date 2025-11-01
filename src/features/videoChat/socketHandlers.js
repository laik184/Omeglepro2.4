// ✅ socketHandlers.js — Fixed & Optimized for Stable WebRTC Signaling
import { io } from "socket.io-client";
import {
  createPeerConnectionManager,
  handleIncomingSignal,
  cleanupPeer,
} from "./peerConnectionManager";

// Keep socket reference for cleanup
let socket = null;

/**
 * Initialize socket connection & setup all listeners
 * @param {Object} params - Connection parameters
 * @param {Object} params.streamRef - Local media stream ref
 * @param {Object} params.remoteVideoRef - Stranger video ref
 * @param {Function} params.onConnected - Callback when connected
 * @param {Function} params.onDisconnected - Callback when disconnected
 * @param {Function} params.onMatched - Called when stranger found
 */
export function setupSocketConnection({
  streamRef,
  remoteVideoRef,
  onConnected,
  onDisconnected,
  onMatched,
}) {
  console.log("[Socket] Connecting…");

  // ✅ Use .env variable or fallback to localhost:3001
  const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

  const socketConfig = {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    timeout: 10000,
  };

  socket = io(SOCKET_URL, socketConfig);

  // 🔌 When connected to server
  socket.on("connect", () => {
    console.log("[Socket] Connected → ID:", socket.id);
    socket.emit("join-room", "video");
  });

  // 🎯 When matched with a stranger
  socket.on("matched", ({ strangerId }) => {
    console.log("[Socket] Matched with:", strangerId);

    // Start WebRTC peer
    createPeerConnectionManager({
      socket,
      strangerId,
      localStream: streamRef.current,
      remoteVideoRef,
      onConnected,
      onDisconnected,
    });

    onMatched?.(strangerId);
  });

  // 📡 Receive signaling data (offer/answer/ICE)
  socket.on("webrtc-signal", (data) => {
    handleIncomingSignal(data);
  });

  // ⚠️ Stranger disconnected
  socket.on("stranger-disconnected", () => {
    console.warn("[Socket] Stranger disconnected");
    cleanupPeer();
    onDisconnected?.();
  });

  // ❌ Errors
  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  socket.on("error", (err) => {
    console.error("[Socket] General error:", err.message);
  });

  // 🧹 When socket disconnects (network or manual)
  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason);
    cleanupPeer();
    onDisconnected?.();
  });
}

/** Disconnect & cleanup everything */
export function cleanupSocket() {
  if (socket) {
    console.log("[Socket] Cleaning up connection…");
    cleanupPeer();
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
