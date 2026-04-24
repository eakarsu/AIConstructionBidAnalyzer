const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT l.*, p.name as project_name FROM labor_costs l LEFT JOIN projects p ON l.project_id = p.id ORDER BY l.id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch labor costs.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT l.*, p.name as project_name FROM labor_costs l LEFT JOIN projects p ON l.project_id = p.id WHERE l.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Labor cost not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch labor cost.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours } = req.body;
    const result = await pool.query(
      `INSERT INTO labor_costs (role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create labor cost.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours } = req.body;
    const result = await pool.query(
      `UPDATE labor_costs SET role=$1, hourly_rate=$2, overtime_rate=$3, project_id=$4,
       estimated_hours=$5, actual_hours=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Labor cost not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update labor cost.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM labor_costs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Labor cost not found.' });
    res.json({ message: 'Labor cost deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete labor cost.' });
  }
});

module.exports = router;
