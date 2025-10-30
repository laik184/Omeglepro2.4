import socketState from '../socketState.js';
import { moderator } from '../../../src/service/contentModeration.js';

// FIX: Message cooldown map for rate limiting (500ms minimum between messages)
const messageCooldowns = new Map();
const COOLDOWN_MS = 500;

export function sendMessageHandler(socket, io) {
  return async (data) => {
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    if (!partnerId) return;
    
    // FIX: Rate limiting - prevent spam messages
    const now = Date.now();
    const lastMessageTime = messageCooldowns.get(socket.id);
    
    if (lastMessageTime && now - lastMessageTime < COOLDOWN_MS) {
      console.log(`Message from ${socket.id} ignored (rate limit)`);
      socket.emit('message-rate-limited', { 
        message: 'Please slow down. Wait before sending another message.' 
      });
      return;
    }
    
    // FIX: Update cooldown timestamp
    messageCooldowns.set(socket.id, now);
    
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
    
    // FIX: Message delivery acknowledgment - notify sender that message was delivered
    socket.emit('message-delivered', { 
      messageId: data.messageId || Date.now(),
      timestamp: now,
      delivered: true
    });
  };
}

// FIX: Cleanup cooldown on disconnect
export function clearMessageCooldown(socketId) {
  messageCooldowns.delete(socketId);
}
