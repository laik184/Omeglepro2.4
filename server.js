import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { moderator, analyzeWithAI } from './src/service/contentModeration.js';
import { loadBalancer } from './src/service/loadBalancer.js';

const app = express();
const httpServer = createServer(app);

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Port
const PORT = process.env.PORT || 5000;

// Serve Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Socket.IO setup for production with security
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true
});

const rooms = {
  text: new Set(),
  video: new Set()
};

// Separate queues for normal and college mode
const textQueue = [];
const collegeQueue = [];
const pairings = new Map();
const userProfiles = new Map(); // Store user interests and mode

// IP tracking and blocking
const ipReports = new Map(); // IP -> { count: number, reasons: string[], reporters: Set<string> }
const blockedIPs = new Set();
const socketIPs = new Map(); // socketId -> IP
const reportCooldowns = new Map(); // socketId -> timestamp of last report

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendFeedbackEmail(feedback, userIP) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('Email not configured. Feedback:', feedback);
    return;
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: 'Omegle Web - New User Feedback',
    html: `
      <h2>New Feedback Received</h2>
      <p><strong>From IP:</strong> ${userIP}</p>
      <p><strong>Feedback:</strong></p>
      <p>${feedback}</p>
      <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Feedback email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendReportEmail(reportedIP, reportReason, reportCount) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('Email not configured. Report:', reportReason);
    return;
  }

  const status = reportCount >= 4 ? 'BLOCKED' : 'REPORTED';
  
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `Omegle Web - User ${status}`,
    html: `
      <h2>User Report Alert</h2>
      <p><strong>Reported IP:</strong> ${reportedIP}</p>
      <p><strong>Report Reason:</strong> ${reportReason}</p>
      <p><strong>Total Reports:</strong> ${reportCount}</p>
      <p><strong>Status:</strong> ${status}</p>
      ${reportCount >= 4 ? '<p style="color: red;"><strong>⚠️ This IP has been automatically blocked!</strong></p>' : ''}
      <p><em>Report time: ${new Date().toLocaleString()}</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Report email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

function calculateCommonInterests(interests1, interests2) {
  if (!interests1 || !interests2 || interests1.length === 0 || interests2.length === 0) {
    return [];
  }
  return interests1.filter(interest => 
    interests2.some(int => int.toLowerCase() === interest.toLowerCase())
  );
}

