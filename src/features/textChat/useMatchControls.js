// ✅ useMatchControls.js — Final Optimized & Safe Version
export function createMatchControls(
  socketRef,
  isConnected,
  isSearching,
  setMessages,
  setIsSearching,
  setIsConnected,
  setStrangerTyping,
  roomType = "text",
  onReset = null // optional cleanup callback
) {
  let cooldown = false;

  const handleNewOrSkip = () => {
    if (!socketRef?.current) {
      console.warn("[Match] Socket not available");
      return;
    }

    // ⏱️ Prevent spam clicks
    if (cooldown) {
      console.log("[Match] Please wait before next action...");
      return;
    }
    cooldown = true;
    setTimeout(() => (cooldown = false), 1500);

    try {
      // 🧹 Reset UI state
      setMessages([]);
      setIsConnected(false);
      setStrangerTyping(false);

      // 🚀 Case 1: Skip current stranger
      if (isConnected) {
        socketRef.current.emit("skip-stranger", { roomType });
        setIsSearching(true);
        console.log("[Match] Skipped current stranger, searching new...");
      }

      // 🧍 Case 2: Stop searching
      else if (isSearching) {
        socketRef.current.emit("leave-room", roomType);
        setIsSearching(false);
        console.log("[Match] Stopped searching for partner.");
      }

      // 🔁 Case 3: Start new search
      else {
        setIsSearching(true);
        socketRef.current.emit("start-matching", { roomType });
        console.log("[Match] Started searching for new stranger...");
      }

      // 🧼 Optional extra reset handler
      if (typeof onReset === "function") onReset();
    } catch (err) {
      console.error("[Match] Error in handleNewOrSkip:", err);
    }
  };

  return { handleNewOrSkip };
}
