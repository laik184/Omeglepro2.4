import SimplePeer from 'simple-peer';

const STUN_SERVER_SETS = [
  [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  [
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ],
  [
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
];

export function createPeerConnection(config) {
  const {
    isInitiator,
    stream,
    onSignal,
    onStream,
    onError,
    onClose,
    onConnect,
    retryCount = 0,
    maxRetries = 2,
    connectionTimeout = 10000
  } = config;

  const currentStunSet = STUN_SERVER_SETS[Math.min(retryCount, STUN_SERVER_SETS.length - 1)];
  console.log(`Creating peer connection (attempt ${retryCount + 1}/${maxRetries + 1}) with STUN servers:`, currentStunSet);

  const peer = new SimplePeer({
    initiator: isInitiator,
    trickle: true,
    stream: stream,
    config: {
      iceServers: currentStunSet,
      iceCandidatePoolSize: 10
    }
  });

  let isConnected = false;
  let timeoutHandle = null;

  if (connectionTimeout > 0) {
    timeoutHandle = setTimeout(() => {
      if (!isConnected) {
        console.warn(`Peer connection timeout after ${connectionTimeout}ms (attempt ${retryCount + 1})`);
        
        if (onError) {
          onError(new Error('Connection timeout'), retryCount, maxRetries);
        }
      }
    }, connectionTimeout);
  }

  const clearConnectionTimeout = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };

  if (onSignal) {
    peer.on('signal', onSignal);
  }

  peer.on('connect', () => {
    isConnected = true;
    clearConnectionTimeout();
    console.log('Peer connection established successfully');
    
    if (onConnect) {
      onConnect();
    }
  });

  if (onStream) {
    peer.on('stream', (remoteStream) => {
      isConnected = true;
      clearConnectionTimeout();
      onStream(remoteStream);
    });
  }

  if (onError) {
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      onError(err, retryCount, maxRetries);
    });
  }

  if (onClose) {
    peer.on('close', () => {
      clearConnectionTimeout();
      onClose();
    });
  }

  peer.clearConnectionTimeout = clearConnectionTimeout;
  
  console.log(`WebRTC peer created. Initiator: ${isInitiator}`);
  return peer;
}
