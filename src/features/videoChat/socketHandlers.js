import { io } from 'socket.io-client';
import { setupQualityMonitoring, setupVideoModeration, stopQualityMonitoring, stopVideoModeration } from './qualityModeration.js';

export function setupSocketConnection(config) {
  const {
    socketRef,
    peerRef,
    streamRef,
    strangerVideoRef,
    qualityManagerRef,
    videoModeratorRef,
    connectionTimeoutRef,
    typingTimeoutRef,
    currentStrangerIdRef,
    setOnlineCount,
    setIsSearching,
    setIsConnected,
    setIsTyping,
    setMessages,
    setShowConnectedMsg,
    setVideoQuality,
    setModerationWarning,
    onCreatePeerConnection,
    onHandleNewOrSkip,
    navigate
  } = config;

  const socketConfig = {
    transports: ['websocket', 'polling'],
    secure: window.location.protocol === 'https:',
    rejectUnauthorized: false
  };
  
  const socket = io(socketConfig);
  socketRef.current = socket;

  socket.emit('join-room', 'video');

  socket.on('user-count', (count) => {
    setOnlineCount(count);
  });

  socket.on('searching', () => {
    setIsSearching(true);
    setIsConnected(false);
    setIsTyping(false);
    currentStrangerIdRef.current = null;
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (strangerVideoRef.current) {
      strangerVideoRef.current.srcObject = null;
    }
  });

  socket.on('matched', (data) => {
    setIsSearching(false);
    setIsConnected(true);
    setShowConnectedMsg(true);
    currentStrangerIdRef.current = data.strangerId;
    
    setTimeout(() => {
      setShowConnectedMsg(false);
    }, 6000);
    
    if (onCreatePeerConnection) {
      onCreatePeerConnection(data.strangerId, 0);
    }
  });

  socket.on('webrtc-signal', (data) => {
    if (peerRef.current) {
      try {
        peerRef.current.signal(data.signal);
      } catch (err) {
        console.error('Error signaling peer:', err);
      }
    } else {
      console.warn('Received WebRTC signal but no peer exists');
    }
  });

  socket.on('receive-message', (data) => {
    setMessages(prev => [...prev, { text: data.text, sender: 'stranger' }]);
  });

  socket.on('stranger-typing', () => {
    setIsTyping(true);
  });

  socket.on('stranger-stop-typing', () => {
    setIsTyping(false);
  });

  const cleanupConnection = () => {
    setIsTyping(false);
    currentStrangerIdRef.current = null;
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
      const stream = strangerVideoRef.current.srcObject;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped remote media track:', track.kind);
      });
      strangerVideoRef.current.srcObject = null;
      console.log('Remote video element cleaned up and all tracks stopped');
    }
    
    stopQualityMonitoring(qualityManagerRef);
    stopVideoModeration(videoModeratorRef, setModerationWarning);
  };

  socket.on('stranger-disconnected', () => {
    setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
    setIsConnected(false);
    setIsSearching(false);
    cleanupConnection();
  });

  socket.on('you-disconnected', () => {
    setMessages(prev => [...prev, { text: 'You have disconnected.', sender: 'system' }]);
    setIsConnected(false);
    setIsSearching(false);
    cleanupConnection();
  });

  socket.on('blocked', (data) => {
    alert(data.message);
    navigate('/chat');
  });

  socket.on('report-success', (data) => {
    alert(data.message);
  });

  socket.on('report-failed', (data) => {
    alert(data.message);
  });

  socket.on('webrtc-error', (data) => {
    console.error('WebRTC error:', data);
    
    if (data.code === 'PARTNER_DISCONNECTED') {
      setMessages(prev => [...prev, { text: 'Partner disconnected during connection.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
        const stream = strangerVideoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped remote media track on error:', track.kind);
        });
        strangerVideoRef.current.srcObject = null;
      }
    } else if (data.code === 'NO_PARTNER') {
      console.warn('Attempted to send signal without partner');
    } else {
      setMessages(prev => [...prev, { text: 'Connection error occurred. Please try again.', sender: 'system' }]);
    }
  });

  socket.on('connection-error', (data) => {
    console.error('Connection error:', data);
    setMessages(prev => [...prev, { text: 'Connection error. Reconnecting...', sender: 'system' }]);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    setMessages(prev => [...prev, { text: 'Failed to connect. Please check your internet connection.', sender: 'system' }]);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Reconnected after ${attemptNumber} attempts`);
    setMessages(prev => [...prev, { text: 'Reconnected successfully!', sender: 'system' }]);
  });

  const waitForStreamAndMatch = () => {
    if (streamRef.current && streamRef.current.getTracks().length > 0) {
      console.log('Camera ready, starting matching with tracks:', streamRef.current.getTracks().map(t => t.kind));
      socket.emit('start-matching');
    } else {
      console.log('Waiting for camera stream to be ready...');
      setTimeout(waitForStreamAndMatch, 100);
    }
  };
  
  waitForStreamAndMatch();

  return socket;
}

export function cleanupSocket(socketRef, peerRef, typingTimeoutRef, setIsTyping) {
  setIsTyping(false);
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }
  if (peerRef.current) {
    peerRef.current.destroy();
  }
  if (socketRef.current) {
    socketRef.current.emit('leave-room', 'video');
    socketRef.current.disconnect();
  }
}
