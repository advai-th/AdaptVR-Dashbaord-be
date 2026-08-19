import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import moduleRoutes from './routes/modules.js';
import sessionRoutes, { setWsBroadcaster } from './routes/sessions.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
import { query } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON Parsing
app.use(cors());
app.use(express.json());

// Attach WebSocket Server
const wss = new WebSocketServer({ server });

// Active WebSocket Connections Store
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WebSocket] New client connected from ${req.socket.remoteAddress}. Total active: ${clients.size}`);

  ws.send(JSON.stringify({
    type: 'connection.established',
    message: 'Connected to AdaptVR Real-Time Telemetry Stream'
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      console.log(`[WebSocket Received]:`, parsed.type);
      
      // Echo or broadcast incoming client messages to all subscribers
      broadcast({
        type: parsed.type || 'client.message',
        data: parsed.data || parsed
      });
    } catch (e) {
      console.error('[WebSocket] Error parsing message:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total active: ${clients.size}`);
  });
});

// Broadcast Helper Function
function broadcast(payload) {
  const jsonPayload = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonPayload);
    }
  }
}

// Inject broadcast capability into session routes
setWsBroadcaster(broadcast);

// -------------------------------------------------------------------
// Register REST API Routes
// -------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await query('SELECT NOW()');
    res.json({
      status: 'online',
      service: 'AdaptVR Core Backend Service',
      version: '1.0.0',
      timestamp: dbRes.rows[0].now,
      active_ws_connections: clients.size
    });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` 🚀 AdaptVR Backend & Telemetry Server Running`);
  console.log(` ----------------------------------------------------`);
  console.log(`  - REST API Base:  http://localhost:${PORT}/api`);
  console.log(`  - Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`  - WebSocket URL: ws://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

export default app;
