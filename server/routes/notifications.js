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
      `SELECT n.*, p.name AS project_name
       FROM notifications n
       LEFT JOIN projects p ON n.project_id = p.id
       ORDER BY n.read_at ASC NULLS FIRST, n.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, p.name AS project_name
       FROM notifications n
       LEFT JOIN projects p ON n.project_id = p.id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification.' });
  }
});

router.post(
  '/',
  auth,
  [
    body('title').notEmpty().withMessage('title is required'),
    body('message').notEmpty().withMessage('message is required'),
    body('severity').optional().isIn(['info', 'warning', 'critical', 'success']).withMessage('Invalid severity'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { title, message, project_id, severity, category, recipient } = req.body;
      const result = await pool.query(
        `INSERT INTO notifications (title, message, project_id, severity, category, recipient)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [title, message, project_id || null, severity || 'info', category, recipient]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating notification:', err);
      res.status(500).json({ error: 'Failed to create notification.' });
    }
  }
);

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, message, project_id, severity, category, recipient, read_at } = req.body;
    const result = await pool.query(
      `UPDATE notifications SET title=$1, message=$2, project_id=$3, severity=$4,
       category=$5, recipient=$6, read_at=$7
       WHERE id=$8 RETURNING *`,
      [title, message, project_id || null, severity, category, recipient, read_at || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const result = await pool.query('UPDATE notifications SET read_at = NOW() WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

module.exports = router;
