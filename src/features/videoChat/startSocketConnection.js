import { io } from 'socket.io-client';

export function startSocketConnection(callbacks) {
  const socketConfig = {
    transports: ['websocket', 'polling'],
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    rejectUnauthorized: false
  };
  
  const socket = io(socketConfig);

  socket.emit('join-room', 'video');

  if (callbacks.onUserCount) {
    socket.on('user-count', callbacks.onUserCount);
  }

  if (callbacks.onSearching) {
    socket.on('searching', callbacks.onSearching);
  }

  if (callbacks.onMatched) {
    socket.on('matched', callbacks.onMatched);
  }

  if (callbacks.onWebRTCSignal) {
    socket.on('webrtc-signal', callbacks.onWebRTCSignal);
  }

  if (callbacks.onReceiveMessage) {
    socket.on('receive-message', callbacks.onReceiveMessage);
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

  if (callbacks.onReportSuccess) {
    socket.on('report-success', callbacks.onReportSuccess);
  }

  if (callbacks.onReportFailed) {
    socket.on('report-failed', callbacks.onReportFailed);
  }

  socket.emit('start-matching');
  console.log('Socket connection started');
  
  return socket;
}
