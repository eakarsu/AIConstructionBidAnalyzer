const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
};

// GET /api/materials — paginated
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [result, countResult] = await Promise.all([
      pool.query('SELECT * FROM materials ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM materials'),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

router.post(
  '/',
  auth,
  [
    body('name').notEmpty().withMessage('name is required'),
    body('unit_price').optional().isNumeric().withMessage('unit_price must be a number'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
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
  }
);

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
