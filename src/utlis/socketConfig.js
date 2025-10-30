export function getSecureSocketConfig() {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  const isSecure = window.location.protocol === 'https:';
  
  const config = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
    secure: isSecure,
    rejectUnauthorized: false
  };

  if (!isDevelopment && isSecure) {
    config.upgrade = true;
    config.rememberUpgrade = true;
    console.log('✅ Using secure WebSocket (wss://) for production');
  } else if (isDevelopment) {
    console.log('🔧 Using insecure WebSocket (ws://) for local development');
  } else {
    console.warn('⚠️ Running on HTTP - WebSocket is not encrypted!');
  }

  return config;
}
