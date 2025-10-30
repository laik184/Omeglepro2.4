export function skipOrNew(
  isConnected,
  socket,
  setMessages,
  setIsSearching,
  setIsConnected,
  qualityManagerRef,
  videoModeratorRef,
  setModerationWarning
) {
  if (qualityManagerRef?.current) {
    qualityManagerRef.current.stopMonitoring();
  }
  if (videoModeratorRef?.current) {
    videoModeratorRef.current.stopMonitoring();
    if (setModerationWarning) {
      setModerationWarning(null);
    }
  }

  if (isConnected && socket) {
    socket.emit('skip-stranger');
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
  } else {
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
    if (socket) {
      socket.emit('start-matching');
    }
  }
}
