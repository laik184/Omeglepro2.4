export function skipOrNew(
  isConnected,
  socket,
  setMessages,
  setIsSearching,
  setIsConnected,
  setStrangerTyping
) {
  if (isConnected && socket) {
    socket.emit('skip-stranger');
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
    setStrangerTyping(false);
  } else {
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
    setStrangerTyping(false);
    if (socket) {
      socket.emit('start-matching');
    }
  }
}
