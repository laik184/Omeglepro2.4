export function attachRemoteStream(
  remoteStream, 
  strangerVideoRef, 
  qualityManagerRef, 
  videoModeratorRef,
  peer,
  streamRef,
  onQualityChange,
  onViolation,
  socketRef,
  handleSkip
) {
  if (strangerVideoRef.current) {
    strangerVideoRef.current.srcObject = remoteStream;
    console.log('Received remote stream');

    if (qualityManagerRef?.current && streamRef?.current) {
      qualityManagerRef.current.monitorConnectionQuality(
        peer._pc,
        streamRef.current,
        (quality) => {
          if (onQualityChange) {
            onQualityChange(quality);
          }
          console.log(`Video quality adjusted to: ${quality}`);
        }
      );
    }

    if (videoModeratorRef?.current) {
      setTimeout(() => {
        videoModeratorRef.current.startMonitoring(
          strangerVideoRef.current,
          (violation) => {
            if (onViolation) {
              onViolation(violation);
            }
            console.warn('Content moderation violation:', violation);
            
            if (violation.shouldBlock && socketRef?.current) {
              socketRef.current.emit('report-user', { 
                reportReason: `Automated: ${violation.reason}` 
              });
              if (handleSkip) {
                handleSkip();
              }
            }
          },
          false
        );
      }, 2000);
    }
  }
}
