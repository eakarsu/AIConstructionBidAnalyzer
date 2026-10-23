'use strict';
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const fp = require('../domain/featurePack');
const router = express.Router();
const tasks = new Map(); let seq = 1;
async function ownRecords(req) {
  if (Array.isArray(req.body && req.body.records)) return req.body.records;
  try { const r = await pool.query('SELECT * FROM bids ORDER BY id DESC LIMIT 200'); return r.rows || []; } catch (_) { return []; }
}
// tasks already provided by existing /api/tasks route
router.get('/bids/search', auth, async (req, res) => { const rows = await ownRecords(req); res.json({ data: fp.filterRecords(rows, req.query), total: fp.filterRecords(rows, req.query).length }); });
router.get('/export/bids', auth, async (req, res) => {
  const rows = fp.filterRecords(await ownRecords(req), req.query);
  if (String(req.query.format||'csv').toLowerCase() === 'json') return res.json({ data: rows });
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="bids.csv"');
  return res.send(fp.toCsv(rows) || 'id\n');
});
router.post('/ai/bid-risk-summary', auth, async (req,res)=> res.json(await fp.runAi('bid-risk-summary', await ownRecords(req), fp.bidRiskSummary)));
router.post('/ai/contractor-comparison', auth, async (req,res)=> res.json(await fp.runAi('contractor-comparison', await ownRecords(req), fp.contractorComparison)));
router.post('/ai/cost-variance', auth, async (req,res)=> res.json(await fp.runAi('cost-variance', await ownRecords(req), fp.costVariance)));
module.exports = router;
