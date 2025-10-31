import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './server/socket/registerHandlers.js';
import database from './server/database/db.js';
import socketState from './server/socket/socketState.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.WS_PORT || 3001;

database.initializeDatabase();

console.log('Loading blocked IPs from database...');
const blockedIPs = database.getAllBlockedIPs();
console.log(`Found ${blockedIPs.length} blocked IPs in database`);
blockedIPs.forEach(entry => {
  console.log(`  - ${entry.ip_address} (${entry.report_count} reports, blocked at ${entry.blocked_at})`);
});

socketState.loadBlockedIPsFromDatabase(blockedIPs);
console.log('Blocked IPs loaded into memory and will be enforced on new connections');

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  cookie: false
});

io.engine.on('connection_error', (err) => {
  console.error('Socket.IO engine connection error:', err);
});

httpServer.on('error', (error) => {
  console.error('HTTP server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

registerSocketHandlers(io);

setInterval(() => {
  database.cleanOldData(30);
}, 24 * 60 * 60 * 1000);

httpServer.listen(PORT, 'localhost', () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
