import SimplePeer from 'simple-peer';

export function createPeerConnection(config) {
  const {
    isInitiator,
    stream,
    onSignal,
    onStream,
    onError,
    onClose
  } = config;

  const peer = new SimplePeer({
    initiator: isInitiator,
    trickle: true,
    stream: stream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  if (onSignal) {
    peer.on('signal', onSignal);
  }

  if (onStream) {
    peer.on('stream', onStream);
  }

  if (onError) {
    peer.on('error', onError);
  }

  if (onClose) {
    peer.on('close', onClose);
  }

  console.log(`WebRTC peer created. Initiator: ${isInitiator}`);
  return peer;
}
