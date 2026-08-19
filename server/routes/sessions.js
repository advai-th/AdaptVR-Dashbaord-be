import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// Broadcast function placeholder (injected by main server if WebSocket attached)
let broadcastWsEvent = () => {};
export const setWsBroadcaster = (fn) => { broadcastWsEvent = fn; };

// GET /api/sessions
router.get('/', async (req, res) => {
  const { status, student_id, module_id } = req.query;
  try {
    let sql = `
      SELECT 
        se.*, 
        st.full_name as student_name, 
        st.grade as student_grade,
        m.module_name, 
        m.category as module_category,
        m.difficulty_level as module_difficulty,
        t.full_name as teacher_name,
        (SELECT COUNT(*)::INTEGER FROM INTERACTION_EVENT WHERE session_id = se.session_id) as event_count,
        (SELECT predicted_cognitive_load FROM ML_PREDICTION WHERE session_id = se.session_id ORDER BY predicted_at DESC LIMIT 1) as latest_cognitive_load
      FROM SESSION se
      JOIN STUDENT st ON se.student_id = st.student_id
      JOIN LEARNING_MODULE m ON se.module_id = m.module_id
      JOIN TEACHER t ON se.teacher_id = t.teacher_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND se.completion_status = $${params.length}`;
    }
    if (student_id) {
      params.push(student_id);
      sql += ` AND se.student_id = $${params.length}`;
    }
    if (module_id) {
      params.push(module_id);
      sql += ` AND se.module_id = $${params.length}`;
    }

    sql += ' ORDER BY se.start_time DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sessionRes = await query(`
      SELECT 
        se.*, 
        st.full_name as student_name, 
        st.age as student_age,
        st.grade as student_grade,
        m.module_name, 
        m.category as module_category,
        t.full_name as teacher_name
      FROM SESSION se
      JOIN STUDENT st ON se.student_id = st.student_id
      JOIN LEARNING_MODULE m ON se.module_id = m.module_id
      JOIN TEACHER t ON se.teacher_id = t.teacher_id
      WHERE se.session_id = $1
    `, [id]);

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const eventsRes = await query(
      'SELECT * FROM INTERACTION_EVENT WHERE session_id = $1 ORDER BY event_time ASC',
      [id]
    );

    const predictionsRes = await query(
      'SELECT * FROM ML_PREDICTION WHERE session_id = $1 ORDER BY predicted_at ASC',
      [id]
    );

    const adaptationsRes = await query(
      'SELECT * FROM ADAPTATION_EVENT WHERE session_id = $1 ORDER BY adapted_at ASC',
      [id]
    );

    res.json({
      session: sessionRes.rows[0],
      events: eventsRes.rows,
      predictions: predictionsRes.rows,
      adaptations: adaptationsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions
router.post('/', async (req, res) => {
  const { student_id, module_id, teacher_id } = req.body;

  if (!student_id || !module_id) {
    return res.status(400).json({ error: 'Student ID and Module ID are required' });
  }

  try {
    const assignedTeacher = teacher_id || 'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a';

    const result = await query(
      `INSERT INTO SESSION (student_id, module_id, teacher_id, completion_status, start_time)
       VALUES ($1, $2, $3, 'in_progress', CURRENT_TIMESTAMP)
       RETURNING *`,
      [student_id, module_id, assignedTeacher]
    );

    const newSession = result.rows[0];

    // Broadcast session.started event to dashboard via WebSocket
    broadcastWsEvent({
      type: 'session.started',
      data: newSession
    });

    res.status(201).json(newSession);
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/end
router.post('/:id/end', async (req, res) => {
  const { id } = req.params;
  const { final_score, completion_status } = req.body;

  try {
    const statusVal = completion_status || 'completed';

    const result = await query(
      `UPDATE SESSION
       SET end_time = CURRENT_TIMESTAMP,
           final_score = COALESCE($1, final_score),
           completion_status = $2
       WHERE session_id = $3
       RETURNING *`,
      [final_score || 90.00, statusVal, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const endedSession = result.rows[0];

    broadcastWsEvent({
      type: 'session.ended',
      data: endedSession
    });

    res.json(endedSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/events (VR Client Telemetry Ingestion)
router.post('/:id/events', async (req, res) => {
  const { id } = req.params;
  const { event_type, object_name, response_time, error_count, interaction_value } = req.body;

  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  try {
    const result = await query(
      `INSERT INTO INTERACTION_EVENT (session_id, event_type, object_name, response_time, error_count, interaction_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, event_type, object_name || null, response_time || 0.0, error_count || 0, JSON.stringify(interaction_value || {})]
    );

    const newEvent = result.rows[0];

    broadcastWsEvent({
      type: 'interaction.event',
      sessionId: id,
      data: newEvent
    });

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/predictions (ML Cognitive Load Ingestion)
router.post('/:id/predictions', async (req, res) => {
  const { id } = req.params;
  const { predicted_cognitive_load, confidence_score } = req.body;

  if (!predicted_cognitive_load || confidence_score === undefined) {
    return res.status(400).json({ error: 'predicted_cognitive_load and confidence_score are required' });
  }

  try {
    const result = await query(
      `INSERT INTO ML_PREDICTION (session_id, predicted_cognitive_load, confidence_score)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, predicted_cognitive_load, confidence_score]
    );

    const newPrediction = result.rows[0];

    broadcastWsEvent({
      type: 'ml.prediction',
      sessionId: id,
      data: newPrediction
    });

    res.status(201).json(newPrediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/adaptations (Adaptation Event Ingestion)
router.post('/:id/adaptations', async (req, res) => {
  const { id } = req.params;
  const { prediction_id, adaptation_type, previous_difficulty, new_difficulty, description } = req.body;

  if (!adaptation_type) {
    return res.status(400).json({ error: 'adaptation_type is required' });
  }

  try {
    const result = await query(
      `INSERT INTO ADAPTATION_EVENT (session_id, prediction_id, adaptation_type, previous_difficulty, new_difficulty, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, prediction_id || null, adaptation_type, previous_difficulty || null, new_difficulty || null, description || '']
    );

    const newAdaptation = result.rows[0];

    broadcastWsEvent({
      type: 'adaptation.event',
      sessionId: id,
      data: newAdaptation
    });

    res.status(201).json(newAdaptation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
