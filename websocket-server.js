import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './server/socket/registerHandlers.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

registerSocketHandlers(io);

const PORT = process.env.WS_PORT || 3001;
httpServer.listen(PORT, 'localhost', () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
