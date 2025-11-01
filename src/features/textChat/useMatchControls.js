// ✅ useMatchControls.js — Final Optimized Version
export function createMatchControls(
  socketRef,
  isConnected,
  isSearching,
  setMessages,
  setIsSearching,
  setIsConnected,
  setStrangerTyping,
  roomType = "text",
  onReset = null // optional cleanup callback (for camera/audio reset etc.)
) {
  let cooldown = false;

  const handleNewOrSkip = () => {
    try {
      if (!socketRef?.current) {
        console.warn("[Match] Socket not initialized.");
        return;
      }

      // ⏱️ Prevent button spam
      if (cooldown) {
        console.log("[Match] Please wait before next action...");
        return;
      }
      cooldown = true;
      setTimeout(() => (cooldown = false), 1500);

      // 🧹 Reset UI State
      setMessages([]);
      setIsConnected(false);
      setStrangerTyping(false);

      // 🚀 Case 1: Skip Current Stranger
      if (isConnected) {
        socketRef.current.emit("skip-stranger", { roomType });
        setIsSearching(true);
        console.log("[Match] Skipped current stranger. Searching new...");
      }
      // ⏹️ Case 2: Stop Searching
      else if (isSearching) {
        socketRef.current.emit("leave-room", roomType);
        setIsSearching(false);
        console.log("[Match] Stopped searching for partner.");
      }
      // 🔁 Case 3: Start New Search
      else {
        setIsSearching(true);
        socketRef.current.emit("start-matching", { roomType });
        console.log("[Match] Started searching for a new stranger...");
      }

      // 🧩 Optional Reset Hook
      if (typeof onReset === "function") onReset();
    } catch (error) {
      console.error("[Match] Error handling new/skip:", error);
    }
  };

  return { handleNewOrSkip };
}
