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

// GET /api/bids — paginated, optional project_id filter
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const project_id = req.query.project_id;

    const params = [];
    let where = '';
    if (project_id) {
      params.push(project_id);
      where = ` WHERE b.project_id = $${params.length}`;
    }

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT b.*, p.name as project_name FROM bids b LEFT JOIN projects p ON b.project_id = p.id${where} ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bids b${where}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ error: 'Failed to fetch bids.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, p.name as project_name FROM bids b LEFT JOIN projects p ON b.project_id = p.id WHERE b.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching bid:', err);
    res.status(500).json({ error: 'Failed to fetch bid.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('project_id').notEmpty().isInt().withMessage('project_id is required and must be an integer'),
    body('bid_amount').isNumeric().withMessage('bid_amount must be a number'),
    body('contractor_name').notEmpty().withMessage('contractor_name is required'),
    body('status').optional().isIn(['submitted', 'under_review', 'awarded', 'rejected']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
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
  }
);

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
