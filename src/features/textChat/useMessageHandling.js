export function createMessageHandlers(socketRef, isConnected, setMessages) {
  const handleSendMessage = (message) => {
    if (message.trim() && isConnected && socketRef.current) {
      const messageId = Date.now();
      setMessages(prev => [...prev, { 
        text: message, 
        sender: 'you', 
        id: messageId, 
        delivered: false 
      }]);
      socketRef.current.emit('send-message', { message, messageId });
      socketRef.current.emit('stop-typing');
      return true;
    }
    return false;
  };

  return { handleSendMessage };
}
