'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const pool = require('../db');
const auth = require('../middleware/auth');
const { parseCatalogCsv, compareCostLines } = require('../domain/costCatalog');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
function csvUpload(req, res, next) {
  upload.single('csv')(req, res, err => err ? fail(res, err) : next());
}
const writeRoles = new Set(['estimator', 'manager', 'admin']);

function error(statusCode, message) { return Object.assign(new Error(message), { statusCode }); }
function fail(res, err) {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'CSV upload exceeds the 2 MB limit or has invalid multipart data' });
  if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'Catalog version or scope code already exists' });
  return res.status(500).json({ error: 'Cost catalog workflow failed' });
}
async function membership(db, organizationId, userId) {
  const result = await db.query('SELECT role FROM cb_memberships WHERE organization_id=$1 AND user_id=$2', [organizationId, userId]);
  if (!result.rows.length) throw error(403, 'Organization membership is required');
  return result.rows[0];
}
function requireWriter(member) {
  if (!writeRoles.has(member.role)) throw error(403, 'Estimator role is required');
}
async function audit(db, organizationId, userId, action, entityId, afterState) {
  await db.query(`INSERT INTO cb_audit_events(organization_id,actor_id,action,entity_type,entity_id,after_state)
    VALUES($1,$2,$3,'cost_catalog_version',$4,$5)`, [organizationId, userId, action, entityId, afterState]);
}

router.get('/organizations/:organizationId/cost-catalog/versions', auth, async (req, res) => {
  try {
    await membership(pool, req.params.organizationId, req.user.id);
    const result = await pool.query(`SELECT v.id,v.organization_id,v.version_label,v.currency,v.source_filename,v.source_sha256,
      v.status,v.imported_by,v.imported_at,v.reviewed_by,v.reviewed_at,count(i.code)::int AS item_count
      FROM cb_cost_catalog_versions v LEFT JOIN cb_cost_catalog_items i ON i.catalog_version_id=v.id
      WHERE v.organization_id=$1 GROUP BY v.id ORDER BY v.imported_at DESC,v.id DESC LIMIT 100`, [req.params.organizationId]);
    res.json(result.rows);
  } catch (err) { fail(res, err); }
});

router.get('/cost-catalog/versions/:versionId', auth, async (req, res) => {
  try {
    const found = await pool.query(`SELECT id,organization_id,version_label,currency,source_filename,source_sha256,
      status,imported_by,imported_at,reviewed_by,reviewed_at FROM cb_cost_catalog_versions WHERE id=$1`, [req.params.versionId]);
    if (!found.rows.length) throw error(404, 'Catalog version not found');
    await membership(pool, found.rows[0].organization_id, req.user.id);
    const items = await pool.query('SELECT code,description,unit,unit_cost,source_line FROM cb_cost_catalog_items WHERE catalog_version_id=$1 ORDER BY code', [req.params.versionId]);
    res.json({ version: found.rows[0], items: items.rows });
  } catch (err) { fail(res, err); }
});