function findMatch(socket) {
  const userProfile = userProfiles.get(socket.id);
  if (!userProfile) {
    socket.emit('searching');
    return;
  }

  const queue = userProfile.isCollegeMode ? collegeQueue : textQueue;
  
  // Remove socket from queue if already there
  const existingIndex = queue.findIndex(s => s.id === socket.id);
  if (existingIndex !== -1) {
    queue.splice(existingIndex, 1);
  }
  
  let bestMatch = null;
  let maxCommonInterests = 0;
  let bestMatchIndex = -1;

  // Find best match based on common interests
  if (userProfile.interests && userProfile.interests.length > 0) {
    queue.forEach((stranger, index) => {
      if (stranger.id === socket.id) return;
      
      const strangerProfile = userProfiles.get(stranger.id);
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
  
  // If no interest match found, match with first available
  if (!bestMatch && queue.length > 0) {
    bestMatch = queue[0];
    bestMatchIndex = 0;
  }

  if (bestMatch && bestMatch.id !== socket.id) {
    queue.splice(bestMatchIndex, 1);
    
    const strangerProfile = userProfiles.get(bestMatch.id);
    const commonInterests = calculateCommonInterests(
      userProfile.interests,
      strangerProfile ? strangerProfile.interests : []
    );
    
    pairings.set(socket.id, bestMatch.id);
    pairings.set(bestMatch.id, socket.id);
    
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

function disconnectPair(socketId) {
  const partnerId = pairings.get(socketId);
  
  if (partnerId) {
    pairings.delete(socketId);
    pairings.delete(partnerId);
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('stranger-disconnected');
      console.log(`Partner ${partnerId} notified of disconnection, auto-matching...`);
      findMatch(partnerSocket);
    }
  }
  
  // Remove from both queues
  const textIndex = textQueue.findIndex(s => s.id === socketId);
  if (textIndex !== -1) {
    textQueue.splice(textIndex, 1);
  }
  
  const collegeIndex = collegeQueue.findIndex(s => s.id === socketId);
  if (collegeIndex !== -1) {
    collegeQueue.splice(collegeIndex, 1);
  }
  
  userProfiles.delete(socketId);
}

io.on('connection', (socket) => {
  // Get client IP address
  const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || 
                   socket.handshake.address;
  
  // Register user with moderator first
  moderator.registerUser(socket.id, clientIP);
  
  // Check if IP is blocked (report-based or moderation-based)
  if (blockedIPs.has(clientIP) || moderator.isIPBlocked(clientIP)) {
    console.log(`Blocked IP attempted connection: ${clientIP}`);
    socket.emit('blocked', { message: 'Your IP has been blocked due to violations.' });
    socket.disconnect(true);
    moderator.unregisterUser(socket.id);
    return;
  }
  
  socketIPs.set(socket.id, clientIP);
  
  // Load balancer assignment
  const serverId = loadBalancer.getServerForUser(socket.id);
  console.log('User connected:', socket.id, 'IP:', clientIP, 'Server:', serverId);

  socket.on('join-room', (data) => {
    const roomType = typeof data === 'string' ? data : data.roomType;
    const interests = data.interests || [];
    const isCollegeMode = data.isCollegeMode || false;
    const collegeEmail = data.collegeEmail || null;
    
    // Store user profile
    userProfiles.set(socket.id, {
      interests: interests,
      isCollegeMode: isCollegeMode,
      collegeEmail: collegeEmail
    });
    
    if (roomType === 'text' || roomType === 'video') {
      rooms[roomType].add(socket.id);
      socket.join(roomType);
      
      io.to(roomType).emit('user-count', rooms[roomType].size);
      console.log(`User ${socket.id} joined ${roomType} room. Interests: ${interests.join(', ')}, College mode: ${isCollegeMode}`);
    }
  });

  socket.on('start-matching', () => {
    console.log(`User ${socket.id} started matching`);
    findMatch(socket);
  });

  socket.on('send-message', async (data) => {
    const partnerId = pairings.get(socket.id);
    if (!partnerId) return;
    
    const moderationResult = moderator.checkMessage(socket.id, data.message);
    
    if (moderationResult.action === 'BLOCK') {
      socket.emit('message-blocked', { 
        reason: 'Your message was blocked due to policy violations',
        violations: moderationResult.violations 
      });
      console.log(`Message blocked from ${socket.id}:`, moderationResult.violations);
      
      if (moderator.isUserBlocked(socket.id)) {
        socket.emit('user-blocked', { 
          message: 'You have been blocked due to repeated violations' 
        });
        socket.disconnect(true);
      }
      return;
    }
    
    const messageToSend = moderationResult.action === 'FILTER' 
      ? moderationResult.filteredMessage 
      : data.message;
    
    if (moderationResult.action === 'FILTER') {
      socket.emit('message-filtered', { 
        message: 'Some content in your message was filtered' 
      });
    }
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('receive-message', { text: messageToSend, sender: 'stranger' });
      console.log(`Message from ${socket.id} to ${partnerId}: ${messageToSend}`);
    }
  });

  socket.on('typing', () => {
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('stranger-typing');
      }
    }
  });

  socket.on('stop-typing', () => {
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('stranger-stop-typing');
      }
    }
  });

  socket.on('skip-stranger', () => {
    console.log(`User ${socket.id} skipped stranger`);
    const partnerId = pairings.get(socket.id);
    
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      pairings.delete(socket.id);
      pairings.delete(partnerId);
      
      if (partnerSocket) {
        partnerSocket.emit('stranger-disconnected');
        console.log(`Partner ${partnerId} notified of disconnection, auto-matching...`);
        findMatch(partnerSocket);
      }
      socket.emit('you-disconnected');
      
      console.log(`User ${socket.id} disconnected from ${partnerId}`);
    }
    
    findMatch(socket);
  });

  socket.on('submit-feedback', async (data) => {
    const userIP = socketIPs.get(socket.id) || 'unknown';
    const feedback = data.feedback;
    
    console.log(`Feedback received from ${socket.id} (${userIP}): ${feedback}`);
    
    await sendFeedbackEmail(feedback, userIP);
    socket.emit('feedback-received', { message: 'Thank you for your feedback!' });
  });

  socket.on('report-user', async (data) => {
    const reporterIP = socketIPs.get(socket.id) || 'unknown';
    const partnerId = pairings.get(socket.id);
    
    if (!partnerId) {
      socket.emit('report-failed', { message: 'No active chat to report.' });
      return;
    }
    
    // Rate limiting: 60 second cooldown between reports
    const now = Date.now();
    const lastReport = reportCooldowns.get(socket.id);
    if (lastReport && now - lastReport < 60000) {
      const waitTime = Math.ceil((60000 - (now - lastReport)) / 1000);
      socket.emit('report-failed', { message: `Please wait ${waitTime} seconds before reporting again.` });
      return;
    }
    
    const reportedIP = socketIPs.get(partnerId);
    
    if (!reportedIP) {
      console.log('Could not find IP for reported user');
      return;
    }
    
    // Initialize or update report count for this IP
    if (!ipReports.has(reportedIP)) {
      ipReports.set(reportedIP, { count: 0, reasons: [], reporters: new Set() });
    }
    
    const reportData = ipReports.get(reportedIP);
    
    // Check if this reporter has already reported this IP
    if (reportData.reporters.has(reporterIP)) {
      socket.emit('report-failed', { message: 'You have already reported this user.' });
      return;
    }
    
    // Add reporter and increment count
    reportData.reporters.add(reporterIP);
    reportData.count += 1;
    reportData.reasons.push(data.reportReason || 'No reason provided');
    reportCooldowns.set(socket.id, now);
    
    console.log(`User ${partnerId} (${reportedIP}) reported by ${socket.id} (${reporterIP}). Total unique reports: ${reportData.count}`);
    
    // Send email notification
    await sendReportEmail(reportedIP, data.reportReason, reportData.count);
    
    // Block IP if 4 or more UNIQUE reports from different IPs
    if (reportData.count >= 4 && !blockedIPs.has(reportedIP)) {
      blockedIPs.add(reportedIP);
      console.log(`IP ${reportedIP} has been blocked after ${reportData.count} unique reports`);
      
      // Disconnect the reported user
      const reportedSocket = io.sockets.sockets.get(partnerId);
      if (reportedSocket) {
        reportedSocket.emit('blocked', { 
          message: 'You have been blocked due to multiple reports.' 
        });
        reportedSocket.disconnect(true);
      }
      
      socket.emit('report-success', { 
        message: 'Report submitted. User has been blocked.',
        blocked: true 
      });
    } else {
      socket.emit('report-success', { 
        message: 'Report submitted. Thank you for keeping our community safe.',
        blocked: false 
      });
    }
  });

  socket.on('webrtc-signal', (data) => {
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('webrtc-signal', {
          signal: data.signal,
          from: socket.id
        });
        console.log(`WebRTC signal forwarded from ${socket.id} to ${partnerId}`);
      }
    }
  });

  socket.on('leave-room', (roomType) => {
    if (roomType === 'text' || roomType === 'video') {
      rooms[roomType].delete(socket.id);
      socket.leave(roomType);
      
      io.to(roomType).emit('user-count', rooms[roomType].size);
      console.log(`User ${socket.id} left ${roomType} room. Count: ${rooms[roomType].size}`);
    }
    
    disconnectPair(socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    disconnectPair(socket.id);
    socketIPs.delete(socket.id);
    reportCooldowns.delete(socket.id);
    
    // Remove from load balancer
    loadBalancer.removeUserFromServer(socket.id);
    
    // Clear moderation history and unregister
    moderator.clearUserHistory(socket.id);
    moderator.unregisterUser(socket.id);
    
    ['text', 'video'].forEach(roomType => {
      if (rooms[roomType].has(socket.id)) {
        rooms[roomType].delete(socket.id);
        io.to(roomType).emit('user-count', rooms[roomType].size);
        console.log(`User ${socket.id} disconnected from ${roomType} room. Count: ${rooms[roomType].size}`);
      }
    });
  });
  
  // Admin endpoint to get moderation stats
  socket.on('get-moderation-stats', () => {
    if (socket.handshake.headers['x-admin-key'] === process.env.ADMIN_KEY) {
      socket.emit('moderation-stats', moderator.getStats());
    }
  });
  
  // Admin endpoint to get load balancer stats
  socket.on('get-load-stats', () => {
    if (socket.handshake.headers['x-admin-key'] === process.env.ADMIN_KEY) {
      socket.emit('load-stats', loadBalancer.getServerStats());
    }
  });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

