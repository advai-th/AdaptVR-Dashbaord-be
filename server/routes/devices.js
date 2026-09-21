import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Pairing Registry (injected by server/index.js)
// Map<pairingCode, { ws, deviceId, deviceLabel, deviceModel, battery, connectedAt }>
// ---------------------------------------------------------------------------
let pairingRegistry = new Map();

export const setPairingRegistry = (registry) => {
  pairingRegistry = registry;
};

// Broadcast function (injected by server/index.js — same one used by sessions)
let broadcastWsEvent = () => {};
export const setDeviceWsBroadcaster = (fn) => { broadcastWsEvent = fn; };

// ---------------------------------------------------------------------------
// GET /api/devices
// Full persistent device inventory from the database
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM VR_DEVICE ORDER BY device_label ASC`
    );

    // Enrich each row with live connection status from the in-memory registry
    const enriched = result.rows.map((device) => {
      const isLive = device.pairing_code
        ? pairingRegistry.has(device.pairing_code)
        : false;

      return {
        ...device,
        is_live: isLive,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('[Devices] Error fetching device inventory:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/devices/active
// Returns only headsets that are currently connected (live WebSocket)
// This is what the teacher dashboard polls when pairing a session
// ---------------------------------------------------------------------------
router.get('/active', (req, res) => {
  const active = [];

  for (const [code, info] of pairingRegistry.entries()) {
    active.push({
      pairing_code: code,
      device_id: info.deviceId || null,
      device_label: info.deviceLabel || 'Unknown Device',
      device_model: info.deviceModel || 'Meta Quest 2',
      battery_level: info.battery ?? null,
      firmware_version: info.firmwareVersion || null,
      connected_at: info.connectedAt,
    });
  }

  res.json(active);
});

// ---------------------------------------------------------------------------
// POST /api/devices
// Register a new headset in the persistent inventory (run once per new device)
// Body: { device_label, device_model?, serial_number?, firmware_version? }
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { device_label, pairing_code, device_model, serial_number, firmware_version } = req.body;

  const trimmedLabel = device_label ? String(device_label).trim() : '';
  if (!trimmedLabel) {
    return res.status(400).json({ error: 'device_label is required (e.g. "Quest-01")' });
  }

  // If pairing_code was provided, check if it exists in pairingRegistry to inherit live hardware details
  let liveEntry = null;
  let normalisedCode = null;
  if (pairing_code) {
    normalisedCode = String(pairing_code).trim().toUpperCase();
    liveEntry = pairingRegistry.get(normalisedCode) || null;
  }

  const cleanModel = (liveEntry?.deviceModel) || (device_model && String(device_model).trim()) || 'Meta Quest 2';
  const cleanSerial = (liveEntry?.serialNumber) || (serial_number && String(serial_number).trim()) || null;
  const cleanFirmware = (liveEntry?.firmwareVersion) || (firmware_version && String(firmware_version).trim()) || null;
  const initialStatus = liveEntry ? 'online' : 'offline';
  const initialBattery = liveEntry?.battery ?? null;

  try {
    // If device already exists with this serial_number, update its label and pairing_code instead of failing
    let result;
    if (cleanSerial) {
      const existing = await query('SELECT * FROM VR_DEVICE WHERE serial_number = $1', [cleanSerial]);
      if (existing.rows.length > 0) {
        result = await query(
          `UPDATE VR_DEVICE
           SET device_label = $1,
               device_model = COALESCE($2, device_model),
               pairing_code = COALESCE($3, pairing_code),
               firmware_version = COALESCE($4, firmware_version),
               status = $5,
               battery_level = COALESCE($6, battery_level),
               last_seen = CURRENT_TIMESTAMP
           WHERE serial_number = $7
           RETURNING *`,
          [trimmedLabel, cleanModel, normalisedCode, cleanFirmware, initialStatus, initialBattery, cleanSerial]
        );
      }
    }

    if (!result) {
      result = await query(
        `INSERT INTO VR_DEVICE (device_label, device_model, serial_number, pairing_code, firmware_version, status, battery_level, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [trimmedLabel, cleanModel, cleanSerial, normalisedCode, cleanFirmware, initialStatus, initialBattery]
      );
    }

    const savedDevice = result.rows[0];

    // If active in registry, update its deviceId and deviceLabel so future telemetry has the friendly name
    if (liveEntry && normalisedCode) {
      liveEntry.deviceId = savedDevice.device_id;
      liveEntry.deviceLabel = savedDevice.device_label;
      pairingRegistry.set(normalisedCode, liveEntry);

      // Broadcast update to dashboard
      broadcastWsEvent({
        type: 'device.updated',
        device: { ...savedDevice, is_live: true },
      });
    }

    console.log(`[Devices] Registered device "${trimmedLabel}" (Code: ${normalisedCode || 'none'})`);
    res.status(201).json({ ...savedDevice, is_live: !!liveEntry });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A device with this serial number already exists' });
    }
    console.error('[Devices] Error registering device:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/devices/:id
// Retrieve a single device record by device_id (UUID)
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM VR_DEVICE WHERE device_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device = result.rows[0];
    const isLive = device.pairing_code
      ? pairingRegistry.has(device.pairing_code)
      : false;

    res.json({ ...device, is_live: isLive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id
// Update device metadata (label, model, firmware, serial)
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  const { device_label, device_model, serial_number, firmware_version } = req.body;

  try {
    const result = await query(
      `UPDATE VR_DEVICE
       SET device_label      = COALESCE($1, device_label),
           device_model      = COALESCE($2, device_model),
           serial_number     = COALESCE($3, serial_number),
           firmware_version  = COALESCE($4, firmware_version)
       WHERE device_id = $5
       RETURNING *`,
      [device_label, device_model, serial_number, firmware_version, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/devices/:id
// Remove a device from the persistent inventory
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM VR_DEVICE WHERE device_id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device removed from inventory', device: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/devices/verify-code
// Teacher enters a pairing code — returns live device info without creating
// a session yet. Used for UI validation ("Is this headset online?")
// Body: { pairing_code }
// ---------------------------------------------------------------------------
router.post('/verify-code', (req, res) => {
  const { pairing_code } = req.body;

  if (!pairing_code) {
    return res.status(400).json({ error: 'pairing_code is required' });
  }

  const normalised = String(pairing_code).trim().toUpperCase();
  const entry = pairingRegistry.get(normalised);

  if (!entry) {
    return res.status(404).json({
      found: false,
      error: 'No active headset found with this pairing code. Make sure the Quest app is open and connected.',
    });
  }

  res.json({
    found: true,
    pairing_code: normalised,
    device_id: entry.deviceId || null,
    device_label: entry.deviceLabel || 'Unknown Device',
    device_model: entry.deviceModel || 'Meta Quest 2',
    serial_number: entry.serialNumber || null,
    battery_level: entry.battery ?? null,
    firmware_version: entry.firmwareVersion || null,
    connected_at: entry.connectedAt,
  });
});

// ---------------------------------------------------------------------------
// POST /api/devices/pair
// Final step: teacher confirms pairing. Backend:
//   1. Validates the code is live
//   2. Creates a SESSION record in PostgreSQL
//   3. Sends "session.assigned" WS message directly to that headset's socket
//   4. Returns the new session to the dashboard
//
// Body: { pairing_code, student_id, module_id, teacher_id? }
// ---------------------------------------------------------------------------
router.post('/pair', async (req, res) => {
  const { pairing_code, student_id, module_id, teacher_id } = req.body;

  if (!pairing_code || !student_id || !module_id) {
    return res.status(400).json({
      error: 'pairing_code, student_id, and module_id are required',
    });
  }

  const normalised = String(pairing_code).trim().toUpperCase();
  const entry = pairingRegistry.get(normalised);

  if (!entry) {
    return res.status(404).json({
      error: 'No active headset found with this pairing code. Ensure the Quest app is running.',
    });
  }

  try {
    // Resolve teacher_id — use provided value or fall back to first teacher in DB
    let resolvedTeacherId = teacher_id;
    if (!resolvedTeacherId) {
      const teacherRes = await query('SELECT teacher_id FROM TEACHER LIMIT 1');
      if (teacherRes.rows.length === 0) {
        return res.status(500).json({ error: 'No teacher account found in the database' });
      }
      resolvedTeacherId = teacherRes.rows[0].teacher_id;
    }

    // Fetch student and module names so we can include them in the WS dispatch
    const [studentRes, moduleRes] = await Promise.all([
      query('SELECT full_name, grade FROM STUDENT WHERE student_id = $1', [student_id]),
      query('SELECT module_name, category, difficulty_level FROM LEARNING_MODULE WHERE module_id = $1', [module_id]),
    ]);

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (moduleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const student = studentRes.rows[0];
    const module  = moduleRes.rows[0];

    // Create the session record
    const sessionResult = await query(
      `INSERT INTO SESSION (student_id, module_id, teacher_id, completion_status, start_time)
       VALUES ($1, $2, $3, 'in_progress', CURRENT_TIMESTAMP)
       RETURNING *`,
      [student_id, module_id, resolvedTeacherId]
    );

    const newSession = sessionResult.rows[0];

    // Mark the device as in_session in persistent store (if device_id is known)
    if (entry.deviceId) {
      await query(
        `UPDATE VR_DEVICE
         SET status = 'in_session', last_seen = CURRENT_TIMESTAMP
         WHERE device_id = $1`,
        [entry.deviceId]
      ).catch((e) => console.warn('[Devices] Could not update device status:', e.message));
    }

    // Build the dispatch payload for the headset
    const dispatchPayload = {
      type: 'session.assigned',
      sessionId: newSession.session_id,
      studentName: student.full_name,
      studentGrade: student.grade,
      moduleName: module.module_name,
      moduleCategory: module.category,
      difficulty: module.difficulty_level,
      startTime: newSession.start_time,
    };

    // Send directly to the specific headset WebSocket
    const { WebSocket } = await import('ws');
    if (entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(JSON.stringify(dispatchPayload));
      console.log(`[Devices] Session ${newSession.session_id} dispatched to headset ${normalised}`);
    } else {
      console.warn(`[Devices] Headset ${normalised} WS is no longer open — session created but dispatch failed`);
    }

    // Also broadcast session.started to dashboard listeners (Live Monitoring)
    broadcastWsEvent({
      type: 'session.started',
      data: {
        ...newSession,
        student_name: student.full_name,
        module_name: module.module_name,
        headset_code: normalised,
        headset_label: entry.deviceLabel,
      },
    });

    res.status(201).json({
      session: newSession,
      device: {
        pairing_code: normalised,
        device_label: entry.deviceLabel,
        device_model: entry.deviceModel,
      },
      dispatched: true,
    });
  } catch (err) {
    console.error('[Devices] Pair error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
