// ✅ handleSkipNew.js — Final Optimized & Stable Version
export function handleSkipNew(
  isConnected,
  isSearching,
  socketRef,
  qualityManagerRef,
  videoModeratorRef,
  typingTimeoutRef,
  setMessages,
  setIsSearching,
  setIsConnected,
  setIsTyping,
  setModerationWarning,
  peerRef // optional RTCPeerConnection ref
) {
  console.log("[Action] Skip / New chat initiated...");

  // 🧠 Step 1: Stop quality & moderation monitoring
  if (qualityManagerRef?.current) {
    try {
      qualityManagerRef.current.stopMonitoring();
      console.log("[Quality] Monitoring stopped.");
    } catch (e) {
      console.warn("[Quality] Stop monitoring failed:", e);
    }
  }

  if (videoModeratorRef?.current) {
    try {
      videoModeratorRef.current.stopMonitoring();
      setModerationWarning(null);
      console.log("[Moderator] Monitoring stopped.");
    } catch (e) {
      console.warn("[Moderator] Stop monitoring failed:", e);
    }
  }

  // 🧹 Step 2: Reset typing indicators & timeouts
  setIsTyping(false);
  if (typingTimeoutRef?.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }

  // 🎥 Step 3: Close any existing WebRTC peer connection
  if (peerRef?.current) {
    try {
      peerRef.current.getSenders()?.forEach((sender) => sender.track?.stop());
      peerRef.current.close();
      peerRef.current = null;
      console.log("[WebRTC] Peer connection closed cleanly.");
    } catch (err) {
      console.warn("[WebRTC] Peer cleanup failed:", err);
    }
  }

  // 💬 Step 4: Reset message state
  setMessages([]);

  // 🌐 Step 5: Validate socket
  const socket = socketRef?.current;
  if (!socket) {
    console.warn("[Socket] Not connected.");
    return;
  }

  // 🔄 Step 6: Skip or start new logic
  if (isConnected) {
    console.log("[Socket] Skipping current stranger...");
    socket.emit("skip-stranger");

    // Update states
    setIsConnected(false);
    setIsSearching(true);

    // Delay for safe transition
    setTimeout(() => {
      console.log("[Socket] Searching for new partner...");
      socket.emit("start-matching");
    }, 500);

  } else if (isSearching) {
    console.log("[Socket] Cancelling ongoing search...");
    socket.emit("leave-room", "video");
    setIsSearching(false);

  } else {
    console.log("[Socket] Starting new match...");
    setIsSearching(true);
    socket.emit("start-matching");
  }

  // 🧼 Step 7: Clean up old socket listeners (avoid duplicates)
  try {
    ["offer", "answer", "ice-candidate", "receive-message"].forEach((event) => {
      socket.off(event);
    });
  } catch (e) {
    console.warn("[Socket] Cleanup error:", e);
  }

  console.log("[System] Skip/New cycle completed successfully ✅");
}
