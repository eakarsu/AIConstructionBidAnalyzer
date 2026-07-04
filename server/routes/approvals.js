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

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.name AS project_name
       FROM approvals a
       LEFT JOIN projects p ON a.project_id = p.id
       ORDER BY
         CASE a.status WHEN 'pending' THEN 1 WHEN 'needs_changes' THEN 2 WHEN 'approved' THEN 3 ELSE 4 END,
         a.due_date ASC NULLS LAST,
         a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching approvals:', err);
    res.status(500).json({ error: 'Failed to fetch approvals.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.name AS project_name
       FROM approvals a
       LEFT JOIN projects p ON a.project_id = p.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Approval not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch approval.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('title').notEmpty().withMessage('title is required'),
    body('approval_type').notEmpty().withMessage('approval_type is required'),
    body('status').optional().isIn(['pending', 'approved', 'rejected', 'needs_changes']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { title, project_id, approval_type, requester, approver, due_date, status, amount, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO approvals (title, project_id, approval_type, requester, approver, due_date, status, amount, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [title, project_id || null, approval_type, requester, approver, due_date || null, status || 'pending', amount || null, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating approval:', err);
      res.status(500).json({ error: 'Failed to create approval.' });
    }
  }
);

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, project_id, approval_type, requester, approver, due_date, status, amount, notes } = req.body;
    const result = await pool.query(
      `UPDATE approvals SET title=$1, project_id=$2, approval_type=$3, requester=$4,
       approver=$5, due_date=$6, status=$7, amount=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, project_id || null, approval_type, requester, approver, due_date || null, status, amount || null, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Approval not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating approval:', err);
    res.status(500).json({ error: 'Failed to update approval.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM approvals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Approval not found.' });
    res.json({ message: 'Approval deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete approval.' });
  }
});

module.exports = router;
