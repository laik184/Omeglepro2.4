import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './server/socket/registerHandlers.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.WS_PORT || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
  transports: ['websocket', 'polling']
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

httpServer.listen(PORT, 'localhost', () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
