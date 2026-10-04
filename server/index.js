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
import deviceRoutes, { setPairingRegistry, setDeviceWsBroadcaster } from './routes/devices.js';
import modelRoutes from './routes/model.js';
import trainingRoutes from './routes/training.js';
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

// ---------------------------------------------------------------------------
// Active WebSocket Connections Store (dashboard / generic clients)
// ---------------------------------------------------------------------------
const clients = new Set();

// ---------------------------------------------------------------------------
// Pairing Registry
// Maps pairingCode (string) → { ws, deviceId, deviceLabel, deviceModel,
//                                battery, firmwareVersion, connectedAt }
// Populated when a Quest headset sends a "device.register" WS message.
// Cleared automatically when the socket closes.
// ---------------------------------------------------------------------------
const pairingRegistry = new Map();

// Inject the shared registry into the devices route so /api/devices/pair
// and /api/devices/active can access live connections
setPairingRegistry(pairingRegistry);

// ---------------------------------------------------------------------------
// WebSocket Connection Handler
// ---------------------------------------------------------------------------
wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WebSocket] New client connected from ${req.socket.remoteAddress}. Total active: ${clients.size}`);

  ws.send(JSON.stringify({
    type: 'connection.established',
    message: 'Connected to AdaptVR Real-Time Telemetry Stream',
  }));

  // Track which pairing code this socket owns (if it is a Quest headset)
  ws._pairingCode = null;

  ws.on('message', async (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (e) {
      console.error('[WebSocket] Error parsing message:', e.message);
      return;
    }

    console.log(`[WebSocket] Received message type: ${parsed.type}`);

    // ------------------------------------------------------------------
    // device.register  — sent by the Quest app on startup
    // Payload: { type, pairingCode, deviceLabel?, deviceModel?, battery?,
    //            firmwareVersion?, serialNumber? }
    // ------------------------------------------------------------------
    if (parsed.type === 'device.register') {
      const code = String(parsed.pairingCode || '').trim().toUpperCase();

      if (!code) {
        ws.send(JSON.stringify({ type: 'device.register.error', error: 'pairingCode is required' }));
        return;
      }

      // If this socket previously held a different code, remove it
      if (ws._pairingCode && ws._pairingCode !== code) {
        pairingRegistry.delete(ws._pairingCode);
      }

      ws._pairingCode = code;

      // Try to match this code to a persisted VR_DEVICE record (by serial number or pairing code)
      let deviceId = null;
      try {
        const devRes = await query(
          `UPDATE VR_DEVICE
           SET pairing_code = $1, status = 'online',
               battery_level = COALESCE($2, battery_level), firmware_version = COALESCE($3, firmware_version),
               last_seen = CURRENT_TIMESTAMP
           WHERE ($4::text IS NOT NULL AND serial_number = $4) 
              OR pairing_code = $1 
              OR REPLACE(pairing_code, '-', '') = REPLACE($1, '-', '')
           RETURNING device_id, device_label`,
          [
            code,
            parsed.battery ?? null,
            parsed.firmwareVersion ?? null,
            parsed.serialNumber ?? null,
          ]
        );

        if (devRes.rows.length > 0) {
          deviceId = devRes.rows[0].device_id;
          parsed.deviceLabel = devRes.rows[0].device_label || parsed.deviceLabel;
        }
      } catch (dbErr) {
        console.warn('[WebSocket] Could not update VR_DEVICE record:', dbErr.message);
      }

      // Register in the in-memory pairing map
      pairingRegistry.set(code, {
        ws,
        deviceId,
        deviceLabel: parsed.deviceLabel || 'Quest Headset',
        deviceModel: parsed.deviceModel || 'Meta Quest 2',
        serialNumber: parsed.serialNumber || null,
        battery: parsed.battery ?? null,
        firmwareVersion: parsed.firmwareVersion || null,
        connectedAt: new Date().toISOString(),
      });

      console.log(`[Pairing] Headset registered with code: ${code} (label: "${parsed.deviceLabel || 'none'}", active: ${pairingRegistry.size})`);

      // Acknowledge back to headset, including whether it is already registered in inventory
      ws.send(JSON.stringify({
        type: 'device.register.ack',
        pairingCode: code,
        deviceLabel: parsed.deviceLabel,
        isLinked: !!deviceId,
        message: deviceId
          ? `Linked as "${parsed.deviceLabel}". Waiting for instructor to start module...`
          : 'Registered — display this code and wait for instructor.',
      }));

      // Notify dashboard that a new headset is available
      broadcast({
        type: 'device.connected',
        pairingCode: code,
        deviceLabel: parsed.deviceLabel || 'Quest Headset',
        deviceModel: parsed.deviceModel || 'Meta Quest 2',
        battery: parsed.battery ?? null,
      });

      return;
    }

    // ------------------------------------------------------------------
    // All other incoming messages — broadcast to dashboard subscribers
    // ------------------------------------------------------------------
    broadcast({
      type: parsed.type || 'client.message',
      data: parsed.data || parsed,
    });
  });

  ws.on('close', async () => {
    clients.delete(ws);

    // Clean up pairing registry if this was a headset
    if (ws._pairingCode) {
      const code = ws._pairingCode;
      const entry = pairingRegistry.get(code);
      pairingRegistry.delete(code);

      console.log(`[Pairing] Headset disconnected, removed code: ${code} (active codes: ${pairingRegistry.size})`);

      // Mark device offline in DB (preserve pairing_code so reconnecting headset is recognized)
      if (entry?.deviceId) {
        query(
          `UPDATE VR_DEVICE
           SET status = 'offline', last_seen = CURRENT_TIMESTAMP
           WHERE device_id = $1`,
          [entry.deviceId]
        ).catch((e) => console.warn('[WebSocket] Could not mark device offline:', e.message));
      }

      broadcast({
        type: 'device.disconnected',
        pairingCode: code,
        deviceLabel: entry?.deviceLabel,
      });
    }

    console.log(`[WebSocket] Client disconnected. Total active: ${clients.size}`);
  });
});

// ---------------------------------------------------------------------------
// Broadcast Helper — sends to all open dashboard / generic clients
// ---------------------------------------------------------------------------
function broadcast(payload) {
  const jsonPayload = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonPayload);
    }
  }
}

// Inject broadcast capability into session routes and device routes
setWsBroadcaster(broadcast);
setDeviceWsBroadcaster(broadcast);

// ---------------------------------------------------------------------------
// Register REST API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/training', trainingRoutes);


// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await query('SELECT NOW()');

    // Fetch active model version (non-blocking — fails gracefully)
    let activeModel = 'v1 (baseline)';
    let trainingExamples = 0;
    try {
      const modelRes = await query(
        `SELECT version FROM MODEL_MANIFEST WHERE is_active = TRUE ORDER BY release_date DESC LIMIT 1`
      );
      if (modelRes.rows.length > 0) activeModel = modelRes.rows[0].version;

      const trainingRes = await query(`SELECT COUNT(*)::INTEGER AS cnt FROM TRAINING_FEATURE`);
      trainingExamples = trainingRes.rows[0].cnt;
    } catch (_) { /* DB tables may not exist yet — swallow */ }

    res.json({
      status: 'online',
      service: 'AdaptVR Core Backend Service',
      version: '1.0.0',
      timestamp: dbRes.rows[0].now,
      active_ws_connections: clients.size,
      active_headsets: pairingRegistry.size,
      active_pairing_codes: Array.from(pairingRegistry.keys()),
      active_model_version: activeModel,
      training_examples_accumulated: trainingExamples,
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
  console.log(`  - Device Pairing: ws://localhost:${PORT}  (device.register)`);
  console.log(`======================================================\n`);
});

export default app;
