const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// Use multer for file uploads if available, otherwise metadata-only mode
let upload = null;
try {
  const multer = require('multer');
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });
  upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
      const allowed = [
        'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv',
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed.'));
      }
    },
  });
} catch (e) {
  console.warn('[Documents] multer not installed — file uploads disabled, metadata-only mode active.');
}

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
};

const OPENROUTER_MODEL = 'anthropic/claude-3-5-sonnet-20241022';

// GET /api/documents — list all with optional project filter + pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const project_id = req.query.project_id;

    let baseWhere = '';
    const params = [];
    if (project_id) {
      params.push(project_id);
      baseWhere = ` WHERE d.project_id = $${params.length}`;
    }

    const query = `SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id${baseWhere} ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countQuery = project_id
      ? 'SELECT COUNT(*) FROM documents WHERE project_id = $1'
      : 'SELECT COUNT(*) FROM documents';
    const countParams = project_id ? [project_id] : [];

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// GET /api/documents/:id — return document metadata
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE d.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document.' });
  }
});

// POST /api/documents — upload file or save metadata
const createDocumentValidation = [
  body('project_id').optional().isInt().withMessage('project_id must be an integer'),
  body('name').optional().isString().trim().notEmpty().withMessage('name cannot be blank'),
];

const handleDocumentCreate = async (req, res) => {
  if (!handleValidation(req, res)) return;
  try {
    let { name, type, project_id, file_url, uploaded_by, description, status } = req.body;
    let file_path = null;
    let file_size = null;
    let mime_type = null;

    // If a file was uploaded via multer
    if (req.file) {
      name = name || req.file.originalname;
      file_path = req.file.path;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
      type = type || req.file.mimetype;
    }

    const result = await pool.query(
      `INSERT INTO documents
         (name, type, project_id, file_url, file_path, file_size, mime_type, uploaded_by, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name || 'Untitled',
        type,
        project_id || null,
        file_url || null,
        file_path,
        file_size,
        mime_type,
        uploaded_by || (req.user ? (req.user.email || String(req.user.id)) : null),
        description,
        status || 'active',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(500).json({ error: 'Failed to create document.' });
  }
};

if (upload) {
  router.post('/', auth, upload.single('file'), createDocumentValidation, handleDocumentCreate);
} else {
  router.post('/', auth, createDocumentValidation, handleDocumentCreate);
}

// PUT /api/documents/:id
router.put(
  '/:id',
  auth,
  [body('project_id').optional().isInt().withMessage('project_id must be an integer')],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
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
  }
);

// DELETE /api/documents/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });
    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// POST /api/documents/:id/ai-extract — run AI analysis on document content/description
router.post('/:id/ai-extract', auth, aiRateLimiter, async (req, res) => {
  try {
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found.' });

    const doc = docResult.rows[0];
    const { extra_context } = req.body;

    const systemPrompt = `You are an expert construction estimator and project manager with deep knowledge of commercial construction costs, contract law, and project risk management. You are analyzing a construction project document.`;
    const userPrompt = `Analyze the following construction document:

Document Name: ${doc.name}
Document Type: ${doc.type || 'Unknown'}
Description: ${doc.description || 'No description provided'}
${doc.ai_extracted_text ? 'Extracted Text:\n' + doc.ai_extracted_text : ''}
${extra_context ? 'Additional Context:\n' + extra_context : ''}

Please provide:
1. Document summary and key information extracted
2. Critical dates, deadlines, or milestones mentioned
3. Financial figures, costs, or budget information identified
4. Parties involved and their roles
5. Risk factors or concerns identified in the document
6. Action items or required follow-ups
7. Compliance or legal implications
8. Recommendations based on document content`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const analysisText = response.data.choices[0].message.content;

    // Store analysis back on the document record
    await pool.query(
      `UPDATE documents SET ai_analysis = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ result: analysisText, analyzed_at: new Date().toISOString() }), doc.id]
    );

    // Also store in ai_analyses table
    await pool.query(
      `INSERT INTO ai_analyses
         (analysis_type, project_id, input_data_json, result_json, model_used, user_id, created_at)
       VALUES ('document-extract', $1, $2, $3, $4, $5, NOW())`,
      [
        doc.project_id,
        JSON.stringify({ document_id: doc.id, document_name: doc.name }),
        JSON.stringify({ result: analysisText }),
        OPENROUTER_MODEL,
        req.user?.id || null,
      ]
    );

    if (doc.project_id) {
      await pool.query('UPDATE projects SET last_analysis_at = NOW() WHERE id = $1', [doc.project_id]).catch(() => {});
    }

    res.json({ analysis: analysisText, document_id: doc.id });
  } catch (err) {
    console.error('AI document extract error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to run AI extraction on document.', details: err.response?.data || err.message });
  }
});

module.exports = router;
