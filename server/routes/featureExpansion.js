const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const features = {
  'plan-spec-upload': {
    list: `
      SELECT pu.*, p.name AS project_name, COUNT(sd.id)::int AS spec_count, COUNT(de.id)::int AS extraction_count
      FROM plan_uploads pu
      LEFT JOIN projects p ON p.id = pu.project_id
      LEFT JOIN spec_documents sd ON sd.plan_upload_id = pu.id
      LEFT JOIN document_extractions de ON de.plan_upload_id = pu.id
      GROUP BY pu.id, p.name
      ORDER BY pu.created_at DESC
    `,
    detail: 'SELECT pu.*, p.name AS project_name FROM plan_uploads pu LEFT JOIN projects p ON p.id = pu.project_id WHERE pu.id = $1',
    children: [
      { key: 'spec_documents', query: 'SELECT * FROM spec_documents WHERE plan_upload_id = $1 ORDER BY id' },
      { key: 'document_extractions', query: 'SELECT * FROM document_extractions WHERE plan_upload_id = $1 ORDER BY confidence DESC' },
    ],
  },
  'bid-risk-analysis': {
    list: `
      SELECT brr.*, b.contractor_name, b.bid_amount, p.name AS project_name, COUNT(brf.id)::int AS finding_count
      FROM bid_risk_reviews brr
      LEFT JOIN bids b ON b.id = brr.bid_id
      LEFT JOIN projects p ON p.id = b.project_id
      LEFT JOIN bid_risk_findings brf ON brf.review_id = brr.id
      GROUP BY brr.id, b.contractor_name, b.bid_amount, p.name
      ORDER BY brr.overall_score DESC, brr.created_at DESC
    `,
    detail: `
      SELECT brr.*, b.contractor_name, b.bid_amount, b.scope, p.name AS project_name
      FROM bid_risk_reviews brr
      LEFT JOIN bids b ON b.id = brr.bid_id
      LEFT JOIN projects p ON p.id = b.project_id
      WHERE brr.id = $1
    `,
    children: [
      { key: 'risk_findings', query: 'SELECT * FROM bid_risk_findings WHERE review_id = $1 ORDER BY id' },
    ],
  },
  'cost-estimate-review': {
    list: `
      SELECT er.*, ce.category, ce.estimated_amount, ce.actual_amount, p.name AS project_name, COUNT(ev.id)::int AS variance_count
      FROM estimate_reviews er
      LEFT JOIN cost_estimates ce ON ce.id = er.cost_estimate_id
      LEFT JOIN projects p ON p.id = ce.project_id
      LEFT JOIN estimate_variances ev ON ev.review_id = er.id
      GROUP BY er.id, ce.category, ce.estimated_amount, ce.actual_amount, p.name
      ORDER BY er.variance_score DESC, er.created_at DESC
    `,
    detail: `
      SELECT er.*, ce.category, ce.description, ce.estimated_amount, ce.actual_amount, ce.variance, p.name AS project_name
      FROM estimate_reviews er
      LEFT JOIN cost_estimates ce ON ce.id = er.cost_estimate_id
      LEFT JOIN projects p ON p.id = ce.project_id
      WHERE er.id = $1
    `,
    children: [
      { key: 'estimate_variances', query: 'SELECT * FROM estimate_variances WHERE review_id = $1 ORDER BY ABS(variance_amount) DESC' },
    ],
  },
  'permit-checklists': {
    list: `
      SELECT pc.*, p.name AS project_name, COUNT(pr.id)::int AS requirement_count
      FROM permit_checklists pc
      LEFT JOIN projects p ON p.id = pc.project_id
      LEFT JOIN permit_requirements pr ON pr.checklist_id = pc.id
      GROUP BY pc.id, p.name
      ORDER BY pc.due_date ASC NULLS LAST, pc.created_at DESC
    `,
    detail: 'SELECT pc.*, p.name AS project_name FROM permit_checklists pc LEFT JOIN projects p ON p.id = pc.project_id WHERE pc.id = $1',
    children: [
      { key: 'permit_requirements', query: 'SELECT * FROM permit_requirements WHERE checklist_id = $1 ORDER BY id' },
      { key: 'status_events', query: 'SELECT * FROM permit_status_events WHERE checklist_id = $1 ORDER BY event_date DESC' },
    ],
  },
  'safety-plans': {
    list: `
      SELECT sp.*, p.name AS project_name, COUNT(sh.id)::int AS hazard_count, COUNT(si.id)::int AS inspection_count
      FROM safety_plans sp
      LEFT JOIN projects p ON p.id = sp.project_id
      LEFT JOIN safety_hazards sh ON sh.safety_plan_id = sp.id
      LEFT JOIN safety_inspections si ON si.safety_plan_id = sp.id
      GROUP BY sp.id, p.name
      ORDER BY sp.created_at DESC
    `,
    detail: 'SELECT sp.*, p.name AS project_name FROM safety_plans sp LEFT JOIN projects p ON p.id = sp.project_id WHERE sp.id = $1',
    children: [
      { key: 'hazards', query: 'SELECT * FROM safety_hazards WHERE safety_plan_id = $1 ORDER BY id' },
      { key: 'inspections', query: 'SELECT * FROM safety_inspections WHERE safety_plan_id = $1 ORDER BY inspection_date DESC' },
    ],
  },
  'subcontractor-scoring': {
    list: `
      SELECT ss.*, s.company_name, s.specialty, b.contractor_name AS bid_contractor, p.name AS project_name, COUNT(se.id)::int AS evaluation_count
      FROM subcontractor_scores ss
      LEFT JOIN subcontractors s ON s.id = ss.subcontractor_id
      LEFT JOIN bids b ON b.id = ss.bid_id
      LEFT JOIN projects p ON p.id = b.project_id
      LEFT JOIN subcontractor_evaluations se ON se.score_id = ss.id
      GROUP BY ss.id, s.company_name, s.specialty, b.contractor_name, p.name
      ORDER BY ss.overall_score DESC
    `,
    detail: `
      SELECT ss.*, s.company_name, s.specialty, s.availability, s.rating, b.contractor_name AS bid_contractor, p.name AS project_name
      FROM subcontractor_scores ss
      LEFT JOIN subcontractors s ON s.id = ss.subcontractor_id
      LEFT JOIN bids b ON b.id = ss.bid_id
      LEFT JOIN projects p ON p.id = b.project_id
      WHERE ss.id = $1
    `,
    children: [
      { key: 'evaluations', query: 'SELECT * FROM subcontractor_evaluations WHERE score_id = $1 ORDER BY id' },
    ],
  },
  'change-order-impacts': {
    list: `
      SELECT coi.*, co.title AS change_order_title, co.status AS change_order_status, p.name AS project_name, COUNT(coa.id)::int AS approval_count
      FROM change_order_impacts coi
      LEFT JOIN change_orders co ON co.id = coi.change_order_id
      LEFT JOIN projects p ON p.id = co.project_id
      LEFT JOIN change_order_approvals coa ON coa.impact_id = coi.id
      GROUP BY coi.id, co.title, co.status, p.name
      ORDER BY coi.created_at DESC
    `,
    detail: `
      SELECT coi.*, co.title AS change_order_title, co.description, co.reason, co.status AS change_order_status, p.name AS project_name
      FROM change_order_impacts coi
      LEFT JOIN change_orders co ON co.id = coi.change_order_id
      LEFT JOIN projects p ON p.id = co.project_id
      WHERE coi.id = $1
    `,
    children: [
      { key: 'approvals', query: 'SELECT * FROM change_order_approvals WHERE impact_id = $1 ORDER BY id' },
    ],
  },
  'project-risk-dashboard': {
    list: 'SELECT * FROM project_risk_metrics ORDER BY risk_score DESC, project_name',
    detail: 'SELECT * FROM project_risk_metrics WHERE project_id = $1',
    idField: 'project_id',
    children: [
      { key: 'bid_readiness', query: 'SELECT * FROM bid_readiness_metrics WHERE project_id = $1 ORDER BY severe_findings DESC, contractor_name' },
    ],
  },
};

router.get('/:feature', auth, async (req, res) => {
  const config = features[req.params.feature];
  if (!config) return res.status(404).json({ error: 'Feature not found.' });

  try {
    const result = await pool.query(config.list);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching ${req.params.feature}:`, err);
    res.status(500).json({ error: 'Failed to fetch feature data.' });
  }
});

router.get('/:feature/:id', auth, async (req, res) => {
  const config = features[req.params.feature];
  if (!config) return res.status(404).json({ error: 'Feature not found.' });

  try {
    const result = await pool.query(config.detail, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });

    const children = {};
    for (const child of config.children || []) {
      const childResult = await pool.query(child.query, [req.params.id]);
      children[child.key] = childResult.rows;
    }

    res.json({ ...result.rows[0], children });
  } catch (err) {
    console.error(`Error fetching ${req.params.feature} detail:`, err);
    res.status(500).json({ error: 'Failed to fetch feature detail.' });
  }
});

module.exports = router;
