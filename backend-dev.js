import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from './server/socket/registerHandlers.js';
import db from './server/database/db.js';
import socketState from './server/socket/socketState.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

db.initializeDatabase();

const blockedIPs = db.getAllBlockedIPs();
socketState.loadBlockedIPsFromDatabase(blockedIPs);

registerSocketHandlers(io);

const PORT = 3001;
httpServer.listen(PORT, "localhost", () => {
  console.log(`Backend Socket.IO server running on http://localhost:${PORT}`);
  console.log(`- Database initialized`);
  console.log(`- Socket.IO handlers registered`);
  console.log(`- Loaded ${blockedIPs.length} blocked IPs`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    db.db.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    db.db.close();
  });
});
