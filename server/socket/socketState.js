class SocketState {
  constructor() {
    this.rooms = {
      text: new Set(),
      video: new Set()
    };

    this.textQueue = [];
    this.collegeQueue = [];
    this.pairings = new Map();
    this.userProfiles = new Map();
    this.recentPartners = new Map();
    
    this.uniqueRooms = new Map();
    this.socketToRoomId = new Map();

    this.ipReports = new Map();
    this.blockedIPs = new Set();
    this.socketIPs = new Map();
    this.reportCooldowns = new Map();
  }

  getRooms() {
    return this.rooms;
  }

  getTextQueue() {
    return this.textQueue;
  }

  getCollegeQueue() {
    return this.collegeQueue;
  }

  getPairings() {
    return this.pairings;
  }

  getUserProfiles() {
    return this.userProfiles;
  }

  getIPReports() {
    return this.ipReports;
  }

  getBlockedIPs() {
    return this.blockedIPs;
  }

  getSocketIPs() {
    return this.socketIPs;
  }

  getReportCooldowns() {
    return this.reportCooldowns;
  }

  addToTextQueue(socket) {
    this.textQueue.push(socket);
  }

  addToCollegeQueue(socket) {
    this.collegeQueue.push(socket);
  }

  removeFromQueue(socketId, queue) {
    const index = queue.findIndex(s => s.id === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  setPairing(socket1Id, socket2Id) {
    this.pairings.set(socket1Id, socket2Id);
    this.pairings.set(socket2Id, socket1Id);
  }

  removePairing(socketId) {
    const partnerId = this.pairings.get(socketId);
    if (partnerId) {
      this.pairings.delete(socketId);
      this.pairings.delete(partnerId);
    }
    return partnerId;
  }

  setUserProfile(socketId, profile) {
    this.userProfiles.set(socketId, profile);
  }

  getUserProfile(socketId) {
    return this.userProfiles.get(socketId);
  }

  deleteUserProfile(socketId) {
    this.userProfiles.delete(socketId);
  }

  setSocketIP(socketId, ip) {
    this.socketIPs.set(socketId, ip);
  }

  getSocketIP(socketId) {
    return this.socketIPs.get(socketId);
  }

  deleteSocketIP(socketId) {
    this.socketIPs.delete(socketId);
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  blockIP(ip) {
    this.blockedIPs.add(ip);
  }

  getIPReport(ip) {
    return this.ipReports.get(ip);
  }

  initializeIPReport(ip) {
    this.ipReports.set(ip, { count: 0, reasons: [], reporters: new Set() });
  }

  setReportCooldown(socketId, timestamp) {
    this.reportCooldowns.set(socketId, timestamp);
  }

  getReportCooldown(socketId) {
    return this.reportCooldowns.get(socketId);
  }

  deleteReportCooldown(socketId) {
    this.reportCooldowns.delete(socketId);
  }

  addRecentPartner(socketId, partnerId) {
    if (!this.recentPartners.has(socketId)) {
      this.recentPartners.set(socketId, []);
    }
    const partners = this.recentPartners.get(socketId);
    partners.unshift(partnerId);
    if (partners.length > 5) {
      partners.pop();
    }
  }

  isRecentPartner(socketId, partnerId) {
    const partners = this.recentPartners.get(socketId);
    return partners && partners.includes(partnerId);
  }

  clearRecentPartners(socketId) {
    this.recentPartners.delete(socketId);
  }

  createUniqueRoom(roomId, socket1, socket2) {
    this.uniqueRooms.set(roomId, new Set([socket1.id, socket2.id]));
    this.socketToRoomId.set(socket1.id, roomId);
    this.socketToRoomId.set(socket2.id, roomId);
  }

  getUniqueRoomId(socketId) {
    return this.socketToRoomId.get(socketId);
  }

  getUniqueRoomSockets(roomId) {
    return this.uniqueRooms.get(roomId);
  }

  removeFromUniqueRoom(socketId) {
    const roomId = this.socketToRoomId.get(socketId);
    if (roomId) {
      const roomSockets = this.uniqueRooms.get(roomId);
      if (roomSockets) {
        roomSockets.delete(socketId);
        if (roomSockets.size === 0) {
          this.uniqueRooms.delete(roomId);
        }
      }
      this.socketToRoomId.delete(socketId);
    }
    return roomId;
  }

  cleanup(socketId) {
    this.deleteUserProfile(socketId);
    this.deleteSocketIP(socketId);
    this.deleteReportCooldown(socketId);
    this.clearRecentPartners(socketId);
    this.removeFromQueue(socketId, this.textQueue);
    this.removeFromQueue(socketId, this.collegeQueue);
    this.removeFromUniqueRoom(socketId);
  }
}

const socketState = new SocketState();
export default socketState;
