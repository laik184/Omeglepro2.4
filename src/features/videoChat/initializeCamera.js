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
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    throw new Error('Camera/microphone access required for video chat');
  }
}
