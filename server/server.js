import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupSignalingHandler } from './signaling/signalingHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3050;
const SESSION_EXPIRY_MINUTES = parseInt(process.env.SESSION_EXPIRY_MINUTES || '15', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);

/**
 * Public configuration endpoint for STUN/TURN servers
 * Allows frontend to fetch ICE configuration dynamically without hardcoding
 */
app.get('/api/config', (req, res) => {
  const iceServers = [
    {
      urls: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302'
    }
  ];

  if (process.env.TURN_SERVER_URL) {
    const turnConfig = {
      urls: process.env.TURN_SERVER_URL
    };
    if (process.env.TURN_USERNAME) turnConfig.username = process.env.TURN_USERNAME;
    if (process.env.TURN_PASSWORD) turnConfig.credential = process.env.TURN_PASSWORD;
    iceServers.push(turnConfig);
  }

  res.json({
    iceServers,
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '2048', 10),
    sessionExpiryMinutes: SESSION_EXPIRY_MINUTES
  });
});

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize WebRTC Signaling Handlers
setupSignalingHandler(io, SESSION_EXPIRY_MINUTES);

// Serve static frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('P2P File Transfer Server Running. Build frontend to view interface.');
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  P2P Signaling Server running on port ${PORT}`);
  console.log(`  Architecture: Direct WebRTC Browser-to-Browser`);
  console.log(`  NO file uploads or storage on server`);
  console.log(`====================================================`);
});
