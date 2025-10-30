import socketState from '../socketState.js';

export function webrtcSignalHandler(socket, io) {
  return (data) => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('webrtc-signal', {
          signal: data.signal,
          from: socket.id
        });
        console.log(`WebRTC signal forwarded from ${socket.id} to ${partnerId}`);
      }
    }
  };
}
