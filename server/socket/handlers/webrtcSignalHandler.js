import socketState from '../socketState.js';

export function webrtcSignalHandler(socket, io) {
  return (data) => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    
    if (!partnerId) {
      console.log(`WebRTC signal from ${socket.id} - no partner found`);
      socket.emit('webrtc-error', { 
        error: 'No partner connected',
        code: 'NO_PARTNER'
      });
      return;
    }
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    
    if (!partnerSocket || !partnerSocket.connected) {
      console.log(`WebRTC signal from ${socket.id} - partner ${partnerId} disconnected`);
      socket.emit('webrtc-error', { 
        error: 'Partner disconnected',
        code: 'PARTNER_DISCONNECTED'
      });
      socket.emit('stranger-disconnected');
      
      socketState.removePairing(socket.id);
      return;
    }
    
    try {
      partnerSocket.emit('webrtc-signal', {
        signal: data.signal,
        from: socket.id
      });
      console.log(`WebRTC signal forwarded from ${socket.id} to ${partnerId}`);
    } catch (error) {
      console.error(`Error forwarding WebRTC signal from ${socket.id} to ${partnerId}:`, error);
      socket.emit('webrtc-error', { 
        error: 'Failed to forward signal',
        code: 'SIGNAL_FORWARD_ERROR'
      });
    }
  };
}
