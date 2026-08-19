import express from 'express';
import { query } from '../../db/index.js';

const router = express.Router();

// GET /api/modules
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        m.*,
        COUNT(se.session_id)::INTEGER as session_count,
        COALESCE(ROUND(AVG(se.final_score), 2), 0.00) as avg_score
      FROM LEARNING_MODULE m
      LEFT JOIN SESSION se ON m.module_id = se.module_id
      GROUP BY m.module_id
      ORDER BY m.module_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching modules:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/modules/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM LEARNING_MODULE WHERE module_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learning module not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/modules
router.post('/', async (req, res) => {
  const { module_name, category, description, difficulty_level, status } = req.body;

  if (!module_name || !category || !difficulty_level) {
    return res.status(400).json({ error: 'Module name, category, and difficulty_level are required' });
  }

  try {
    const result = await query(
      `INSERT INTO LEARNING_MODULE (module_name, category, description, difficulty_level, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [module_name, category, description || '', difficulty_level, status || 'active']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A module with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/modules/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { module_name, category, description, difficulty_level, status } = req.body;

  try {
    const result = await query(
      `UPDATE LEARNING_MODULE
       SET module_name = COALESCE($1, module_name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           difficulty_level = COALESCE($4, difficulty_level),
           status = COALESCE($5, status)
       WHERE module_id = $6
       RETURNING *`,
      [module_name, category, description, difficulty_level, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learning module not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/modules/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM LEARNING_MODULE WHERE module_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learning module not found' });
    }
    res.json({ message: 'Learning module deleted successfully', module: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
