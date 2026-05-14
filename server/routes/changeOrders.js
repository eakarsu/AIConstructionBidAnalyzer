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

// GET /api/change-orders — paginated
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
      where = ` WHERE co.project_id = $${params.length}`;
    }

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT co.*, p.name as project_name FROM change_orders co LEFT JOIN projects p ON co.project_id = p.id${where} ORDER BY co.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM change_orders co${where}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch change orders.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT co.*, p.name as project_name FROM change_orders co LEFT JOIN projects p ON co.project_id = p.id WHERE co.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Change order not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch change order.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('project_id').notEmpty().isInt().withMessage('project_id is required and must be an integer'),
    body('title').notEmpty().withMessage('title is required'),
    body('amount').optional().isNumeric().withMessage('amount must be a number'),
    body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
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
  }
);

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
