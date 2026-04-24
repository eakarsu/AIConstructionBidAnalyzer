const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT co.*, p.name as project_name FROM change_orders co LEFT JOIN projects p ON co.project_id = p.id ORDER BY co.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch change orders.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT co.*, p.name as project_name FROM change_orders co LEFT JOIN projects p ON co.project_id = p.id WHERE co.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Change order not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch change order.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, title, description, amount, status, requested_by, reason, impact_days } = req.body;
    const result = await pool.query(
      `INSERT INTO change_orders (project_id, title, description, amount, status, requested_by, reason, impact_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [project_id, title, description, amount, status || 'pending', requested_by, reason, impact_days || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create change order.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, title, description, amount, status, requested_by, reason, impact_days } = req.body;
    const result = await pool.query(
      `UPDATE change_orders SET project_id=$1, title=$2, description=$3, amount=$4, status=$5,
       requested_by=$6, reason=$7, impact_days=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [project_id, title, description, amount, status, requested_by, reason, impact_days, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Change order not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update change order.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM change_orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Change order not found.' });
    res.json({ message: 'Change order deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete change order.' });
  }
});

module.exports = router;
