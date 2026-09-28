'use strict';
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { compareScope, canApprove } = require('../domain/bidPolicy');

const WRITE_ROLES = ['estimator', 'manager', 'admin'];
const DOCUMENT_KINDS = ['plan', 'specification', 'addendum', 'bid'];
const INCLUSION_STATUSES = ['included', 'excluded', 'allowance', 'unclear'];
const RISK_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const REVIEWABLE_STATUSES = ['received', 'normalized'];

function badRequest(message) { return Object.assign(new Error(message), { statusCode: 400 }); }
function notFound(message) { return Object.assign(new Error(message), { statusCode: 404 }); }
function conflict(message) { return Object.assign(new Error(message), { statusCode: 409 }); }

async function member(client, organizationId, userId) {
  const result = await client.query('SELECT role FROM cb_memberships WHERE organization_id=$1 AND user_id=$2', [organizationId, userId]);
  if (!result.rows.length) throw Object.assign(new Error('Organization membership is required'), { statusCode: 403 });
  return result.rows[0];
}

function requireWriteRole(membership) {
  if (!WRITE_ROLES.includes(membership.role)) throw Object.assign(new Error('Estimator role is required'), { statusCode: 403 });
}

async function loadPackage(client, packageId, userId) {
  const result = await client.query('SELECT * FROM cb_packages WHERE id=$1', [packageId]);
  if (!result.rows.length) throw notFound('Bid package not found');
  const membership = await member(client, result.rows[0].organization_id, userId);
  return { pkg: result.rows[0], membership };
}

async function loadSubmission(client, submissionId, userId, { forUpdate = false } = {}) {
  const result = await client.query(
    `SELECT s.*,p.organization_id FROM cb_bid_submissions s JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1${forUpdate ? ' FOR UPDATE' : ''}`,
    [submissionId]
  );
  if (!result.rows.length) throw notFound('Submission not found');
  const membership = await member(client, result.rows[0].organization_id, userId);
  return { submission: result.rows[0], membership };
}

