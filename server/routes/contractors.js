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

// GET /api/contractors — paginated
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [result, countResult] = await Promise.all([
      pool.query('SELECT * FROM contractors ORDER BY company_name ASC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM contractors'),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contractors.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contractors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contractor not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contractor.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('company_name').notEmpty().withMessage('company_name is required'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location } = req.body;
      const result = await pool.query(
        `INSERT INTO contractors (company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create contractor.' });
    }
  }
);

router.put('/:id', auth, async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location } = req.body;
    const result = await pool.query(
      `UPDATE contractors SET company_name=$1, contact_name=$2, email=$3, phone=$4, specialty=$5,
       rating=$6, license_number=$7, years_experience=$8, location=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
      [company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contractor not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contractor.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM contractors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contractor not found.' });
    res.json({ message: 'Contractor deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contractor.' });
  }
});

module.exports = router;
