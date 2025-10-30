export async function initializeCamera(streamRef, userVideoRef, userPreviewRef) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }, 
      audio: true 
    });
    
    streamRef.current = stream;
    
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = stream;
    }
    if (userPreviewRef.current) {
      userPreviewRef.current.srcObject = stream;
    }

    console.log('Camera initialized successfully');
    return { success: true, stream };
  } catch (error) {
    console.error('Error accessing camera:', error);
    
    let errorMessage = 'Please allow camera & mic access to use video chat.';
    let errorType = 'unknown';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera and microphone access was denied. Please allow permissions in your browser settings and refresh the page.';
      errorType = 'permission_denied';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera or microphone found. Please connect a camera and microphone to use video chat.';
      errorType = 'device_not_found';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera or microphone is already in use by another application. Please close other apps and try again.';
      errorType = 'device_busy';
    }
    
    return { 
      success: false, 
      error: error, 
      errorMessage, 
      errorType 
    };
  }
}
