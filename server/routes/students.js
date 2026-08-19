import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.student_id,
        s.teacher_id,
        s.full_name,
        s.age,
        s.grade,
        s.created_at,
        COUNT(se.session_id)::INTEGER as total_sessions,
        COALESCE(ROUND(AVG(se.final_score), 2), 0.00) as avg_score,
        MAX(se.start_time) as last_session_at
      FROM STUDENT s
      LEFT JOIN SESSION se ON s.student_id = se.student_id
      GROUP BY s.student_id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const studentRes = await query('SELECT * FROM STUDENT WHERE student_id = $1', [id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const sessionsRes = await query(`
      SELECT 
        se.*, 
        m.module_name, 
        m.category
      FROM SESSION se
      JOIN LEARNING_MODULE m ON se.module_id = m.module_id
      WHERE se.student_id = $1
      ORDER BY se.start_time DESC
    `, [id]);

    res.json({
      student: studentRes.rows[0],
      sessions: sessionsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  const { full_name, age, grade, teacher_id } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    // Default to seeded teacher if not provided
    const assignedTeacher = teacher_id || 'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a';

    const result = await query(
      `INSERT INTO STUDENT (full_name, age, grade, teacher_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [full_name, age || null, grade || 'Grade 10', assignedTeacher]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, age, grade } = req.body;

  try {
    const result = await query(
      `UPDATE STUDENT 
       SET full_name = COALESCE($1, full_name),
           age = COALESCE($2, age),
           grade = COALESCE($3, grade)
       WHERE student_id = $4
       RETURNING *`,
      [full_name, age, grade, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if student has existing sessions before deleting (ON DELETE RESTRICT behavior)
    const sessionCheck = await query('SELECT COUNT(*)::INTEGER FROM SESSION WHERE student_id = $1', [id]);
    if (sessionCheck.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete student with historical learning sessions. Archive the record instead.' 
      });
    }

    const result = await query('DELETE FROM STUDENT WHERE student_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully', student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
