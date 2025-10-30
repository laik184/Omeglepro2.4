import socketState from '../socketState.js';

export function typingHandler(socket, io) {
  return () => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('stranger-typing');
      }
    }
  };
}

export function stopTypingHandler(socket, io) {
  return () => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('stranger-stop-typing');
      }
    }
  };
}
