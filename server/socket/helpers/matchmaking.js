import socketState from '../socketState.js';
import { v4 as uuidv4 } from 'uuid';

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
      
      if (socketState.isRecentPartner(socket.id, stranger.id)) {
        console.log(`Skipping recent partner: ${stranger.id}`);
        return;
      }
      
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
    for (let i = 0; i < queue.length; i++) {
      if (!socketState.isRecentPartner(socket.id, queue[i].id)) {
        bestMatch = queue[i];
        bestMatchIndex = i;
        break;
      }
    }
  }

  if (bestMatch && bestMatch.id !== socket.id) {
    queue.splice(bestMatchIndex, 1);
    
    const strangerProfile = socketState.getUserProfile(bestMatch.id);
    const commonInterests = calculateCommonInterests(
      userProfile.interests,
      strangerProfile ? strangerProfile.interests : []
    );
    
    const uniqueRoomId = uuidv4();
    
    socketState.setPairing(socket.id, bestMatch.id);
    socketState.addRecentPartner(socket.id, bestMatch.id);
    socketState.addRecentPartner(bestMatch.id, socket.id);
    
    socketState.createUniqueRoom(uniqueRoomId, socket, bestMatch);
    socket.join(uniqueRoomId);
    bestMatch.join(uniqueRoomId);
    
    socket.emit('matched', { 
      strangerId: bestMatch.id,
      roomId: uniqueRoomId,
      commonInterests: commonInterests
    });
    bestMatch.emit('matched', { 
      strangerId: socket.id,
      roomId: uniqueRoomId,
      commonInterests: commonInterests
    });
    
    console.log(`Matched: ${socket.id} <-> ${bestMatch.id} in room ${uniqueRoomId}, Common interests: ${commonInterests.join(', ')}`);
  } else {
    queue.push(socket);
    socket.emit('searching');
    console.log(`User ${socket.id} added to ${userProfile.isCollegeMode ? 'college' : 'normal'} queue. Queue size: ${queue.length}`);
  }
}

export function disconnectPair(socketId, io) {
  const partnerId = socketState.removePairing(socketId);
  const roomId = socketState.removeFromUniqueRoom(socketId);
  
  if (partnerId) {
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      if (roomId) {
        partnerSocket.leave(roomId);
      }
      partnerSocket.emit('stranger-disconnected');
      console.log(`Partner ${partnerId} notified of disconnection, auto-matching...`);
      findMatch(partnerSocket, io);
    }
  }
  
  socketState.removeFromQueue(socketId, socketState.getTextQueue());
  socketState.removeFromQueue(socketId, socketState.getCollegeQueue());
  
  socketState.deleteUserProfile(socketId);
}
