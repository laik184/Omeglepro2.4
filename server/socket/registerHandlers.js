import socketState from './socketState.js';
import { moderator } from '../../src/service/contentModeration.js';
import { loadBalancer } from '../../src/service/loadBalancer.js';

import { joinRoomHandler } from './handlers/joinRoomHandler.js';
import { startMatchingHandler } from './handlers/startMatchingHandler.js';
import { sendMessageHandler } from './handlers/sendMessageHandler.js';
import { typingHandler, stopTypingHandler } from './handlers/typingHandler.js';
import { skipStrangerHandler } from './handlers/skipStrangerHandler.js';
import { submitFeedbackHandler } from './handlers/feedbackHandler.js';
import { reportUserHandler } from './handlers/reportUserHandler.js';
import { webrtcSignalHandler } from './handlers/webrtcSignalHandler.js';
import { leaveRoomHandler } from './handlers/leaveRoomHandler.js';
import { disconnectHandler } from './handlers/disconnectHandler.js';
import { getModerationStatsHandler, getLoadStatsHandler } from './handlers/adminHandlers.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || 
                     socket.handshake.address;
    
    moderator.registerUser(socket.id, clientIP);
    
    if (socketState.isIPBlocked(clientIP) || moderator.isIPBlocked(clientIP)) {
      console.log(`Blocked IP attempted connection: ${clientIP}`);
      socket.emit('blocked', { message: 'Your IP has been blocked due to violations.' });
      socket.disconnect(true);
      moderator.unregisterUser(socket.id);
      return;
    }
    
    socketState.setSocketIP(socket.id, clientIP);
    
    const serverId = loadBalancer.getServerForUser(socket.id);
    console.log('User connected:', socket.id, 'IP:', clientIP, 'Server:', serverId);

    socket.on('join-room', joinRoomHandler(socket, io));
    socket.on('start-matching', startMatchingHandler(socket, io));
    socket.on('send-message', sendMessageHandler(socket, io));
    socket.on('typing', typingHandler(socket, io));
    socket.on('stop-typing', stopTypingHandler(socket, io));
    socket.on('skip-stranger', skipStrangerHandler(socket, io));
    socket.on('submit-feedback', submitFeedbackHandler(socket, io));
    socket.on('report-user', reportUserHandler(socket, io));
    socket.on('webrtc-signal', webrtcSignalHandler(socket, io));
    socket.on('leave-room', leaveRoomHandler(socket, io));
    socket.on('disconnect', disconnectHandler(socket, io));
    socket.on('get-moderation-stats', getModerationStatsHandler(socket, io));
    socket.on('get-load-stats', getLoadStatsHandler(socket, io));
    
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      socket.emit('connection-error', { 
        message: 'Connection error occurred',
        error: error.message 
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error(`Connection error for ${socket.id}:`, error);
    });
  });
}
