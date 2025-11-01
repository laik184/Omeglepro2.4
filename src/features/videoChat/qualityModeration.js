export function setupQualityMonitoring(
  peer,
  streamRef,
  qualityManagerRef,
  setVideoQuality
) {
  try {
    if (
      !peer ||
      !streamRef?.current ||
      !qualityManagerRef?.current ||
      typeof qualityManagerRef.current.monitorConnectionQuality !== "function"
    ) {
      console.warn("[Quality] Required references missing for monitoring.");
      return;
    }

    const peerConnection = peer.connection || peer._pc;
    if (!peerConnection) {
      console.warn("[Quality] Peer connection unavailable.");
      return;
    }

    qualityManagerRef.current.monitorConnectionQuality(
      peerConnection,
      streamRef.current,
      (quality) => {
        setVideoQuality(quality);
        console.log(`[Quality] Adjusted to ${quality} resolution.`);
      }
    );
  } catch (err) {
    console.error("[Quality] Error while monitoring:", err);
  }
}

/**
 * 🧠 AI-based Video Moderation
 * Automatically detects and reports unsafe content.
 */
export function setupVideoModeration(
  strangerVideoRef,
  videoModeratorRef,
  socketRef,
  setModerationWarning,
  onViolation
) {
  if (!videoModeratorRef?.current || !strangerVideoRef?.current) {
    console.warn("[Moderator] Missing video or moderator references.");
    return;
  }

  const socket = socketRef?.current;

  // ⚙️ Helper: Start AI monitoring safely
  const startMonitoring = () => {
    try {
      videoModeratorRef.current.startMonitoring(
        strangerVideoRef.current,
        (violation) => {
          setModerationWarning(violation);
          console.warn("[Moderator] Violation detected:", violation);

          // Auto-report only once per session
          if (violation.shouldBlock && socket) {
            socket.emit("report-user", {
              reportReason: `Auto-detected: ${violation.reason}`,
            });
            console.log("[Moderator] Auto-report triggered.");
            if (onViolation) onViolation();
          }
        },
        false
      );
    } catch (err) {
      console.error("[Moderator] Monitoring start failed:", err);
    }
  };

  // Wait until the video is ready
  const video = strangerVideoRef.current;
  if (video.readyState >= 2) {
    setTimeout(startMonitoring, 500);
  } else {
    video.onloadeddata = () => setTimeout(startMonitoring, 500);
  }
}

/**
 * 🧹 Stop quality monitoring safely
 */
export function stopQualityMonitoring(qualityManagerRef) {
  try {
    if (qualityManagerRef?.current) {
      qualityManagerRef.current.stopMonitoring();
      console.log("[Quality] Monitoring stopped.");
    }
  } catch (err) {
    console.error("[Quality] Stop monitoring failed:", err);
  }
}

/**
 * 🧼 Stop video moderation safely
 */
export function stopVideoModeration(videoModeratorRef, setModerationWarning) {
  try {
    if (videoModeratorRef?.current) {
      videoModeratorRef.current.stopMonitoring();
      console.log("[Moderator] Monitoring stopped.");
    }
    if (setModerationWarning) setModerationWarning(null);
  } catch (err) {
    console.error("[Moderator] Stop monitoring failed:", err);
  }
}
