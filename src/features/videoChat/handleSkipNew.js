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
  setModerationWarning
) {
  if (qualityManagerRef.current) {
    qualityManagerRef.current.stopMonitoring();
  }
  if (videoModeratorRef.current) {
    videoModeratorRef.current.stopMonitoring();
    setModerationWarning(null);
  }

  setIsTyping(false);
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }

  if (isConnected && socketRef.current) {
    socketRef.current.emit('skip-stranger');
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
  } else if (isSearching && socketRef.current) {
    socketRef.current.emit('leave-room', 'video');
    setIsSearching(false);
    console.log('Stopped searching for partner');
  } else {
    setMessages([]);
    setIsSearching(true);
    setIsConnected(false);
    if (socketRef.current) {
      socketRef.current.emit('start-matching');
    }
  }
}
