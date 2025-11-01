export function createMatchControls(
  socketRef,
  isConnected,
  isSearching,
  setMessages,
  setIsSearching,
  setIsConnected,
  setStrangerTyping
) {
  const handleNewOrSkip = () => {
    if (isConnected && socketRef.current) {
      socketRef.current.emit('skip-stranger');
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
      setStrangerTyping(false);
    } else if (isSearching && socketRef.current) {
      socketRef.current.emit('leave-room', 'text');
      setIsSearching(false);
      setStrangerTyping(false);
      console.log('Stopped searching for partner');
    } else {
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
      setStrangerTyping(false);
      if (socketRef.current) {
        socketRef.current.emit('start-matching');
      }
    }
  };

  return { handleNewOrSkip };
}
