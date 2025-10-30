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

  if (strangerVideoRef.current) {
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

  console.log('Peer connection cleaned up');
}
