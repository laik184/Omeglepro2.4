import socketState from '../socketState.js';
import { disconnectPair } from '../helpers/matchmaking.js';
import { moderator } from '../../../src/service/contentModeration.js';
import { loadBalancer } from '../../../src/service/loadBalancer.js';

export function disconnectHandler(socket, io) {
  return () => {
    console.log(`User ${socket.id} disconnected`);
    disconnectPair(socket.id, io);
    
    socketState.cleanup(socket.id);
    
    loadBalancer.removeUserFromServer(socket.id);
    
    moderator.clearUserHistory(socket.id);
    moderator.unregisterUser(socket.id);
    
    const rooms = socketState.getRooms();
    ['text', 'video'].forEach(roomType => {
      if (rooms[roomType].has(socket.id)) {
        rooms[roomType].delete(socket.id);
        io.to(roomType).emit('user-count', rooms[roomType].size);
        console.log(`User ${socket.id} disconnected from ${roomType} room. Count: ${rooms[roomType].size}`);
      }
    });
  };
}
