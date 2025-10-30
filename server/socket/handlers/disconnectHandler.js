import socketState from '../socketState.js';
import { disconnectPair } from '../helpers/matchmaking.js';
import { moderator } from '../../../src/service/contentModeration.js';
import { loadBalancer } from '../../../src/service/loadBalancer.js';
import { clearMessageCooldown } from './sendMessageHandler.js';
import { clearTypingTimeout } from './typingHandler.js';

// FIX: Track disconnected sockets to prevent duplicate disconnect events
const disconnectedSockets = new Set();

export function disconnectHandler(socket, io) {
  return () => {
    // FIX: Prevent duplicate disconnect handling
    if (disconnectedSockets.has(socket.id)) {
      console.log(`Disconnect already handled for ${socket.id}`);
      return;
    }
    
    disconnectedSockets.add(socket.id);
    console.log(`User ${socket.id} disconnected`);
    
    // FIX: Disconnect pair (fires stranger-disconnected only once)
    disconnectPair(socket.id, io);
    
    // FIX: Clean up all socket state
    socketState.cleanup(socket.id);
    
    // FIX: Clear message rate limiting cooldown
    clearMessageCooldown(socket.id);
    
    // FIX: Clear typing timeout
    clearTypingTimeout(socket.id);
    
    // FIX: Remove from load balancer
    loadBalancer.removeUserFromServer(socket.id);
    
    // FIX: Clear moderation data
    moderator.clearUserHistory(socket.id);
    moderator.unregisterUser(socket.id);
    
    // FIX: Remove from rooms and update counts
    const rooms = socketState.getRooms();
    ['text', 'video'].forEach(roomType => {
      if (rooms[roomType].has(socket.id)) {
        rooms[roomType].delete(socket.id);
        io.to(roomType).emit('user-count', rooms[roomType].size);
        console.log(`User ${socket.id} disconnected from ${roomType} room. Count: ${rooms[roomType].size}`);
      }
    });
    
    // FIX: Clean up disconnect tracking after 5 seconds
    setTimeout(() => {
      disconnectedSockets.delete(socket.id);
    }, 5000);
  };
}
