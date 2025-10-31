import SimplePeer from 'simple-peer';

const TURN_SERVER_SETS = [
  [
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
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
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

  const currentTurnSet = TURN_SERVER_SETS[Math.min(retryCount, TURN_SERVER_SETS.length - 1)];
  console.log(`Creating peer connection (attempt ${retryCount + 1}/${maxRetries + 1}) with TURN relay servers (IP privacy protected):`, currentTurnSet);

  const peer = new SimplePeer({
    initiator: isInitiator,
    trickle: true,
    stream: stream,
    config: {
      iceServers: currentTurnSet,
      iceTransportPolicy: 'relay',
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
