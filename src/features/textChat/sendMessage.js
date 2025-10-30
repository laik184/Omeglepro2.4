export function sendMessage(socket, message, setMessages, setMessage) {
  if (message.trim() && socket) {
    setMessages(prev => [...prev, { text: message, sender: 'you' }]);
    socket.emit('send-message', { message });
    socket.emit('stop-typing');
    setMessage('');
  }
}
