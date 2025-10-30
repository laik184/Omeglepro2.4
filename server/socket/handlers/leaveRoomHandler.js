import socketState from '../socketState.js';
import { disconnectPair } from '../helpers/matchmaking.js';

export function leaveRoomHandler(socket, io) {
  return (roomType) => {
    const rooms = socketState.getRooms();
    if (roomType === 'text' || roomType === 'video') {
      rooms[roomType].delete(socket.id);
      socket.leave(roomType);
      
      io.to(roomType).emit('user-count', rooms[roomType].size);
      console.log(`User ${socket.id} left ${roomType} room. Count: ${rooms[roomType].size}`);
    }
    
    disconnectPair(socket.id, io);
  };
}
