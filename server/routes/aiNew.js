/**
 * New AI endpoints for AIConstructionBidAnalyzer
 * POST /api/ai/subcontractor-analysis
 * POST /api/ai/value-engineering
 * POST /api/ai/cash-flow-projection
 * POST /api/ai/dispute-analyzer
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

const OPENROUTER_MODEL = 'anthropic/claude-3-5-sonnet-20241022';
const SYSTEM_PROMPT_BASE =
  'You are an expert construction estimator and project manager with deep knowledge of commercial construction costs, contract law, and project risk management.';

const callOpenRouter = async (systemPrompt, userData) => {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: typeof userData === 'string' ? userData : JSON.stringify(userData) }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
};

const saveAnalysis = async (analysisType, inputData, resultText, userId, projectId, bidId) => {
  const res = await pool.query(
    `INSERT INTO ai_analyses
       (analysis_type, project_id, bid_id, input_data_json, result_json, model_used, user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      analysisType,
      projectId || null,
      bidId || null,
      JSON.stringify(inputData),
      JSON.stringify({ result: resultText }),
      OPENROUTER_MODEL,
      userId || null,
    ]
  );

  if (projectId) {
    await pool.query(
      'UPDATE projects SET last_analysis_at = NOW() WHERE id = $1',
      [projectId]
    ).catch(() => {});
  }

  return res.rows[0].id;
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/subcontractor-analysis
// Evaluates subcontractor quotes for scope gaps and price anomalies
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/subcontractor-analysis',
  auth,
  aiRateLimiter,
  [
    body('bid_id').optional().isInt().withMessage('bid_id must be an integer'),
    body('subcontractor_quotes').isArray({ min: 1 }).withMessage('subcontractor_quotes must be a non-empty array'),
    body('subcontractor_quotes.*.company').notEmpty().withMessage('Each quote must include a company name'),
    body('subcontractor_quotes.*.amount').isNumeric().withMessage('Each quote must include a numeric amount'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    try {
      const { bid_id, subcontractor_quotes, project_id, scope_description } = req.body;

      const systemPrompt = `${SYSTEM_PROMPT_BASE} You are evaluating subcontractor bids for scope completeness and price integrity. Provide a thorough analysis.`;
      const userPrompt = `Evaluate these subcontractor quotes:
${JSON.stringify(subcontractor_quotes, null, 2)}

${scope_description ? `Project scope: ${scope_description}` : ''}

Please provide:
1. Price comparison and outlier detection (highlight quotes that are significantly above or below market)
2. Scope gap analysis for each quote (what may be missing)
3. Risk assessment per subcontractor (financial stability signals, quote completeness)
4. Recommended selection with justification
5. Negotiation strategies for each vendor
6. Red flags or concerns for each quote`;

      const result = await callOpenRouter(systemPrompt, userPrompt);
      await saveAnalysis('subcontractor-analysis', req.body, result, req.user?.id, project_id, bid_id);
      res.json({ analysis: result });
    } catch (err) {
      console.error('AI subcontractor-analysis error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to analyze subcontractor quotes.', details: err.response?.data || err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/value-engineering
// Cost reduction suggestions with trade-offs for a project
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/value-engineering',
  auth,
  aiRateLimiter,
  [
    body('project_id').optional().isInt().withMessage('project_id must be an integer'),
    body('budget_target').isNumeric().withMessage('budget_target is required and must be numeric'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    try {
      const { project_id, budget_target, current_estimate, project_description, scope } = req.body;

      const systemPrompt = `${SYSTEM_PROMPT_BASE} You specialize in value engineering — finding cost reduction opportunities without sacrificing essential function or quality.`;
      const userPrompt = `Perform a value engineering analysis:
Project Description: ${project_description || 'Not provided'}
Scope: ${scope || 'Not provided'}
Current Estimate: ${current_estimate ? '$' + current_estimate : 'Not provided'}
Budget Target: $${budget_target}
Budget Gap: ${current_estimate ? '$' + (Number(current_estimate) - Number(budget_target)) : 'Unknown'}

Please provide:
1. Top 10 value engineering opportunities ranked by cost savings potential
2. For each opportunity:
   - Estimated savings (dollar amount and percentage)
   - Trade-offs and quality/performance impacts
   - Implementation complexity (Low/Medium/High)
   - Recommended specifications or alternatives
3. Systems-level substitutions (structural, MEP, envelope, finishes)
4. Procurement strategies to reduce costs (alternate suppliers, prefab, phasing)
5. Which cuts should be avoided (critical quality or safety items)
6. Revised budget estimate after recommended cuts`;

      const result = await callOpenRouter(systemPrompt, userPrompt);
      await saveAnalysis('value-engineering', req.body, result, req.user?.id, project_id, null);
      res.json({ analysis: result });
    } catch (err) {
      console.error('AI value-engineering error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to perform value engineering.', details: err.response?.data || err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/cash-flow-projection
// Monthly cash flow forecast based on project and schedule
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/cash-flow-projection',
  auth,
  aiRateLimiter,
  [
    body('project_id').optional().isInt().withMessage('project_id must be an integer'),
    body('schedule').notEmpty().withMessage('schedule is required'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    try {
      const { project_id, schedule, contract_value, retainage_pct, payment_terms, project_description } = req.body;

      const systemPrompt = `${SYSTEM_PROMPT_BASE} You are a construction finance expert specializing in cash flow modeling and working capital management.`;
      const userPrompt = `Generate a monthly cash flow projection:
Project Description: ${project_description || 'Not provided'}
Contract Value: ${contract_value ? '$' + contract_value : 'Not provided'}
Retainage: ${retainage_pct ? retainage_pct + '%' : '10% (default)'}
Payment Terms: ${payment_terms || 'Net 30'}
Schedule / Milestones:
${typeof schedule === 'string' ? schedule : JSON.stringify(schedule, null, 2)}

Please provide:
1. Month-by-month cash flow table (costs incurred, billings, retainage held, net cash)
2. Peak negative cash flow point and amount (maximum financing needed)
3. Cumulative cash flow curve description
4. Retainage release schedule
5. Payment lag impact analysis
6. Cash flow risk periods and mitigation strategies
7. Recommendations for subcontractor payment scheduling
8. Working capital requirements and financing suggestions`;

      const result = await callOpenRouter(systemPrompt, userPrompt);
      await saveAnalysis('cash-flow-projection', req.body, result, req.user?.id, project_id, null);
      res.json({ analysis: result });
    } catch (err) {
      console.error('AI cash-flow-projection error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to generate cash flow projection.', details: err.response?.data || err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/dispute-analyzer
// Legal risk assessment and settlement recommendations for change order disputes
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/dispute-analyzer',
  auth,
  aiRateLimiter,
  [
    body('change_order_id').optional().isInt().withMessage('change_order_id must be an integer'),
    body('dispute_description').notEmpty().withMessage('dispute_description is required'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    try {
      const { change_order_id, dispute_description, contract_type, disputed_amount, project_id, contract_clauses } = req.body;

      const systemPrompt = `${SYSTEM_PROMPT_BASE} You are also a construction law expert with deep knowledge of contract disputes, claims, and mediation/arbitration procedures.`;
      const userPrompt = `Analyze this construction dispute:
Contract Type: ${contract_type || 'Not specified (assume AIA standard)'}
Disputed Amount: ${disputed_amount ? '$' + disputed_amount : 'Not specified'}
Dispute Description:
${dispute_description}

${contract_clauses ? 'Relevant Contract Clauses:\n' + contract_clauses : ''}

Please provide:
1. Legal merits assessment (strength of each party's position, 1-10 scale)
2. Applicable contract law principles and standard clauses that apply
3. Precedent analysis — how similar disputes are typically resolved
4. Risk assessment of escalating to arbitration vs. settlement
5. Settlement recommendation:
   - Recommended settlement range
   - Negotiation strategy
   - Concessions each party should consider
6. Documentation needed to support the claim
7. Timeline considerations (notice requirements, claim deadlines)
8. Alternative dispute resolution options (mediation, partnering)
9. Prevention recommendations for future contracts`;

      const result = await callOpenRouter(systemPrompt, userPrompt);
      await saveAnalysis('dispute-analyzer', req.body, result, req.user?.id, project_id, null);
      res.json({ analysis: result });
    } catch (err) {
      console.error('AI dispute-analyzer error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to analyze dispute.', details: err.response?.data || err.message });
    }
  }
);

module.exports = router;
