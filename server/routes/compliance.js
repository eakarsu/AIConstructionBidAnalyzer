const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT cc.*, p.name as project_name FROM compliance_checks cc LEFT JOIN projects p ON cc.project_id = p.id ORDER BY cc.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compliance checks.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT cc.*, p.name as project_name FROM compliance_checks cc LEFT JOIN projects p ON cc.project_id = p.id WHERE cc.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compliance check.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, regulation, status, description, checked_by, check_date, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_checks (project_id, regulation, status, description, checked_by, check_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, regulation, status || 'pending', description, checked_by, check_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create compliance check.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, regulation, status, description, checked_by, check_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE compliance_checks SET project_id=$1, regulation=$2, status=$3, description=$4,
       checked_by=$5, check_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [project_id, regulation, status, description, checked_by, check_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update compliance check.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_checks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found.' });
    res.json({ message: 'Compliance check deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete compliance check.' });
  }
});

module.exports = router;
