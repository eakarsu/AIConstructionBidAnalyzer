const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT ce.*, p.name as project_name FROM cost_estimates ce LEFT JOIN projects p ON ce.project_id = p.id ORDER BY ce.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cost estimates.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT ce.*, p.name as project_name FROM cost_estimates ce LEFT JOIN projects p ON ce.project_id = p.id WHERE ce.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cost estimate not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cost estimate.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, category, description, estimated_amount, actual_amount, variance } = req.body;
    const result = await pool.query(
      `INSERT INTO cost_estimates (project_id, category, description, estimated_amount, actual_amount, variance)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id, category, description, estimated_amount, actual_amount || 0, variance || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create cost estimate.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, category, description, estimated_amount, actual_amount, variance } = req.body;
    const result = await pool.query(
      `UPDATE cost_estimates SET project_id=$1, category=$2, description=$3, estimated_amount=$4,
       actual_amount=$5, variance=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [project_id, category, description, estimated_amount, actual_amount, variance, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cost estimate not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cost estimate.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cost_estimates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cost estimate not found.' });
    res.json({ message: 'Cost estimate deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete cost estimate.' });
  }
});

module.exports = router;
