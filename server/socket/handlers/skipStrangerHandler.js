import socketState from '../socketState.js';
import { findMatch } from '../helpers/matchmaking.js';

export function skipStrangerHandler(socket, io) {
  return () => {
    console.log(`User ${socket.id} skipped stranger`);
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    const roomId = socketState.getUniqueRoomId(socket.id);
    
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      socketState.removePairing(socket.id);
      
      if (roomId) {
        socket.leave(roomId);
        if (partnerSocket) {
          partnerSocket.leave(roomId);
        }
        socketState.removeFromUniqueRoom(socket.id);
        socketState.removeFromUniqueRoom(partnerId);
      }
      
      if (partnerSocket) {
        partnerSocket.emit('stranger-disconnected');
        console.log(`Partner ${partnerId} notified of disconnection, auto-matching...`);
        findMatch(partnerSocket, io);
      }
      socket.emit('you-disconnected');
      
      console.log(`User ${socket.id} disconnected from ${partnerId}, left room ${roomId}`);
    }
    
    findMatch(socket, io);
  };
}
