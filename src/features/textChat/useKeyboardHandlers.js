// ✅ useKeyboardHandlers.js — Optimized & Safe Version
export function createKeyboardHandlers(handleSendMessage, isConnected = true) {
  let keyCooldown = false;

  const handleKeyDown = (e) => {
    try {
      // 🚫 Block spam if key is held down
      if (keyCooldown) return;

      // 🧠 Enter key without Shift = Send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        // Only allow send if connected
        if (isConnected) {
          keyCooldown = true;
          handleSendMessage();

          // Reset cooldown after small delay
          setTimeout(() => (keyCooldown = false), 400);
        } else {
          console.warn("[Chat] Not connected — message not sent.");
        }
      }
    } catch (err) {
      console.error("[Keyboard] Error handling Enter key:", err);
    }
  };

  return { handleKeyDown };
}
