import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocketConnection(callbacks) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

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

    if (callbacks.onMessageDelivered) {
      socket.on('message-delivered', callbacks.onMessageDelivered);
    }

    if (callbacks.onMessageRateLimited) {
      socket.on('message-rate-limited', callbacks.onMessageRateLimited);
    }

    if (callbacks.onConnectionError) {
      socket.on('connection-error', callbacks.onConnectionError);
    }

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (callbacks.onConnectError) {
        callbacks.onConnectError(error);
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      if (callbacks.onReconnect) {
        callbacks.onReconnect(attemptNumber);
      }
    });

    socket.emit('start-matching');

    return () => {
      socket.emit('leave-room', 'text');
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
