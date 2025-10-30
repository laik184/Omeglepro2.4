export function exchangeSignaling(socket, peerRef) {
  return {
    sendSignal: (signal) => {
      if (socket) {
        socket.emit('webrtc-signal', { signal });
        console.log('Sent WebRTC signal');
      }
    },
    
    receiveSignal: (data) => {
      if (peerRef.current) {
        try {
          peerRef.current.signal(data.signal);
          console.log('Received and processed WebRTC signal');
        } catch (err) {
          console.error('Error signaling peer:', err);
        }
      } else {
        console.warn('Received WebRTC signal but no peer exists');
      }
    }
  };
}
