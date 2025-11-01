import { AdaptiveQualityManager } from '../../service/adaptiveQuality.js';
import { VideoModerator } from '../../service/videoModeration.js';

export async function initializeCamera(
  streamRef,
  userVideoRef,
  userPreviewRef,
  qualityManagerRef,
  videoModeratorRef,
  onError,
  navigate
) {
  const isSecure = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isSecure && !isLocalhost) {
    const httpsError = 'WebRTC requires HTTPS connection. Please access this site via HTTPS.';
    console.error(httpsError);
    onError(httpsError);
    alert(httpsError);
    setTimeout(() => navigate('/'), 2000);
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const browserError = 'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.';
    console.error(browserError);
    onError(browserError);
    alert(browserError);
    setTimeout(() => navigate('/'), 2000);
    return;
  }

  try {
    console.log('Requesting camera and microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }, 
      audio: true 
    });
    
    console.log('Camera access granted. Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
    streamRef.current = stream;
    
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = stream;
    }
    if (userPreviewRef.current) {
      userPreviewRef.current.srcObject = stream;
    }

    qualityManagerRef.current = new AdaptiveQualityManager();
    videoModeratorRef.current = new VideoModerator();
    console.log('Camera initialized successfully');
  } catch (error) {
    console.error('Camera initialization failed:', error.name, error.message);
    
    let errorMessage = 'Unable to access camera and microphone.';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera and microphone access was denied. Please allow permissions in your browser settings and refresh the page.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera or microphone found. Please connect a camera and microphone to use video chat.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera or microphone is already in use by another application. Please close other apps and try again.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Your camera does not support the requested video quality. Trying lower quality...';
    } else if (error.name === 'TypeError') {
      errorMessage = 'Camera access blocked. Make sure you are using HTTPS or localhost.';
    }
    
    onError(errorMessage);
    alert(errorMessage);
    
    setTimeout(() => {
      navigate('/');
    }, 2000);
  }
}

export function cleanupCamera(
  streamRef,
  peerRef,
  qualityManagerRef,
  videoModeratorRef
) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
  }
  if (peerRef.current) {
    peerRef.current.destroy();
  }
  if (qualityManagerRef.current) {
    qualityManagerRef.current.stopMonitoring();
  }
  if (videoModeratorRef.current) {
    videoModeratorRef.current.stopMonitoring();
  }
}
