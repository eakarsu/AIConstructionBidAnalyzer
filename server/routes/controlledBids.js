'use strict';
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { compareScope, canApprove } = require('../domain/bidPolicy');

async function member(client, organizationId, userId) {
  const result = await client.query('SELECT role FROM cb_memberships WHERE organization_id=$1 AND user_id=$2', [organizationId, userId]);
  if (!result.rows.length) throw Object.assign(new Error('Organization membership is required'), { statusCode: 403 });
  return result.rows[0];
}
function fail(res, error) { res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Bid workflow failed' }); }

router.post('/organizations/:organizationId/packages', auth, async (req, res) => {
  try {
    const organizationId = Number(req.params.organizationId); const membership = await member(pool, organizationId, req.user.id);
    if (!['estimator','manager','admin'].includes(membership.role)) return res.status(403).json({ error: 'Estimator role is required' });
    const result = await pool.query('INSERT INTO cb_packages(organization_id,project_id,name,due_at,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [organizationId, req.body.projectId || null, req.body.name, req.body.dueAt || null, req.user.id]);
    await pool.query("INSERT INTO cb_audit_events(organization_id,actor_id,action,entity_type,entity_id,after_state) VALUES($1,$2,'package.created','package',$3,$4)", [organizationId, req.user.id, result.rows[0].id, result.rows[0]]);
    res.status(201).json(result.rows[0]);
  } catch (error) { fail(res, error); }
});

router.get('/submissions/:id/scope-comparison', auth, async (req, res) => {
  try {
    const submission = await pool.query('SELECT s.*,p.organization_id FROM cb_bid_submissions s JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1', [req.params.id]);
    if (!submission.rows.length) return res.status(404).json({ error: 'Submission not found' });
    await member(pool, submission.rows[0].organization_id, req.user.id);
    const expected = await pool.query('SELECT code,quantity,unit FROM cb_scope_items WHERE package_id=$1 ORDER BY code', [submission.rows[0].package_id]);
    const received = await pool.query("SELECT scope_code AS code,quantity,unit FROM cb_bid_lines WHERE submission_id=$1 AND inclusion_status<>'excluded'", [req.params.id]);
    res.json({ comparison: compareScope(expected.rows, received.rows) });
  } catch (error) { fail(res, error); }
});

router.post('/submissions/:id/approve', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT s.*,p.organization_id FROM cb_bid_submissions s JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!found.rows.length) throw Object.assign(new Error('Submission not found'), { statusCode: 404 });
    const submission = found.rows[0]; const membership = await member(client, submission.organization_id, req.user.id);
    const risks = await client.query("SELECT count(*)::int AS count FROM cb_risks WHERE submission_id=$1 AND status='open'", [submission.id]);
    if (!canApprove(membership.role, submission.status, risks.rows[0].count)) throw Object.assign(new Error('Estimator review and zero unresolved risks are required'), { statusCode: 409 });
    const result = await client.query("UPDATE cb_bid_submissions SET status='approved',version=version+1 WHERE id=$1 AND version=$2 RETURNING *", [submission.id, req.body.version]);
    if (!result.rows.length) throw Object.assign(new Error('Submission version conflict'), { statusCode: 409 });
    await client.query("INSERT INTO cb_decisions(submission_id,decision,rationale,decided_by) VALUES($1,'approve',$2,$3)", [submission.id, req.body.rationale, req.user.id]);
    await client.query("INSERT INTO cb_audit_events(organization_id,actor_id,action,entity_type,entity_id,before_state,after_state) VALUES($1,$2,'bid.approved','submission',$3,$4,$5)", [submission.organization_id, req.user.id, submission.id, submission, result.rows[0]]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); fail(res, error); } finally { client.release(); }
});

module.exports = router;
