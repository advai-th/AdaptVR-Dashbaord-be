import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/model/version
// ---------------------------------------------------------------------------
// Used by Quest's ModelUpdateManager on app startup.
// Returns the currently-active model's version string + metadata.
// If no model has been published yet, returns version "v1" as the baseline.
// ---------------------------------------------------------------------------
router.get('/version', async (req, res) => {
  try {
    const result = await query(`
      SELECT version, release_date, sha256, training_samples, validation_accuracy
      FROM MODEL_MANIFEST
      WHERE is_active = TRUE
      ORDER BY release_date DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // No model published yet — inform the device to use its bundled baseline
      return res.json({
        version: 'v1',
        releaseDate: null,
        sha256: null,
        trainingSamples: 0,
        validationAccuracy: null,
        notes: 'No retrained model published yet — use bundled baseline v1.',
      });
    }

    const row = result.rows[0];
    res.json({
      version:            row.version,
      releaseDate:        row.release_date,
      sha256:             row.sha256,
      trainingSamples:    row.training_samples,
      validationAccuracy: row.validation_accuracy !== null
                            ? parseFloat(row.validation_accuracy)
                            : null,
    });
  } catch (err) {
    console.error('[Model] Error fetching model version:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/model/download?version=v2
// ---------------------------------------------------------------------------
// Streams the ONNX binary for the requested model version.
// Quest's ModelUpdateManager downloads this and writes it to
// Application.persistentDataPath/AdaptVR/Models/cognitive_load_v2.onnx.
//
// The SHA-256 is also returned via a response header so the client can verify
// integrity before saving (no need to re-query /version).
// ---------------------------------------------------------------------------
router.get('/download', async (req, res) => {
  const { version } = req.query;

  if (!version) {
    return res.status(400).json({ error: 'version query parameter is required (e.g. ?version=v2)' });
  }

  try {
    const result = await query(
      `SELECT version, sha256, onnx_binary FROM MODEL_MANIFEST WHERE version = $1`,
      [version]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Model version "${version}" not found.` });
    }

    const { sha256, onnx_binary } = result.rows[0];

    res.set({
      'Content-Type':        'application/octet-stream',
      'Content-Disposition': `attachment; filename="cognitive_load_${version}.onnx"`,
      'X-Model-Version':     version,
      'X-Model-SHA256':      sha256,
    });

    res.send(onnx_binary);
  } catch (err) {
    console.error('[Model] Error downloading model binary:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/model/history
// ---------------------------------------------------------------------------
// Returns all published model versions (for the Trainer Dashboard).
// Excludes the raw ONNX binary — metadata only.
// ---------------------------------------------------------------------------
router.get('/history', async (req, res) => {
  try {
    const result = await query(`
      SELECT manifest_id, version, release_date, sha256,
             training_samples, validation_accuracy, is_active, notes
      FROM MODEL_MANIFEST
      ORDER BY release_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[Model] Error fetching model history:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
