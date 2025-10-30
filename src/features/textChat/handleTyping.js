export function handleTyping(socket, message, typingTimeoutRef) {
  if (socket && message.length > 0) {
    socket.emit('typing');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing');
    }, 1000);
  } else if (socket) {
    socket.emit('stop-typing');
  }
}
