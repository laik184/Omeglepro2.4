import SimplePeer from 'simple-peer';
import { setupQualityMonitoring, setupVideoModeration } from './qualityModeration.js';

const ICE_SERVER_SETS = [
  [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
];

export function createPeerConnectionManager(config) {
  const {
    socketRef,
    peerRef,
    streamRef,
    strangerVideoRef,
    qualityManagerRef,
    videoModeratorRef,
    connectionTimeoutRef,
    currentStrangerIdRef,
    connectionRetryCountRef,
    setMessages,
    setVideoQuality,
    setModerationWarning,
    onHandleNewOrSkip
  } = config;

  const createPeerConnection = (strangerId, retryCount = 0) => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    if (!streamRef.current) {
      console.error('No local stream available');
      return;
    }

    const tracks = streamRef.current.getTracks();
    if (!tracks || tracks.length === 0) {
      console.error('Stream has no tracks available');
      return;
    }
    console.log(`Local stream has ${tracks.length} tracks:`, tracks.map(t => `${t.kind} (${t.label})`));

    const isInitiator = socketRef.current.id > strangerId;
    const currentIceServers = ICE_SERVER_SETS[Math.min(retryCount, ICE_SERVER_SETS.length - 1)];
    console.log(`Creating peer connection (attempt ${retryCount + 1}) with ICE servers:`, currentIceServers);

    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: true,
      stream: streamRef.current,
      config: {
        iceServers: currentIceServers,
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
      }
    });

    let isConnected = false;

    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected && peerRef.current === peer) {
        console.warn('Peer connection timeout after 10 seconds');
        
        if (retryCount < 2) {
          console.log(`Retrying connection (attempt ${retryCount + 2})...`);
          
          peer.destroy();
          peerRef.current = null;
          
          setTimeout(() => {
            if (currentStrangerIdRef.current === strangerId) {
              createPeerConnection(strangerId, retryCount + 1);
            }
          }, 1000);
        } else {
          setMessages(prev => [...prev, { 
            text: 'Unable to establish video connection. Finding new partner...', 
            sender: 'system' 
          }]);
          peer.destroy();
          peerRef.current = null;
          
          if (socketRef.current) {
            socketRef.current.emit('skip-stranger');
          }
        }
      }
    }, 10000);

    peer.on('signal', (signal) => {
      socketRef.current.emit('webrtc-signal', { signal });
    });

    peer.on('connect', () => {
      isConnected = true;
      console.log('Peer connection established successfully');
      connectionRetryCountRef.current = 0;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    peer.on('stream', (remoteStream) => {
      isConnected = true;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (strangerVideoRef.current) {
        strangerVideoRef.current.srcObject = remoteStream;
        console.log('Received remote stream');

        setupQualityMonitoring(
          peer,
          streamRef,
          qualityManagerRef,
          setVideoQuality
        );

        setupVideoModeration(
          strangerVideoRef,
          videoModeratorRef,
          socketRef,
          setModerationWarning,
          onHandleNewOrSkip
        );
      }
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    peerRef.current = peer;
    connectionRetryCountRef.current = retryCount;
    console.log(`WebRTC peer created. I am ${isInitiator ? 'initiator' : 'responder'}`);
  };

  return createPeerConnection;
}
