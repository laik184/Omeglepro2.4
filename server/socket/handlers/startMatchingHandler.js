import { findMatch } from '../helpers/matchmaking.js';

export function startMatchingHandler(socket, io) {
  return () => {
    console.log(`User ${socket.id} started matching`);
    findMatch(socket, io);
  };
}
