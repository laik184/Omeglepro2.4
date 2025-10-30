import socketState from '../socketState.js';

export function calculateCommonInterests(interests1, interests2) {
  if (!interests1 || !interests2 || interests1.length === 0 || interests2.length === 0) {
    return [];
  }
  return interests1.filter(interest => 
    interests2.some(int => int.toLowerCase() === interest.toLowerCase())
  );
}

export function findMatch(socket, io) {
  const userProfile = socketState.getUserProfile(socket.id);
  if (!userProfile) {
    socket.emit('searching');
    return;
  }

  const queue = userProfile.isCollegeMode ? socketState.getCollegeQueue() : socketState.getTextQueue();
  
  socketState.removeFromQueue(socket.id, queue);
  
  let bestMatch = null;
  let maxCommonInterests = 0;
  let bestMatchIndex = -1;

  if (userProfile.interests && userProfile.interests.length > 0) {
    queue.forEach((stranger, index) => {
      if (stranger.id === socket.id) return;
      
      const strangerProfile = socketState.getUserProfile(stranger.id);
      if (!strangerProfile) return;
      
      const commonInterests = calculateCommonInterests(
        userProfile.interests,
        strangerProfile.interests
      );
      
      if (commonInterests.length > maxCommonInterests) {
        maxCommonInterests = commonInterests.length;
        bestMatch = stranger;
        bestMatchIndex = index;
      }
    });
  }
  
  if (!bestMatch && queue.length > 0) {
    bestMatch = queue[0];
    bestMatchIndex = 0;
  }

  if (bestMatch && bestMatch.id !== socket.id) {
    queue.splice(bestMatchIndex, 1);
    
    const strangerProfile = socketState.getUserProfile(bestMatch.id);
    const commonInterests = calculateCommonInterests(
      userProfile.interests,
      strangerProfile ? strangerProfile.interests : []
    );
    
    socketState.setPairing(socket.id, bestMatch.id);
    
    socket.emit('matched', { 
      strangerId: bestMatch.id,
      commonInterests: commonInterests
    });
    bestMatch.emit('matched', { 
      strangerId: socket.id,
      commonInterests: commonInterests
    });
    
    console.log(`Matched: ${socket.id} <-> ${bestMatch.id}, Common interests: ${commonInterests.join(', ')}`);
  } else {
    queue.push(socket);
    socket.emit('searching');
    console.log(`User ${socket.id} added to ${userProfile.isCollegeMode ? 'college' : 'normal'} queue. Queue size: ${queue.length}`);
  }
}

export function disconnectPair(socketId, io) {
  const partnerId = socketState.removePairing(socketId);
  
  if (partnerId) {
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('stranger-disconnected');
      console.log(`Partner ${partnerId} notified of disconnection, auto-matching...`);
      findMatch(partnerSocket, io);
    }
  }
  
  socketState.removeFromQueue(socketId, socketState.getTextQueue());
  socketState.removeFromQueue(socketId, socketState.getCollegeQueue());
  
  socketState.deleteUserProfile(socketId);
}
