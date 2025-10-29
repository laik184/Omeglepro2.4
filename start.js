import { spawn } from 'child_process';

console.log('Starting Omegle Web application...');

const wsServer = spawn('node', ['websocket-server.js'], {
  stdio: 'inherit',
  shell: false
});

wsServer.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

setTimeout(() => {
  const viteServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: false
  });

  viteServer.on('error', (error) => {
    console.error('Vite server error:', error);
  });

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
}, 1000);