async function recordAudit(client, organizationId, actorId, action, entityType, entityId, beforeState, afterState) {
  await client.query(
    `INSERT INTO cb_audit_events(organization_id,actor_id,action,entity_type,entity_id,before_state,after_state)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [organizationId, actorId, action, entityType, entityId, beforeState || null, afterState || null]
  );
}

function optionalNumber(value, field) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw badRequest(`${field} must be a non-negative number`);
  return number;
}

function fail(res, error) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  if (error.code === '23505') return res.status(409).json({ error: 'That record already exists' });
  if (error.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist' });
  if (error.code === '23514') return res.status(400).json({ error: 'Value violates a bid workflow constraint' });
  return res.status(500).json({ error: 'Bid workflow failed' });
}

router.post('/organizations/:organizationId/packages', auth, async (req, res) => {
  try {
    const organizationId = Number(req.params.organizationId); const membership = await member(pool, organizationId, req.user.id);
    requireWriteRole(membership);
    const result = await pool.query('INSERT INTO cb_packages(organization_id,project_id,name,due_at,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [organizationId, req.body.projectId || null, req.body.name, req.body.dueAt || null, req.user.id]);
    await recordAudit(pool, organizationId, req.user.id, 'package.created', 'package', result.rows[0].id, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { fail(res, error); }
});

router.post('/packages/:packageId/documents', auth, async (req, res) => {
  try {
    const { pkg, membership } = await loadPackage(pool, req.params.packageId, req.user.id);
    requireWriteRole(membership);
    const { kind, revision, storageKey, sha256, supersedesId } = req.body || {};
    if (!DOCUMENT_KINDS.includes(kind)) throw badRequest(`kind must be one of: ${DOCUMENT_KINDS.join(', ')}`);
    if (!revision || !String(revision).trim()) throw badRequest('revision is required');
    if (!storageKey || !String(storageKey).trim()) throw badRequest('storageKey is required');
    if (!sha256 || !String(sha256).trim()) throw badRequest('sha256 is required');
    if (supersedesId) {
      const prior = await pool.query('SELECT id FROM cb_documents WHERE id=$1 AND package_id=$2', [supersedesId, pkg.id]);
      if (!prior.rows.length) throw badRequest('supersedesId must reference a document in this package');
    }
    const result = await pool.query(
      `INSERT INTO cb_documents(package_id,kind,revision,storage_key,sha256,supersedes_id,uploaded_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [pkg.id, kind, String(revision).trim(), String(storageKey).trim(), String(sha256).trim(), supersedesId || null, req.user.id]
    );
    await recordAudit(pool, pkg.organization_id, req.user.id, 'document.registered', 'document', result.rows[0].id, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { fail(res, error); }
});

router.post('/packages/:packageId/scope-items', auth, async (req, res) => {
  try {
    const { pkg, membership } = await loadPackage(pool, req.params.packageId, req.user.id);
    requireWriteRole(membership);
    const { code, description, quantity, unit, sourceDocumentId, sourceLocator } = req.body || {};
    if (!code || !String(code).trim()) throw badRequest('code is required');
    if (!description || !String(description).trim()) throw badRequest('description is required');
    if (!unit || !String(unit).trim()) throw badRequest('unit is required');
    const qty = optionalNumber(quantity, 'quantity');
    if (qty === null) throw badRequest('quantity must be a non-negative number');
    if (sourceDocumentId) {
      const doc = await pool.query('SELECT id FROM cb_documents WHERE id=$1 AND package_id=$2', [sourceDocumentId, pkg.id]);
      if (!doc.rows.length) throw badRequest('sourceDocumentId must reference a document in this package');
    }
    const result = await pool.query(
      `INSERT INTO cb_scope_items(package_id,code,description,quantity,unit,source_document_id,source_locator)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [pkg.id, String(code).trim(), String(description).trim(), qty, String(unit).trim(), sourceDocumentId || null, sourceLocator || null]
    );
    await recordAudit(pool, pkg.organization_id, req.user.id, 'scope_item.created', 'scope_item', result.rows[0].id, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { fail(res, error); }
});

router.post('/packages/:packageId/submissions', auth, async (req, res) => {
  try {
    const { pkg, membership } = await loadPackage(pool, req.params.packageId, req.user.id);
    requireWriteRole(membership);
    const { bidderId, submittedAt, currency, total } = req.body || {};
    const bidder = Number(bidderId);
    if (!Number.isInteger(bidder) || bidder <= 0) throw badRequest('bidderId must be a positive integer');
    const submitted = submittedAt ? new Date(submittedAt) : new Date();
    if (Number.isNaN(submitted.getTime())) throw badRequest('submittedAt must be a valid timestamp');
    if (!currency || !/^[A-Za-z]{3}$/.test(String(currency))) throw badRequest('currency must be a 3-letter code');
    const amount = optionalNumber(total, 'total');
    const result = await pool.query(
      `INSERT INTO cb_bid_submissions(package_id,bidder_id,status,submitted_at,currency,total)
       VALUES($1,$2,'received',$3,$4,$5) RETURNING *`,
      [pkg.id, bidder, submitted, String(currency).toUpperCase(), amount]
    );
    await recordAudit(pool, pkg.organization_id, req.user.id, 'bid.received', 'submission', result.rows[0].id, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { fail(res, error); }
});

router.post('/submissions/:id/lines', auth, async (req, res) => {
  try {
    const { submission, membership } = await loadSubmission(pool, req.params.id, req.user.id);
    requireWriteRole(membership);
    const lines = Array.isArray(req.body && req.body.lines) ? req.body.lines : [req.body || {}];
    if (!lines.length || !lines.some((line) => line && Object.keys(line).length)) throw badRequest('At least one bid line is required');
    const inserted = [];
    for (const line of lines) {
      if (!line || typeof line !== 'object') throw badRequest('Each bid line must be an object');
      if (!line.scopeCode || !String(line.scopeCode).trim()) throw badRequest('Each bid line requires scopeCode');
      if (!INCLUSION_STATUSES.includes(line.inclusionStatus)) throw badRequest(`inclusionStatus must be one of: ${INCLUSION_STATUSES.join(', ')}`);
      if (line.unit != null && String(line.unit).trim() === '') throw badRequest('unit must not be blank');
      const result = await pool.query(
        `INSERT INTO cb_bid_lines(submission_id,scope_code,quantity,unit,unit_price,inclusion_status,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          submission.id,
          String(line.scopeCode).trim(),
          optionalNumber(line.quantity, 'quantity'),
          line.unit != null ? String(line.unit).trim() : null,
          optionalNumber(line.unitPrice, 'unitPrice'),
          line.inclusionStatus,
          line.notes != null ? String(line.notes) : null,
        ]
      );
      inserted.push(result.rows[0]);
    }
    await recordAudit(pool, submission.organization_id, req.user.id, 'bid.lines_recorded', 'submission', submission.id, null, { line_ids: inserted.map((line) => line.id) });
    res.status(201).json({ lines: inserted });
  } catch (error) { fail(res, error); }
});