router.get('/cost-catalog/versions/:versionId/source', auth, async (req, res) => {
  try {
    const found = await pool.query('SELECT organization_id,source_filename,source_sha256,source_content FROM cb_cost_catalog_versions WHERE id=$1', [req.params.versionId]);
    if (!found.rows.length) throw error(404, 'Catalog version not found');
    await membership(pool, found.rows[0].organization_id, req.user.id);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="catalog-${req.params.versionId}.csv"`);
    res.set('X-Content-SHA256', found.rows[0].source_sha256);
    res.send(found.rows[0].source_content);
  } catch (err) { fail(res, err); }
});

router.post('/organizations/:organizationId/cost-catalog/imports', auth, csvUpload, async (req, res) => {
  let db;
  try {
    const organizationId = Number(req.params.organizationId);
    if (!Number.isSafeInteger(organizationId) || organizationId <= 0) throw error(400, 'Invalid organization ID');
    const member = await membership(pool, organizationId, req.user.id);
    requireWriter(member);
    const label = String(req.body.versionLabel || '').trim();
    const currency = String(req.body.currency || '').trim().toUpperCase();
    if (!label || label.length > 120) throw error(400, 'A version label of up to 120 characters is required');
    if (!/^[A-Z]{3}$/.test(currency)) throw error(400, 'Currency must be a three-letter code');
    if (!req.file || !/\.csv$/i.test(req.file.originalname)) throw error(400, 'A CSV file is required');
    const rows = parseCatalogCsv(req.file.buffer);
    const digest = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const filename = path.basename(req.file.originalname).slice(0, 150);
    db = await pool.connect();
    await db.query('BEGIN');
    const created = await db.query(`INSERT INTO cb_cost_catalog_versions
      (organization_id,version_label,currency,source_filename,source_sha256,source_content,imported_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,organization_id,version_label,currency,source_filename,source_sha256,status,imported_by,imported_at`,
      [organizationId, label, currency, filename, digest, req.file.buffer, req.user.id]);
    for (const item of rows) await db.query(`INSERT INTO cb_cost_catalog_items
      (catalog_version_id,code,description,unit,unit_cost,source_line) VALUES($1,$2,$3,$4,$5,$6)`,
      [created.rows[0].id, item.code, item.description, item.unit, item.unitCost, item.sourceLine]);
    await audit(db, organizationId, req.user.id, 'cost_catalog.imported', created.rows[0].id,
      { sourceSha256: digest, itemCount: rows.length, versionLabel: label });
    await db.query('COMMIT');
    res.status(201).json({ version: created.rows[0], itemCount: rows.length });
  } catch (err) { if (db) await db.query('ROLLBACK').catch(() => {}); fail(res, err); }
  finally { if (db) db.release(); }
});

router.post('/cost-catalog/versions/:versionId/approve', auth, async (req, res) => {
  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const found = await db.query('SELECT * FROM cb_cost_catalog_versions WHERE id=$1 FOR UPDATE', [req.params.versionId]);
    if (!found.rows.length) throw error(404, 'Catalog version not found');
    const version = found.rows[0];
    const member = await membership(db, version.organization_id, req.user.id);
    if (!['manager', 'admin'].includes(member.role)) throw error(403, 'Manager review is required');
    if (String(version.imported_by) === String(req.user.id)) throw error(403, 'A different reviewer must approve the catalog');
    if (version.status !== 'draft') throw error(409, 'Catalog is already approved');
    const rationale = String(req.body?.rationale || '').trim();
    if (rationale.length < 8 || rationale.length > 2000) throw error(400, 'Specific review rationale is required');
    const approved = await db.query(`UPDATE cb_cost_catalog_versions SET status='approved',reviewed_by=$2,
      reviewed_at=now() WHERE id=$1 RETURNING id,organization_id,version_label,currency,source_filename,
      source_sha256,status,imported_by,imported_at,reviewed_by,reviewed_at`, [version.id, req.user.id]);
    await audit(db, version.organization_id, req.user.id, 'cost_catalog.approved', version.id,
      { sourceSha256: version.source_sha256, rationale });
    await db.query('COMMIT');
    res.json(approved.rows[0]);
  } catch (err) { if (db) await db.query('ROLLBACK').catch(() => {}); fail(res, err); }
  finally { if (db) db.release(); }
});

router.get('/submissions/:submissionId/cost-comparison', auth, async (req, res) => {
  try {
    const versionId = Number(req.query.catalogVersionId);
    if (!Number.isSafeInteger(versionId) || versionId <= 0) throw error(400, 'An explicit catalogVersionId is required');
    const submission = await pool.query(`SELECT s.id,s.currency,p.organization_id FROM cb_bid_submissions s
      JOIN cb_packages p ON p.id=s.package_id WHERE s.id=$1`, [req.params.submissionId]);
    if (!submission.rows.length) throw error(404, 'Submission not found');
    await membership(pool, submission.rows[0].organization_id, req.user.id);
    const version = await pool.query(`SELECT id,organization_id,version_label,currency,source_sha256,status,reviewed_by,reviewed_at
      FROM cb_cost_catalog_versions WHERE id=$1 AND organization_id=$2`, [versionId, submission.rows[0].organization_id]);
    if (!version.rows.length) throw error(404, 'Catalog version not found in this organization');
    if (version.rows[0].status !== 'approved') throw error(409, 'Catalog requires independent approval before comparison');
    const [lines, items] = await Promise.all([
      pool.query('SELECT scope_code,unit,unit_price,inclusion_status FROM cb_bid_lines WHERE submission_id=$1 ORDER BY scope_code', [req.params.submissionId]),
      pool.query('SELECT code,description,unit,unit_cost,source_line FROM cb_cost_catalog_items WHERE catalog_version_id=$1', [versionId]),
    ]);
    res.json({ catalog: version.rows[0], submissionId: submission.rows[0].id,
      comparison: compareCostLines(lines.rows, items.rows, submission.rows[0].currency, version.rows[0].currency) });
  } catch (err) { fail(res, err); }
});

module.exports = router;
