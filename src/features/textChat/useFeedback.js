// ✅ useMatchControls.js — Final Stable Version
export function createMatchControls(
  socketRef,
  isConnected,
  isSearching,
  setMessages,
  setIsSearching,
  setIsConnected,
  setStrangerTyping,
  roomType = "text",
  onReset = null
) {
  let isCooldown = false;

  const handleNewOrSkip = () => {
    try {
      if (!socketRef?.current) {
        console.warn("[Match] Socket not ready");
        return;
      }

      // ⏱️ Prevent multiple clicks
      if (isCooldown) {
        console.log("[Match] Please wait...");
        return;
      }
      isCooldown = true;
      setTimeout(() => (isCooldown = false), 1500);

      // 🧹 Reset UI state
      setMessages([]);
      setIsConnected(false);
      setStrangerTyping(false);

      // 🔁 CASE 1: Connected → Skip current stranger
      if (isConnected) {
        socketRef.current.emit("skip-stranger", { roomType });
        setIsSearching(true);
        console.log("[Match] Skipped stranger, searching new...");
      }
      // 🚫 CASE 2: Already searching → Stop search
      else if (isSearching) {
        socketRef.current.emit("leave-room", roomType);
        setIsSearching(false);
        console.log("[Match] Stopped searching for partner.");
      }
      // 🚀 CASE 3: Idle → Start new search
      else {
        setIsSearching(true);
        socketRef.current.emit("start-matching", { roomType });
        console.log("[Match] Started searching for new stranger...");
      }

      // 🧩 Optional reset callback
      if (typeof onReset === "function") onReset();
    } catch (err) {
      console.error("[Match] Error in handleNewOrSkip:", err);
    }
  };

  return { handleNewOrSkip };
}
