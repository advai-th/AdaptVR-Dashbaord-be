import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/training/features
// ---------------------------------------------------------------------------
// Receives a batch of labelled feature vectors from a Quest device at session
// end.  Each vector is one prediction window: 12 features + derived label.
//
// Expected body:
// {
//   "sessionId": "...",
//   "modelVersionUsed": "v1",
//   "examples": [
//     {
//       "taskId": "...",
//       "learnerId": "L001",
//       "hesitationTime": 2.3,
//       "wrongSnapCount": 1,
//       "correctSnapCount": 4,
//       "hintRequestCount": 0,
//       "totalInteractions": 5,
//       "averageResponseTime": 3.1,
//       "idleSeconds": 0.8,
//       "headDirectionChanges": 12,
//       "backtrackingCount": 0,
//       "successRate": 0.80,
//       "taskDuration": 45.2,
//       "consecutiveErrors": 0,
//       "derivedLabel": "Medium",
//       "labelSource": "auto",
//       "labelConfidence": 0.70,
//       "windowStartTime": 12.5,
//       "windowEndTime": 57.7
//     }, ...
//   ]
// }
//
// Returns: { inserted: N, sessionId: "..." }
// ---------------------------------------------------------------------------
router.post('/features', async (req, res) => {
  const { sessionId, modelVersionUsed, examples } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  if (!Array.isArray(examples) || examples.length === 0) {
    return res.status(400).json({ error: 'examples array is required and must not be empty' });
  }

  // Validate derived labels before touching the DB
  const VALID_LABELS = new Set(['Low', 'Medium', 'High']);
  for (const ex of examples) {
    if (!VALID_LABELS.has(ex.derivedLabel)) {
      return res.status(400).json({
        error: `Invalid derivedLabel "${ex.derivedLabel}" — must be Low, Medium, or High`,
      });
    }
  }

  const modelVer = modelVersionUsed || 'v1';

  try {
    // Batch-insert using a parameterised multi-row INSERT for efficiency.
    // We build the VALUES clause dynamically so Postgres handles escaping.
    const values = [];
    const placeholders = examples.map((ex, i) => {
      const base = i * 19; // 19 params per row
      values.push(
        sessionId,
        ex.taskId             ?? null,
        ex.learnerId          ?? null,
        modelVer,
        ex.hesitationTime     ?? 0,
        ex.wrongSnapCount     ?? 0,
        ex.correctSnapCount   ?? 0,
        ex.hintRequestCount   ?? 0,
        ex.totalInteractions  ?? 0,
        ex.averageResponseTime ?? 0,
        ex.idleSeconds        ?? 0,
        ex.headDirectionChanges ?? 0,
        ex.backtrackingCount  ?? 0,
        ex.successRate        ?? 0,
        ex.taskDuration       ?? 0,
        ex.consecutiveErrors  ?? 0,
        ex.derivedLabel,
        ex.labelSource        ?? 'auto',
        ex.labelConfidence    ?? 0.70,
      );
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18},$${base+19})`;
    });

    const sql = `
      INSERT INTO TRAINING_FEATURE (
        session_id, task_id, learner_id, model_version_used,
        hesitation_time, wrong_snap_count, correct_snap_count,
        hint_request_count, total_interactions, average_response_time,
        idle_seconds, head_direction_changes, backtracking_count,
        success_rate, task_duration, consecutive_errors,
        derived_label, label_source, label_confidence
      ) VALUES ${placeholders.join(',')}
    `;

    await query(sql, values);

    console.log(`[Training] Inserted ${examples.length} feature vectors for session ${sessionId} (model: ${modelVer})`);
    res.status(201).json({ inserted: examples.length, sessionId, modelVersionUsed: modelVer });
  } catch (err) {
    console.error('[Training] Error inserting training features:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/training/features/:id/label
// ---------------------------------------------------------------------------
// Teacher override — updates a specific feature window's label to 'teacher'
// source with full confidence (1.0).  Called from the Trainer Dashboard when
// a teacher manually marks a student as "struggling" (Low) or "doing well"
// (High).
//
// Expected body: { "label": "Low" | "Medium" | "High" }
// ---------------------------------------------------------------------------
router.post('/features/:id/label', async (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  const VALID_LABELS = ['Low', 'Medium', 'High'];
  if (!label || !VALID_LABELS.includes(label)) {
    return res.status(400).json({
      error: `label must be one of: ${VALID_LABELS.join(', ')}`,
    });
  }

  try {
    const result = await query(
      `UPDATE TRAINING_FEATURE
       SET derived_label    = $1,
           label_source     = 'teacher',
           label_confidence = 1.00
       WHERE feature_id = $2
       RETURNING feature_id, derived_label, label_source, label_confidence`,
      [label, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Feature window ${id} not found` });
    }

    console.log(`[Training] Teacher override: feature ${id} → ${label}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Training] Error applying teacher label:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/training/stats
// ---------------------------------------------------------------------------
// Returns a summary of accumulated training data — shown in the Trainer
// Dashboard so the researcher knows when enough data for a retrain has
// accumulated.
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::INTEGER                                       AS total_examples,
        COUNT(*) FILTER (WHERE label_source = 'teacher')::INTEGER AS teacher_labelled,
        COUNT(*) FILTER (WHERE label_source = 'auto')::INTEGER    AS auto_labelled,
        COUNT(*) FILTER (WHERE derived_label = 'Low')::INTEGER    AS low_count,
        COUNT(*) FILTER (WHERE derived_label = 'Medium')::INTEGER AS medium_count,
        COUNT(*) FILTER (WHERE derived_label = 'High')::INTEGER   AS high_count,
        COUNT(DISTINCT session_id)::INTEGER                     AS unique_sessions,
        MIN(uploaded_at)                                        AS first_uploaded,
        MAX(uploaded_at)                                        AS last_uploaded
      FROM TRAINING_FEATURE
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Training] Error fetching training stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
