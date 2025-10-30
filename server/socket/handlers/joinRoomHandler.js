import socketState from '../socketState.js';

export function joinRoomHandler(socket, io) {
  return (data) => {
    const roomType = typeof data === 'string' ? data : data.roomType;
    const interests = data.interests || [];
    const isCollegeMode = data.isCollegeMode || false;
    const collegeEmail = data.collegeEmail || null;
    
    socketState.setUserProfile(socket.id, {
      interests: interests,
      isCollegeMode: isCollegeMode,
      collegeEmail: collegeEmail
    });
    
    const rooms = socketState.getRooms();
    if (roomType === 'text' || roomType === 'video') {
      rooms[roomType].add(socket.id);
      socket.join(roomType);
      
      io.to(roomType).emit('user-count', rooms[roomType].size);
      console.log(`User ${socket.id} joined ${roomType} room. Interests: ${interests.join(', ')}, College mode: ${isCollegeMode}`);
    }
  };
}
