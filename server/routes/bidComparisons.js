const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT bc.*, p.name as project_name FROM bid_comparisons bc LEFT JOIN projects p ON bc.project_id = p.id ORDER BY bc.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bid comparisons.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT bc.*, p.name as project_name FROM bid_comparisons bc LEFT JOIN projects p ON bc.project_id = p.id WHERE bc.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid comparison not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bid comparison.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project_id, bid_ids, comparison_notes, recommendation } = req.body;
    const result = await pool.query(
      `INSERT INTO bid_comparisons (project_id, bid_ids, comparison_notes, recommendation)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [project_id, JSON.stringify(bid_ids), comparison_notes, recommendation]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bid comparison.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { project_id, bid_ids, comparison_notes, recommendation } = req.body;
    const result = await pool.query(
      `UPDATE bid_comparisons SET project_id=$1, bid_ids=$2, comparison_notes=$3,
       recommendation=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [project_id, JSON.stringify(bid_ids), comparison_notes, recommendation, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid comparison not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bid comparison.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bid_comparisons WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid comparison not found.' });
    res.json({ message: 'Bid comparison deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bid comparison.' });
  }
});

module.exports = router;
