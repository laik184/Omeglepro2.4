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

  cleanup(socketId) {
    this.deleteUserProfile(socketId);
    this.deleteSocketIP(socketId);
    this.deleteReportCooldown(socketId);
    this.removeFromQueue(socketId, this.textQueue);
    this.removeFromQueue(socketId, this.collegeQueue);
  }
}

const socketState = new SocketState();
export default socketState;
