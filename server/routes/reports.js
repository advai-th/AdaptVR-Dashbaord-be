import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// GET /api/reports/session/:id
router.get('/session/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sessionRes = await query(`
      SELECT 
        se.session_id,
        se.start_time,
        se.end_time,
        se.final_score,
        se.completion_status,
        st.full_name as student_name,
        st.grade as student_grade,
        m.module_name,
        m.category as module_category,
        m.difficulty_level,
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

    const session = sessionRes.rows[0];

    const eventsRes = await query(`
      SELECT event_type, COUNT(*)::INTEGER as count, SUM(error_count)::INTEGER as total_errors
      FROM INTERACTION_EVENT
      WHERE session_id = $1
      GROUP BY event_type
    `, [id]);

    const cognitiveRes = await query(`
      SELECT predicted_cognitive_load, COUNT(*)::INTEGER as count
      FROM ML_PREDICTION
      WHERE session_id = $1
      GROUP BY predicted_cognitive_load
    `, [id]);

    const adaptationsRes = await query(`
      SELECT adaptation_type, description, adapted_at
      FROM ADAPTATION_EVENT
      WHERE session_id = $1
      ORDER BY adapted_at ASC
    `, [id]);

    res.json({
      report_type: 'Session Analysis Report',
      generated_at: new Date().toISOString(),
      session,
      interaction_summary: eventsRes.rows,
      cognitive_load_breakdown: cognitiveRes.rows,
      adaptations_applied: adaptationsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
