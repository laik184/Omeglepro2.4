// ✅ useTypingIndicator.js — Stable & Optimized Version
import { useEffect, useRef } from "react";

/**
 * Handles typing indicator for chat UI.
 * Emits `typing` and `stop-typing` events with safe timeout cleanup.
 */
export function useTypingIndicator(socketRef, isConnected, eventNames = {}) {
  const typingTimeoutRef = useRef(null);

  // Default event names
  const { typing = "typing", stopTyping = "stop-typing" } = eventNames;

  const handleTypingStart = (hasText) => {
    if (!socketRef?.current || !isConnected) return;

    if (hasText) {
      socketRef.current.emit(typing);
      console.log("[Typing] Started typing...");

      // Reset timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit(stopTyping);
        console.log("[Typing] Stopped typing (timeout)");
      }, 3000);
    } else {
      socketRef.current.emit(stopTyping);
      console.log("[Typing] Stopped typing (empty input)");
    }
  };

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { handleTypingStart, typingTimeoutRef };
}
