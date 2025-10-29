# Omegle Web

## Overview
A full-stack Omegle alternative - a modern, safer video and text chat platform built with React and Socket.IO. Users can connect with random strangers for text or video chat with interest-based matching.

## Project Structure
- **Frontend**: React + Vite application (Port 5000)
- **Backend**: WebSocket server with Socket.IO (Port 3001)
- **Build Tool**: Vite
- **Package Manager**: npm

## Technology Stack
### Frontend
- React 18.2.0
- Vite 5.1.0
- React Router DOM 7.9.3
- Socket.IO Client
- SimplePeer (WebRTC)

### Backend
- Express
- Socket.IO Server
- Nodemailer (for feedback/reports)

## Key Files
- `src/main.jsx` - Application entry point
- `src/App.jsx` - Root component with routing
- `src/Components/OmegleWeb.jsx` - Landing page
- `src/Components/ChatRoom.jsx` - Text chat interface
- `src/Components/VideoRoom.jsx` - Video chat interface
- `websocket-server.js` - WebSocket server (development)
- `server.js` - Production server with Socket.IO
- `dev-server.js` - Starts both frontend and backend for development
- `vite.config.js` - Vite configuration with Socket.IO proxy

## Development
The development environment runs two servers:
1. **Vite Dev Server** (Port 5000) - Frontend with HMR
2. **WebSocket Server** (Port 3001) - Backend Socket.IO server

Run with: `node dev-server.js`

## Features
1. **Text Chat**: Random text chat with strangers
2. **Video Chat**: WebRTC-based video chat
3. **Interest Matching**: Connect with people who share your interests
4. **College Mode**: Special mode for .edu email users
5. **Content Moderation**: Built-in moderation system
6. **User Reporting**: Report inappropriate users
7. **Feedback System**: Email-based feedback collection

## Configuration
- Vite configured with `allowedHosts: true` for Replit proxy
- Global polyfills added for Node.js compatibility in browser (simple-peer)
- Socket.IO proxy configured in Vite to route /socket.io to port 3001

## Environment Variables (Optional)
- `GMAIL_USER` - Email for feedback/reports
- `GMAIL_APP_PASSWORD` - Gmail app password
- `ADMIN_KEY` - Admin access key for stats

## Recent Changes (October 29, 2025)
- GitHub import setup completed for Replit environment
- Fixed Vite configuration with allowedHosts for Replit proxy
- Installed missing dependencies: socket.io-client, simple-peer
- Added global/process polyfills to fix browser compatibility
- Configured workflow to run both frontend and backend servers
- Created .gitignore for Node.js/React projects
- Fixed white screen issue caused by missing Node.js globals

## Deployment
For production, use `server.js` which includes both the static file serving and Socket.IO functionality in one server.
