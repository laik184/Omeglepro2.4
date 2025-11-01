// ✅ useMessageHandling.js — Optimized & Safe Version
export function createMessageHandlers(socketRef, isConnected, setMessages) {
  const handleSendMessage = (message) => {
    try {
      // Basic validation
      if (!message || !message.trim().length) return false;
      if (!isConnected || !socketRef?.current) {
        console.warn("[Chat] Cannot send message — socket not connected.");
        return false;
      }

      const messageId = Date.now();
      const newMessage = {
        id: messageId,
        text: message.trim(),
        sender: "you",
        delivered: false,
        timestamp: new Date().toISOString(),
      };

      // Update local state instantly (optimistic UI)
      setMessages((prev) => [...prev, newMessage]);

      // Emit message via socket
      socketRef.current.emit("send-message", {
        message: message.trim(),
        messageId,
      });

      // Stop typing indicator
      socketRef.current.emit("stop-typing");
      console.log("[Chat] Sent message:", message.trim());

      return true;
    } catch (err) {
      console.error("[Chat] Error sending message:", err);
      return false;
    }
  };

  const handleTypingStart = () => {
    if (socketRef?.current && isConnected) {
      socketRef.current.emit("typing-start");
    }
  };

  const handleTypingStop = () => {
    if (socketRef?.current && isConnected) {
      socketRef.current.emit("stop-typing");
    }
  };

  return {
    handleSendMessage,
    handleTypingStart,
    handleTypingStop,
  };
}
