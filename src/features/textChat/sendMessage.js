// FIX: Updated to include messageId for delivery tracking
export function sendMessage(socket, message, setMessages, setMessage) {
  if (message.trim() && socket) {
    // FIX: Generate unique messageId for delivery acknowledgment
    const messageId = Date.now();
    setMessages(prev => [...prev, { 
      text: message, 
      sender: 'you', 
      id: messageId, 
      delivered: false 
    }]);
    // FIX: Send message with messageId to server
    socket.emit('send-message', { message, messageId });
    socket.emit('stop-typing');
    setMessage('');
  }
}
