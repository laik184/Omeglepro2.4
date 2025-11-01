// ✅ peerConnectionManager.js — Fixed & Stable Version
import SimplePeer from "simple-peer";

// Peer reference (so other modules can access/close it)
let peerRef = null;
let connectionTimeoutRef = null;

/**
 * Create a new WebRTC peer connection using SimplePeer
 * @param {Object} params - Connection setup parameters
 * @param {Object} params.socket - active Socket.IO instance
 * @param {string} params.strangerId - ID of the remote peer
 * @param {MediaStream} params.localStream - User's camera/mic stream
 * @param {Object} params.remoteVideoRef - React ref for stranger's video element
 * @param {Function} params.onConnected - callback on successful connection
 * @param {Function} params.onDisconnected - callback on disconnect
 * @param {number} [params.retryCount=0] - for retry logic
 */
export function createPeerConnectionManager({
  socket,
  strangerId,
  localStream,
  remoteVideoRef,
  onConnected,
  onDisconnected,
  retryCount = 0,
}) {
  console.log("[WebRTC] Creating peer connection...");

  // Determine initiator (simple fallback logic)
  const isInitiator = socket.id > strangerId;

  // TURN / STUN configuration
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "turn:global.turn.metered.ca:80", username: "demo", credential: "demo" },
  ];

  // Create peer instance
  peerRef = new SimplePeer({
    initiator: isInitiator,
    trickle: true,
    stream: localStream,
    config: { iceServers },
  });

  // Send offer/answer/candidate to backend
  peerRef.on("signal", (signal) => {
    socket.emit("webrtc-signal", { target: strangerId, signal });
  });

  // Remote stream received
  peerRef.on("stream", (remoteStream) => {
    console.log("[WebRTC] Remote stream received");
    if (remoteVideoRef?.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    clearTimeout(connectionTimeoutRef);
    onConnected?.();
  });

  // Connection established
  peerRef.on("connect", () => {
    console.log("[WebRTC] Peer connection established");
    clearTimeout(connectionTimeoutRef);
    onConnected?.();
  });

  // Handle peer close / disconnect
  peerRef.on("close", () => {
    console.warn("[WebRTC] Peer connection closed");
    cleanupPeer();
    onDisconnected?.();
  });

  // Handle errors
  peerRef.on("error", (err) => {
    console.error("[WebRTC] Error:", err.message);
    cleanupPeer();
    if (retryCount < 2) {
      console.log("[WebRTC] Retrying connection...");
      setTimeout(() => {
        createPeerConnectionManager({
          socket,
          strangerId,
          localStream,
          remoteVideoRef,
          onConnected,
          onDisconnected,
          retryCount: retryCount + 1,
        });
      }, 1500);
    } else {
      console.error("[WebRTC] Max retry reached. Closing peer.");
      onDisconnected?.();
    }
  });

  // Connection timeout fallback
  connectionTimeoutRef = setTimeout(() => {
    if (!peerRef.connected) {
      console.warn("[WebRTC] Connection timeout. Closing peer.");
      cleanupPeer();
      onDisconnected?.();
    }
  }, 15000);
}

// Handle incoming signal from socket
export function handleIncomingSignal(signalData) {
  if (peerRef) {
    try {
      peerRef.signal(signalData.signal);
    } catch (err) {
      console.error("[WebRTC] Signal error:", err);
    }
  }
}

// Cleanup peer connection safely
export function cleanupPeer() {
  if (peerRef) {
    try {
      peerRef.destroy();
      peerRef = null;
      console.log("[WebRTC] Peer destroyed");
    } catch (err) {
      console.warn("[WebRTC] Cleanup error:", err);
    }
  }
  clearTimeout(connectionTimeoutRef);
}