router.post('/submissions/:id/risks', auth, async (req, res) => {
  try {
    const { submission, membership } = await loadSubmission(pool, req.params.id, req.user.id);
    requireWriteRole(membership);
    const risks = Array.isArray(req.body && req.body.risks) ? req.body.risks : [req.body || {}];
    if (!risks.length || !risks.some((risk) => risk && Object.keys(risk).length)) throw badRequest('At least one risk is required');
    const inserted = [];
    for (const risk of risks) {
      if (!risk || typeof risk !== 'object') throw badRequest('Each risk must be an object');
      if (!risk.kind || !String(risk.kind).trim()) throw badRequest('Each risk requires kind');
      if (!RISK_SEVERITIES.includes(risk.severity)) throw badRequest(`severity must be one of: ${RISK_SEVERITIES.join(', ')}`);
      const evidence = risk.evidence == null ? {} : risk.evidence;
      if (typeof evidence !== 'object' || Array.isArray(evidence)) throw badRequest('evidence must be a JSON object');
      const result = await pool.query(
        `INSERT INTO cb_risks(submission_id,kind,severity,evidence,owner_id)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [submission.id, String(risk.kind).trim(), risk.severity, evidence, risk.ownerId || null]
      );
      inserted.push(result.rows[0]);
    }
    await recordAudit(pool, submission.organization_id, req.user.id, 'risk.recorded', 'submission', submission.id, null, { risk_ids: inserted.map((risk) => risk.id) });
    res.status(201).json({ risks: inserted });
  } catch (error) { fail(res, error); }
});

/** received|normalized -> review: the transition approve() requires. */
router.post('/submissions/:id/review', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { submission, membership } = await loadSubmission(client, req.params.id, req.user.id, { forUpdate: true });
    requireWriteRole(membership);
    if (!REVIEWABLE_STATUSES.includes(submission.status)) throw conflict(`Cannot move a ${submission.status} submission into review`);
    const { version } = req.body || {};
    if (version == null) throw badRequest('version is required');
    const result = await client.query("UPDATE cb_bid_submissions SET status='review',version=version+1 WHERE id=$1 AND version=$2 RETURNING *", [submission.id, version]);
    if (!result.rows.length) throw conflict('Submission version conflict');
    await recordAudit(client, submission.organization_id, req.user.id, 'bid.review_started', 'submission', submission.id, submission, result.rows[0]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); fail(res, error); } finally { client.release(); }
});

router.get('/submissions/:id/scope-comparison', auth, async (req, res) => {
  try {
    const submission = await pool.query('SELECT s.*,p.organization_id FROM cb_bid_submissions s JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1', [req.params.id]);
    if (!submission.rows.length) return res.status(404).json({ error: 'Submission not found' });
    await member(pool, submission.rows[0].organization_id, req.user.id);
    const expected = await pool.query('SELECT code,quantity,unit FROM cb_scope_items WHERE package_id=$1 ORDER BY code', [submission.rows[0].package_id]);
    const received = await pool.query('SELECT scope_code AS code,quantity,unit,inclusion_status FROM cb_bid_lines WHERE submission_id=$1 ORDER BY scope_code', [req.params.id]);
    res.json({ comparison: compareScope(expected.rows, received.rows) });
  } catch (error) { fail(res, error); }
});

router.post('/submissions/:id/approve', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT s.*,p.organization_id FROM cb_bid_submissions s JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!found.rows.length) throw notFound('Submission not found');
    const submission = found.rows[0]; const membership = await member(client, submission.organization_id, req.user.id);
    requireWriteRole(membership);
    const risks = await client.query("SELECT count(*)::int AS count FROM cb_risks WHERE submission_id=$1 AND status='open'", [submission.id]);
    if (!canApprove(membership.role, submission.status, risks.rows[0].count)) throw conflict('Estimator review and zero unresolved risks are required');
    const result = await client.query("UPDATE cb_bid_submissions SET status='approved',version=version+1 WHERE id=$1 AND version=$2 RETURNING *", [submission.id, req.body.version]);
    if (!result.rows.length) throw conflict('Submission version conflict');
    await client.query("INSERT INTO cb_decisions(submission_id,decision,rationale,decided_by) VALUES($1,'approve',$2,$3)", [submission.id, req.body.rationale, req.user.id]);
    await recordAudit(client, submission.organization_id, req.user.id, 'bid.approved', 'submission', submission.id, submission, result.rows[0]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); fail(res, error); } finally { client.release(); }
});

module.exports = router;
