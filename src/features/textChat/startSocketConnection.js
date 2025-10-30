import { io } from 'socket.io-client';

export function startSocketConnection(callbacks) {
  const socketConfig = {
    transports: ['websocket', 'polling'],
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    rejectUnauthorized: false
  };
  
  const socket = io(socketConfig);

  socket.emit('join-room', 'text');

  if (callbacks.onUserCount) {
    socket.on('user-count', callbacks.onUserCount);
  }

  if (callbacks.onSearching) {
    socket.on('searching', callbacks.onSearching);
  }

  if (callbacks.onMatched) {
    socket.on('matched', callbacks.onMatched);
  }

  if (callbacks.onReceiveMessage) {
    socket.on('receive-message', callbacks.onReceiveMessage);
  }

  if (callbacks.onStrangerTyping) {
    socket.on('stranger-typing', callbacks.onStrangerTyping);
  }

  if (callbacks.onStrangerStopTyping) {
    socket.on('stranger-stop-typing', callbacks.onStrangerStopTyping);
  }

  if (callbacks.onStrangerDisconnected) {
    socket.on('stranger-disconnected', callbacks.onStrangerDisconnected);
  }

  if (callbacks.onYouDisconnected) {
    socket.on('you-disconnected', callbacks.onYouDisconnected);
  }

  if (callbacks.onBlocked) {
    socket.on('blocked', callbacks.onBlocked);
  }

  if (callbacks.onFeedbackReceived) {
    socket.on('feedback-received', callbacks.onFeedbackReceived);
  }

  if (callbacks.onReportSuccess) {
    socket.on('report-success', callbacks.onReportSuccess);
  }

  if (callbacks.onReportFailed) {
    socket.on('report-failed', callbacks.onReportFailed);
  }

  // FIX: Add message delivery acknowledgment listener
  if (callbacks.onMessageDelivered) {
    socket.on('message-delivered', callbacks.onMessageDelivered);
  }

  // FIX: Add rate limiting listener
  if (callbacks.onMessageRateLimited) {
    socket.on('message-rate-limited', callbacks.onMessageRateLimited);
  }

  socket.emit('start-matching');
  console.log('Text chat socket connection started');
  
  return socket;
}
