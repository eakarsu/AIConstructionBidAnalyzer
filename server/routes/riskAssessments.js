const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT ra.*, p.name as project_name FROM risk_assessments ra LEFT JOIN projects p ON ra.project_id = p.id ORDER BY ra.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch risk assessments.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT ra.*, p.name as project_name FROM risk_assessments ra LEFT JOIN projects p ON ra.project_id = p.id WHERE ra.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Risk assessment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch risk assessment.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, risk_type, severity, likelihood, description, mitigation, status } = req.body;
    const result = await pool.query(
      `INSERT INTO risk_assessments (project_id, risk_type, severity, likelihood, description, mitigation, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, risk_type, severity, likelihood, description, mitigation, status || 'identified']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create risk assessment.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, risk_type, severity, likelihood, description, mitigation, status } = req.body;
    const result = await pool.query(
      `UPDATE risk_assessments SET project_id=$1, risk_type=$2, severity=$3, likelihood=$4,
       description=$5, mitigation=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [project_id, risk_type, severity, likelihood, description, mitigation, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Risk assessment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update risk assessment.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM risk_assessments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Risk assessment not found.' });
    res.json({ message: 'Risk assessment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete risk assessment.' });
  }
});

module.exports = router;
