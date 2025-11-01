// ✅ handleMessages.js — Stable + Optimized + Clean Code
export function setupMessageHandlers(
  socketRef,
  isConnected,
  setMessages,
  setMessage,
  typingTimeoutRef
) {
  /**
   * ✍️ User typing event handler
   */
  const handleTyping = (newMessage) => {
    setMessage(newMessage);
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    // Emit "typing" event
    if (newMessage.length > 0) {
      socket.emit("typing");

      // Reset debounce timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && isConnected) {
          socketRef.current.emit("stop-typing");
        }
      }, 1500); // smoother delay
    } else {
      socket.emit("stop-typing");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  /**
   * 💬 Send message event handler
   */
  const handleSendMessage = (message) => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !message.trim()) return;

    // Local optimistic update
    const newMsg = {
      text: message.trim(),
      sender: "you",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);

    // Emit to stranger
    socket.emit("send-message", { message: message.trim() });
    socket.emit("stop-typing");

    // Cleanup typing timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Clear input box
    setMessage("");
  };

  /**
   * ⌨️ Handle Enter key press (send message)
   */
  const handleKeyDown = (e, message) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(message);
    }
  };

  /**
   * 📩 Listen for incoming messages (optional enhancement)
   * Note: Attach inside component useEffect if not already handled in socketHandlers
   */
  const registerReceiveHandler = (setMessages) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("receive-message", (data) => {
      const incomingMsg = {
        text: data.message,
        sender: "stranger",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, incomingMsg]);
    });
  };

  /**
   * 🧹 Optional cleanup helper
   */
  const cleanupMessageHandlers = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.off("receive-message");
      socket.off("typing");
      socket.off("stop-typing");
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  return {
    handleTyping,
    handleSendMessage,
    handleKeyDown,
    registerReceiveHandler,
    cleanupMessageHandlers,
  };
}
