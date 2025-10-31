 // ✅ Imports
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';

const app = express();
const httpServer = createServer(app);

// ✅ Fix __dirname (for ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve Frontend Build
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ✅ Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: "*", // ⚠️ Replace with frontend URL if needed
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ WebSocket Server Setup (for raw WebSocket connections if needed)
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws' // Different path to avoid conflicts
});

// ✅ Data Stores
const rooms = { text: new Set(), video: new Set() };
const textQueue = [];
const collegeQueue = [];
const pairings = new Map();
const userProfiles = new Map();
const wsConnections = new Map(); // For raw WebSocket connections

// ✅ Helper: Calculate Common Interests
function calculateCommonInterests(interests1, interests2) {
  if (!interests1 || !interests2) return [];
  return interests1.filter((interest) =>
    interests2.some((i) => i.toLowerCase() === interest.toLowerCase())
  );
}

// ✅ Find Match & Pair Users
function findMatch(socket) {
  const userProfile = userProfiles.get(socket.id);
  if (!userProfile) {
    socket.emit("searching");
    return;
  }

  const queue = userProfile.isCollegeMode ? collegeQueue : textQueue;

  // Remove duplicates from queue
  const existingIndex = queue.findIndex((s) => s.id === socket.id);
  if (existingIndex !== -1) queue.splice(existingIndex, 1);

  let bestMatch = null;
  let maxCommonInterests = 0;
  let bestMatchIndex = -1;

  // Match by common interests
  queue.forEach((stranger, index) => {
    const strangerProfile = userProfiles.get(stranger.id);
    if (!strangerProfile) return;
    const common = calculateCommonInterests(
      userProfile.interests,
      strangerProfile.interests
    );
    if (common.length > maxCommonInterests) {
      maxCommonInterests = common.length;
      bestMatch = stranger;
      bestMatchIndex = index;
    }
  });

  if (!bestMatch && queue.length > 0) {
    bestMatch = queue[0];
    bestMatchIndex = 0;
  }

  if (bestMatch && bestMatch.id !== socket.id) {
    queue.splice(bestMatchIndex, 1);

    pairings.set(socket.id, bestMatch.id);
    pairings.set(bestMatch.id, socket.id);

    const strangerProfile = userProfiles.get(bestMatch.id);
    const commonInterests = calculateCommonInterests(
      userProfile.interests,
      strangerProfile ? strangerProfile.interests : []
    );

    // ✅ Send match info with initiator flag
    socket.emit("matched", {
      strangerId: bestMatch.id,
      commonInterests,
      initiator: true
    });
    bestMatch.emit("matched", {
      strangerId: socket.id,
      commonInterests,
      initiator: false
    });

    console.log(
      `Matched: ${socket.id} <-> ${bestMatch.id} | Interests: ${commonInterests.join(
        ", "
      )}`
    );
  } else {
    queue.push(socket);
    socket.emit("searching");
    console.log(`User ${socket.id} added to queue (${queue.length})`);
  }
}

// ✅ Disconnect Helper
function disconnectPair(socketId) {
  const partnerId = pairings.get(socketId);
  if (partnerId) {
    pairings.delete(socketId);
    pairings.delete(partnerId);
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit("stranger-disconnected");
      findMatch(partnerSocket);
    }
  }
  ["text", "video"].forEach((r) => rooms[r].delete(socketId));
  userProfiles.delete(socketId);
  wsConnections.delete(socketId);
}

// ✅ Handle raw WebSocket messages
function handleWebSocketMessage(socketId, message) {
  try {
    const data = JSON.parse(message);
    const partnerId = pairings.get(socketId);
    
    if (data.type === 'webrtc-signal' && partnerId) {
      // Forward to partner via Socket.IO
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("webrtc-signal", {
          signal: data.signal,
          from: socketId
        });
      }
      
      // Also forward to partner via raw WebSocket if they're using it
      const partnerWS = wsConnections.get(partnerId);
      if (partnerWS && partnerWS.readyState === partnerWS.OPEN) {
        partnerWS.send(JSON.stringify({
          type: 'webrtc-signal',
          signal: data.signal,
          from: socketId
        }));
      }
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
}

// ✅ Socket.IO Events
io.on("connection", (socket) => {
  console.log("User connected via Socket.IO:", socket.id);

  socket.on("join-room", (data) => {
    const roomType = typeof data === "string" ? data : data.roomType;
    const interests = data.interests || [];
    const isCollegeMode = data.isCollegeMode || false;

    userProfiles.set(socket.id, {
      interests,
      isCollegeMode
    });

    if (roomType === "text" || roomType === "video") {
      rooms[roomType].add(socket.id);
      socket.join(roomType);
      io.to(roomType).emit("user-count", rooms[roomType].size);
      console.log(`User ${socket.id} joined ${roomType} room.`);
    }
  });

  socket.on("start-matching", () => {
    console.log(`User ${socket.id} started matching`);
    findMatch(socket);
  });

  // ✅ WebRTC Signaling Forwarding
  socket.on("webrtc-signal", (data) => {
    const partnerId = pairings.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("webrtc-signal", {
          signal: data.signal,
          from: socket.id
        });
      }
      
      // Also forward to partner via raw WebSocket if they're using it
      const partnerWS = wsConnections.get(partnerId);
      if (partnerWS && partnerWS.readyState === partnerWS.OPEN) {
        partnerWS.send(JSON.stringify({
          type: 'webrtc-signal',
          signal: data.signal,
          from: socket.id
        }));
      }
      
      console.log(`WebRTC signal forwarded from ${socket.id} → ${partnerId}`);
    }
  });

  socket.on("skip-stranger", () => {
    console.log(`User ${socket.id} skipped stranger`);
    disconnectPair(socket.id);
    findMatch(socket);
  });

  socket.on("leave-room", (roomType) => {
    if (roomType === "text" || roomType === "video") {
      rooms[roomType].delete(socket.id);
      socket.leave(roomType);
      io.to(roomType).emit("user-count", rooms[roomType].size);
    }
    disconnectPair(socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected (Socket.IO)`);
    disconnectPair(socket.id);
  });
});

// ✅ Raw WebSocket Server Events
wss.on('connection', (ws, req) => {
  const socketId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log("User connected via raw WebSocket:", socketId);
  
  wsConnections.set(socketId, ws);
  
  ws.on('message', (message) => {
    handleWebSocketMessage(socketId, message.toString());
  });
  
  ws.on('close', () => {
    console.log(`User ${socketId} disconnected (WebSocket)`);
    disconnectPair(socketId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${socketId}:`, error);
    disconnectPair(socketId);
  });
});

// ✅ Start Single Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Consolidated server running on port ${PORT}`);
  console.log(`- Express serving static files from /dist`);
  console.log(`- Socket.IO available on /socket.io/`);
  console.log(`- Raw WebSocket available on /ws`);
});
