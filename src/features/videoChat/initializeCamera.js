// ✅ initializeCamera.js — Stable & Optimized for Production
import { AdaptiveQualityManager } from "../../service/adaptiveQuality.js";
import { VideoModerator } from "../../service/videoModeration.js";

/**
 * Initialize camera + mic and attach to refs
 */
export async function initializeCamera(
  streamRef,
  userVideoRef,
  userPreviewRef,
  qualityManagerRef,
  videoModeratorRef,
  onError,
  navigate
) {
  const isSecure =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isSecure) {
    const msg =
      "⚠️  WebRTC requires HTTPS or localhost. Please reopen the site via HTTPS.";
    console.error(msg);
    onError?.(msg);
    setTimeout(() => navigate("/"), 1500);
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    const msg =
      "❌  Camera access not supported in this browser. Use Chrome / Edge / Firefox.";
    console.error(msg);
    onError?.(msg);
    setTimeout(() => navigate("/"), 1500);
    return;
  }

  try {
    console.log("[Camera] Requesting permission...");

    // 🎥 Preferred 720p, automatic fallback to 480p
    const preferred = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: true,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(preferred);
    } catch {
      console.warn("[Camera] 720p not supported, using 480p fallback.");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true,
      });
    }

    // ✅ Assign stream
    streamRef.current = stream;
    if (userVideoRef?.current) userVideoRef.current.srcObject = stream;
    if (userPreviewRef?.current) userPreviewRef.current.srcObject = stream;

    console.log("[Camera] Stream ready:", stream.getTracks().length, "tracks");

    // ✅ Setup quality & moderation managers
    qualityManagerRef.current = new AdaptiveQualityManager();
    videoModeratorRef.current = new VideoModerator();

    qualityManagerRef.current.startMonitoring?.(stream);
    videoModeratorRef.current.startMonitoring?.(stream);

    console.log("[Camera] Initialized successfully ✅");
  } catch (error) {
    console.error("[Camera] Initialization failed:", error);

    let msg = "Unable to access camera/mic.";
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        msg = "Camera/mic permission denied. Please allow and refresh.";
        break;
      case "NotFoundError":
        msg = "No camera/mic found. Connect a device and retry.";
        break;
      case "NotReadableError":
        msg = "Camera or mic in use by another app.";
        break;
      case "OverconstrainedError":
        msg = "Requested resolution not supported.";
        break;
    }

    onError?.(msg);
    setTimeout(() => navigate("/"), 2000);
  }
}

/**
 * Cleanup: stop all tracks + monitoring + peer connection
 */
export function cleanupCamera(
  streamRef,
  peerRef,
  qualityManagerRef,
  videoModeratorRef
) {
  try {
    if (streamRef?.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    peerRef?.current?.destroy?.();
    qualityManagerRef?.current?.stopMonitoring?.();
    videoModeratorRef?.current?.stopMonitoring?.();

    console.log("[Camera] Cleaned up successfully 🧹");
  } catch (err) {
    console.warn("[Camera] Cleanup error:", err.message);
  }
}
