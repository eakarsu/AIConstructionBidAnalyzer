const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subcontractors ORDER BY company_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subcontractors.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subcontractors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subcontractor not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subcontractor.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability } = req.body;
    const result = await pool.query(
      `INSERT INTO subcontractors (company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability || 'available']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subcontractor.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability } = req.body;
    const result = await pool.query(
      `UPDATE subcontractors SET company_name=$1, specialty=$2, contact_name=$3, email=$4, phone=$5,
       rating=$6, hourly_rate=$7, availability=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subcontractor not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subcontractor.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM subcontractors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subcontractor not found.' });
    res.json({ message: 'Subcontractor deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subcontractor.' });
  }
});

module.exports = router;
