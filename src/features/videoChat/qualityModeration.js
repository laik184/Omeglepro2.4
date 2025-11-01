export function setupQualityMonitoring(
  peer,
  streamRef,
  qualityManagerRef,
  setVideoQuality
) {
  if (qualityManagerRef.current && streamRef.current) {
    qualityManagerRef.current.monitorConnectionQuality(
      peer._pc,
      streamRef.current,
      (quality) => {
        setVideoQuality(quality);
        console.log(`Video quality adjusted to: ${quality}`);
      }
    );
  }
}

export function setupVideoModeration(
  strangerVideoRef,
  videoModeratorRef,
  socketRef,
  setModerationWarning,
  onViolation
) {
  if (videoModeratorRef.current) {
    setTimeout(() => {
      videoModeratorRef.current.startMonitoring(
        strangerVideoRef.current,
        (violation) => {
          setModerationWarning(violation);
          console.warn('Content moderation violation:', violation);
          
          if (violation.shouldBlock && socketRef.current) {
            socketRef.current.emit('report-user', { 
              reportReason: `Automated: ${violation.reason}` 
            });
            if (onViolation) onViolation();
          }
        },
        false
      );
    }, 2000);
  }
}

export function stopQualityMonitoring(qualityManagerRef) {
  if (qualityManagerRef.current) {
    qualityManagerRef.current.stopMonitoring();
  }
}

export function stopVideoModeration(videoModeratorRef, setModerationWarning) {
  if (videoModeratorRef.current) {
    videoModeratorRef.current.stopMonitoring();
    setModerationWarning(null);
  }
}
