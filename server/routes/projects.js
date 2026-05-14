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

// GET /api/projects — paginated
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = ` WHERE status = $${params.length}`;
    }

    const [result, countResult] = await Promise.all([
      pool.query(`SELECT * FROM projects${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM projects${where}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// POST /api/projects
router.post(
  '/',
  auth,
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('budget').optional().isNumeric().withMessage('Budget must be a number'),
    body('status').optional().isIn(['planning', 'bidding', 'active', 'completed', 'cancelled']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { name, description, location, budget, status, start_date, end_date, project_type } = req.body;
      const result = await pool.query(
        `INSERT INTO projects (name, description, location, budget, status, start_date, end_date, project_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, description, location, budget, status || 'planning', start_date, end_date, project_type]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating project:', err);
      res.status(500).json({ error: 'Failed to create project.' });
    }
  }
);

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, location, budget, status, start_date, end_date, project_type } = req.body;
    const result = await pool.query(
      `UPDATE projects SET name=$1, description=$2, location=$3, budget=$4, status=$5,
       start_date=$6, end_date=$7, project_type=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, description, location, budget, status, start_date, end_date, project_type, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
