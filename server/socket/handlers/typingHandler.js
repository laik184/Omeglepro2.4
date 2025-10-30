import socketState from '../socketState.js';

// FIX: Track typing timeouts for auto-stop (3 second timeout)
const typingTimeouts = new Map();
const TYPING_TIMEOUT_MS = 3000;

export function typingHandler(socket, io) {
  return () => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        // FIX: Emit typing indicator to partner
        partnerSocket.emit('stranger-typing');
        
        // FIX: Clear existing timeout if any
        if (typingTimeouts.has(socket.id)) {
          clearTimeout(typingTimeouts.get(socket.id));
        }
        
        // FIX: Auto-stop typing after 3 seconds of inactivity
        const timeout = setTimeout(() => {
          const currentPartnerId = pairings.get(socket.id);
          if (currentPartnerId) {
            const currentPartnerSocket = io.sockets.sockets.get(currentPartnerId);
            if (currentPartnerSocket) {
              currentPartnerSocket.emit('stranger-stop-typing');
            }
          }
          typingTimeouts.delete(socket.id);
        }, TYPING_TIMEOUT_MS);
        
        typingTimeouts.set(socket.id, timeout);
      }
    }
  };
}

export function stopTypingHandler(socket, io) {
  return () => {
    // FIX: Clear typing timeout if exists
    if (typingTimeouts.has(socket.id)) {
      clearTimeout(typingTimeouts.get(socket.id));
      typingTimeouts.delete(socket.id);
    }
    
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

// FIX: Cleanup typing timeout on disconnect
export function clearTypingTimeout(socketId) {
  if (typingTimeouts.has(socketId)) {
    clearTimeout(typingTimeouts.get(socketId));
    typingTimeouts.delete(socketId);
  }
}
