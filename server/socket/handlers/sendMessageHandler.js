import socketState from '../socketState.js';
import { moderator } from '../../../src/service/contentModeration.js';

export function sendMessageHandler(socket, io) {
  return async (data) => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (!partnerId) return;
    
    const moderationResult = moderator.checkMessage(socket.id, data.message);
    
    if (moderationResult.action === 'BLOCK') {
      socket.emit('message-blocked', { 
        reason: 'Your message was blocked due to policy violations',
        violations: moderationResult.violations 
      });
      console.log(`Message blocked from ${socket.id}:`, moderationResult.violations);
      
      if (moderator.isUserBlocked(socket.id)) {
        socket.emit('user-blocked', { 
          message: 'You have been blocked due to repeated violations' 
        });
        socket.disconnect(true);
      }
      return;
    }
    
    const messageToSend = moderationResult.action === 'FILTER' 
      ? moderationResult.filteredMessage 
      : data.message;
    
    if (moderationResult.action === 'FILTER') {
      socket.emit('message-filtered', { 
        message: 'Some content in your message was filtered' 
      });
    }
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('receive-message', { text: messageToSend, sender: 'stranger' });
      console.log(`Message from ${socket.id} to ${partnerId}: ${messageToSend}`);
    }
  };
}
