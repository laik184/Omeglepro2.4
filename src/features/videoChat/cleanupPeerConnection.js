export function cleanupPeerConnection(
  peerRef,
  strangerVideoRef,
  qualityManagerRef,
  videoModeratorRef,
  setModerationWarning
) {
  if (peerRef.current) {
    peerRef.current.destroy();
    peerRef.current = null;
  }

  if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
    const stream = strangerVideoRef.current.srcObject;
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped remote media track during cleanup:', track.kind);
    });
    strangerVideoRef.current.srcObject = null;
  }

  if (qualityManagerRef?.current) {
    qualityManagerRef.current.stopMonitoring();
  }

  if (videoModeratorRef?.current) {
    videoModeratorRef.current.stopMonitoring();
    if (setModerationWarning) {
      setModerationWarning(null);
    }
  }

  console.log('Peer connection and all media tracks cleaned up');
}
