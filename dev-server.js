import { spawn } from 'child_process';

// Start the WebSocket server
const wsServer = spawn('node', ['websocket-server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the Vite dev server
const viteServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  wsServer.kill();
  viteServer.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  wsServer.kill();
  viteServer.kill();
  process.exit();
});
