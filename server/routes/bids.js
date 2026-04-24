const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT b.*, p.name as project_name FROM bids b LEFT JOIN projects p ON b.project_id = p.id ORDER BY b.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ error: 'Failed to fetch bids.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT b.*, p.name as project_name FROM bids b LEFT JOIN projects p ON b.project_id = p.id WHERE b.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching bid:', err);
    res.status(500).json({ error: 'Failed to fetch bid.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, bid_amount, contractor_name, status, submission_date, scope, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO bids (project_id, bid_amount, contractor_name, status, submission_date, scope, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, bid_amount, contractor_name, status || 'submitted', submission_date, scope, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating bid:', err);
    res.status(500).json({ error: 'Failed to create bid.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, bid_amount, contractor_name, status, submission_date, scope, notes } = req.body;
    const result = await pool.query(
      `UPDATE bids SET project_id=$1, bid_amount=$2, contractor_name=$3, status=$4,
       submission_date=$5, scope=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [project_id, bid_amount, contractor_name, status, submission_date, scope, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating bid:', err);
    res.status(500).json({ error: 'Failed to update bid.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bids WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found.' });
    res.json({ message: 'Bid deleted successfully.' });
  } catch (err) {
    console.error('Error deleting bid:', err);
    res.status(500).json({ error: 'Failed to delete bid.' });
  }
});

module.exports = router;
