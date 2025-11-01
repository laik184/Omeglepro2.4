import { useRef } from 'react';

export function useTypingIndicator(socketRef, isConnected) {
  const typingTimeoutRef = useRef(null);

  const handleTypingStart = (hasText) => {
    if (isConnected && socketRef.current && hasText) {
      socketRef.current.emit('typing');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop-typing');
      }, 1000);
    } else if (socketRef.current) {
      socketRef.current.emit('stop-typing');
    }
  };

  return { handleTypingStart, typingTimeoutRef };
}
