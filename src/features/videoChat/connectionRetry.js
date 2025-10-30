import { createPeerConnection } from './createPeerConnection.js';
import { cleanupPeerConnection } from './cleanupPeerConnection.js';

export function createPeerWithRetry(config) {
  const {
    isInitiator,
    stream,
    onSignal,
    onStream,
    onError,
    onClose,
    onConnect,
    onRetry,
    onFinalFailure,
    strangerId,
    maxRetries = 2,
    connectionTimeout = 10000
  } = config;

  let currentPeer = null;
  let retryCount = 0;

  const attemptConnection = (attempt = 0) => {
    retryCount = attempt;

    if (onRetry && attempt > 0) {
      onRetry(attempt, maxRetries);
    }

    currentPeer = createPeerConnection({
      isInitiator,
      stream,
      retryCount: attempt,
      maxRetries,
      connectionTimeout,
      onSignal,
      onStream,
      onConnect: () => {
        if (onConnect) {
          onConnect();
        }
      },
      onError: (error, currentRetry, maxRetries) => {
        if (error.message === 'Connection timeout') {
          if (currentRetry < maxRetries) {
            console.log(`Connection failed (attempt ${currentRetry + 1}/${maxRetries + 1}). Retrying with alternate STUN servers...`);
            
            if (currentPeer) {
              currentPeer.destroy();
              currentPeer = null;
            }
            
            setTimeout(() => {
              attemptConnection(currentRetry + 1);
            }, 1000);
          } else {
            console.error('Connection failed after all retry attempts');
            if (onFinalFailure) {
              onFinalFailure(error);
            }
            if (onError) {
              onError(error, currentRetry, maxRetries);
            }
          }
        } else {
          if (onError) {
            onError(error, currentRetry, maxRetries);
          }
        }
      },
      onClose: () => {
        if (onClose) {
          onClose();
        }
      }
    });

    return currentPeer;
  };

  return {
    peer: attemptConnection(0),
    getCurrentRetryCount: () => retryCount,
    destroy: () => {
      if (currentPeer) {
        currentPeer.destroy();
        currentPeer = null;
      }
    }
  };
}
