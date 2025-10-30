import { moderator } from '../../../src/service/contentModeration.js';
import { loadBalancer } from '../../../src/service/loadBalancer.js';

export function getModerationStatsHandler(socket, io) {
  return () => {
    if (socket.handshake.headers['x-admin-key'] === process.env.ADMIN_KEY) {
      socket.emit('moderation-stats', moderator.getStats());
    }
  };
}

export function getLoadStatsHandler(socket, io) {
  return () => {
    if (socket.handshake.headers['x-admin-key'] === process.env.ADMIN_KEY) {
      socket.emit('load-stats', loadBalancer.getServerStats());
    }
  };
}
