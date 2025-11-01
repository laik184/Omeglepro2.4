export function setupMessageHandlers(
  socketRef,
  isConnected,
  setMessages,
  setMessage,
  typingTimeoutRef
) {
  const handleTyping = (newMessage) => {
    setMessage(newMessage);
    
    if (socketRef.current && isConnected) {
      if (newMessage.length > 0) {
        socketRef.current.emit('typing');
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && isConnected) {
            socketRef.current.emit('stop-typing');
          }
        }, 1000);
      } else {
        socketRef.current.emit('stop-typing');
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };
  
  const handleSendMessage = (message) => {
    if (message.trim() && isConnected && socketRef.current) {
      setMessages(prev => [...prev, { text: message, sender: 'you' }]);
      socketRef.current.emit('send-message', { message });
      socketRef.current.emit('stop-typing');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      setMessage('');
    }
  };

  const handleKeyDown = (e, message) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(message);
    }
  };

  return {
    handleTyping,
    handleSendMessage,
    handleKeyDown
  };
}
