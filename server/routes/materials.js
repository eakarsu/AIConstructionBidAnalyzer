const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch material.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, unit, unit_price, supplier, description, in_stock } = req.body;
    const result = await pool.query(
      `INSERT INTO materials (name, category, unit, unit_price, supplier, description, in_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, category, unit, unit_price, supplier, description, in_stock !== undefined ? in_stock : true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create material.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, unit, unit_price, supplier, description, in_stock } = req.body;
    const result = await pool.query(
      `UPDATE materials SET name=$1, category=$2, unit=$3, unit_price=$4, supplier=$5,
       description=$6, in_stock=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, category, unit, unit_price, supplier, description, in_stock, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM materials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found.' });
    res.json({ message: 'Material deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material.' });
  }
});

module.exports = router;
