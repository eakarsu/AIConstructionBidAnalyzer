const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
};

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       ORDER BY
         CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('title').notEmpty().withMessage('title is required'),
    body('status').optional().isIn(['open', 'in_progress', 'blocked', 'completed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { title, project_id, owner, due_date, priority, status, category, description } = req.body;
      const result = await pool.query(
        `INSERT INTO tasks (title, project_id, owner, due_date, priority, status, category, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [title, project_id || null, owner, due_date || null, priority || 'medium', status || 'open', category, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ error: 'Failed to create task.' });
    }
  }
);

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, project_id, owner, due_date, priority, status, category, description } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET title=$1, project_id=$2, owner=$3, due_date=$4, priority=$5,
       status=$6, category=$7, description=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [title, project_id || null, owner, due_date || null, priority, status, category, description, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
