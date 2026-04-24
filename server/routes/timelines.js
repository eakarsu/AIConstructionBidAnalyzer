const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT t.*, p.name as project_name FROM timelines t LEFT JOIN projects p ON t.project_id = p.id ORDER BY t.start_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timelines.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT t.*, p.name as project_name FROM timelines t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Timeline not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, phase, start_date, end_date, status, dependencies, progress_percent } = req.body;
    const result = await pool.query(
      `INSERT INTO timelines (project_id, phase, start_date, end_date, status, dependencies, progress_percent)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, phase, start_date, end_date, status || 'not_started', dependencies, progress_percent || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create timeline.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, phase, start_date, end_date, status, dependencies, progress_percent } = req.body;
    const result = await pool.query(
      `UPDATE timelines SET project_id=$1, phase=$2, start_date=$3, end_date=$4, status=$5,
       dependencies=$6, progress_percent=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [project_id, phase, start_date, end_date, status, dependencies, progress_percent, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Timeline not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update timeline.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM timelines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Timeline not found.' });
    res.json({ message: 'Timeline deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete timeline.' });
  }
});

module.exports = router;
