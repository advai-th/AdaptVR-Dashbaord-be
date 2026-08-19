import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const studentCount = await query('SELECT COUNT(*)::INTEGER FROM STUDENT');
    const moduleCount = await query('SELECT COUNT(*)::INTEGER FROM LEARNING_MODULE');
    const activeSessions = await query("SELECT COUNT(*)::INTEGER FROM SESSION WHERE completion_status = 'in_progress'");
    const completedSessions = await query("SELECT COUNT(*)::INTEGER FROM SESSION WHERE completion_status = 'completed'");
    const avgScore = await query("SELECT COALESCE(ROUND(AVG(final_score), 2), 0.00) as avg FROM SESSION WHERE completion_status = 'completed'");

    const cognitiveDistribution = await query(`
      SELECT predicted_cognitive_load, COUNT(*)::INTEGER as count
      FROM ML_PREDICTION
      GROUP BY predicted_cognitive_load
    `);

    res.json({
      total_students: studentCount.rows[0].count,
      total_modules: moduleCount.rows[0].count,
      active_sessions: activeSessions.rows[0].count,
      completed_sessions: completedSessions.rows[0].count,
      average_score: parseFloat(avgScore.rows[0].avg),
      cognitive_distribution: cognitiveDistribution.rows
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/student/:id
router.get('/student/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const performanceTrend = await query(`
      SELECT 
        se.session_id,
        se.start_time,
        se.final_score,
        se.completion_status,
        m.module_name
      FROM SESSION se
      JOIN LEARNING_MODULE m ON se.module_id = m.module_id
      WHERE se.student_id = $1
      ORDER BY se.start_time ASC
    `, [id]);

    const errorSummary = await query(`
      SELECT 
        ie.event_type,
        SUM(ie.error_count)::INTEGER as total_errors,
        ROUND(AVG(ie.response_time), 2) as avg_response_time
      FROM INTERACTION_EVENT ie
      JOIN SESSION se ON ie.session_id = se.session_id
      WHERE se.student_id = $1
      GROUP BY ie.event_type
    `, [id]);

    res.json({
      performance_trend: performanceTrend.rows,
      error_summary: errorSummary.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
