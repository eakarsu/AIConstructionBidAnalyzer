const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id ORDER BY d.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE d.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, type, project_id, file_url, uploaded_by, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO documents (name, type, project_id, file_url, uploaded_by, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, project_id, file_url, uploaded_by, description, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type, project_id, file_url, uploaded_by, description, status } = req.body;
    const result = await pool.query(
      `UPDATE documents SET name=$1, type=$2, project_id=$3, file_url=$4, uploaded_by=$5,
       description=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, type, project_id, file_url, uploaded_by, description, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });
    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
