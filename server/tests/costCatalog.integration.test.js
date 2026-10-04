'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

const run = process.env.RUN_DATABASE_TESTS === '1' ? test : test.skip;

run('cost catalog upload, independent approval, evidence download and tenant-isolated comparison', async () => {
  const dbName = `codex_bid_catalog_${crypto.randomBytes(5).toString('hex')}`;
  const root = path.resolve(__dirname, '..', '..');
  const user = process.env.USER;
  execFileSync('createdb', [dbName], { stdio: 'pipe' });
  let pool;
  let server;
  try {
    execFileSync('psql', ['-d', dbName, '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'server/migrations/001_controlled_bids.sql')], { stdio: 'pipe' });
    execFileSync('psql', ['-d', dbName, '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'server/migrations/003_cost_catalog.sql')], { stdio: 'pipe' });
    process.env.DATABASE_URL = '';
    process.env.DB_HOST = '/tmp'; process.env.DB_NAME = dbName; process.env.DB_USER = user; process.env.DB_PASSWORD = '';
    process.env.JWT_SECRET = 'test-only-cost-catalog-secret-'.padEnd(40, 'x');
    pool = require('../db');
    const app = express(); app.use(express.json());
    app.use('/api/controlled-bids', require('../routes/costCatalog'));
    server = await new Promise(resolve => { const listening = app.listen(0, () => resolve(listening)); });
    const base = `http://127.0.0.1:${server.address().port}/api/controlled-bids`;
    const token = id => jwt.sign({ id }, process.env.JWT_SECRET);
    const call = async (route, id, options = {}) => {
      const headers = { Authorization: `Bearer ${token(id)}`, ...options.headers };
      const response = await fetch(`${base}${route}`, { ...options, headers });
      const data = options.raw ? Buffer.from(await response.arrayBuffer()) : await response.json();
      return { status: response.status, data, headers: response.headers };
    };
    const first = await pool.query("INSERT INTO cb_organizations(tenant_key,name) VALUES('one','One') RETURNING id");
    const second = await pool.query("INSERT INTO cb_organizations(tenant_key,name) VALUES('two','Two') RETURNING id");
    const org1 = first.rows[0].id; const org2 = second.rows[0].id;
    for (const [org, id, role] of [[org1, 101, 'estimator'], [org1, 102, 'manager'], [org2, 201, 'manager']]) {
      await pool.query('INSERT INTO cb_memberships(organization_id,user_id,role) VALUES($1,$2,$3)', [org, id, role]);
    }
    const pkg = await pool.query('INSERT INTO cb_packages(organization_id,name,created_by) VALUES($1,$2,$3) RETURNING id', [org1, 'Bid', 101]);
    const bid = await pool.query("INSERT INTO cb_bid_submissions(package_id,bidder_id,submitted_at,currency) VALUES($1,77,now(),'USD') RETURNING id", [pkg.rows[0].id]);
    await pool.query("INSERT INTO cb_bid_lines(submission_id,scope_code,unit,unit_price,inclusion_status) VALUES($1,'A','ft',12,'included')", [bid.rows[0].id]);
    const source = Buffer.from('code,description,unit,unit_cost\nA,"Cable, material",ft,10.0000\n');
    const body = new FormData();
    body.append('versionLabel', 'Vendor estimate 2026-10'); body.append('currency', 'USD');
    body.append('csv', new Blob([source], { type: 'text/csv' }), 'estimate.csv');
    const imported = await call(`/organizations/${org1}/cost-catalog/imports`, 101, { method: 'POST', body });
    assert.equal(imported.status, 201);
    assert.equal(imported.data.itemCount, 1);
    const versionId = imported.data.version.id;
    assert.equal(imported.data.version.source_sha256, crypto.createHash('sha256').update(source).digest('hex'));
    assert.equal((await call(`/cost-catalog/versions/${versionId}`, 201)).status, 403);
    assert.equal((await call(`/submissions/${bid.rows[0].id}/cost-comparison?catalogVersionId=${versionId}`, 101)).status, 409);
    assert.equal((await call(`/cost-catalog/versions/${versionId}/approve`, 101, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rationale: 'Reviewed source file' }),
    })).status, 403);
    const approval = await call(`/cost-catalog/versions/${versionId}/approve`, 102, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rationale: 'Reviewed vendor estimate and scope' }),
    });
    assert.equal(approval.status, 200);
    await assert.rejects(pool.query('UPDATE cb_cost_catalog_items SET unit_cost=999 WHERE catalog_version_id=$1', [versionId]), /immutable/);
    await assert.rejects(pool.query('UPDATE cb_cost_catalog_versions SET source_sha256=$1 WHERE id=$2', ['0'.repeat(64), versionId]), /approval/);
    const comparison = await call(`/submissions/${bid.rows[0].id}/cost-comparison?catalogVersionId=${versionId}`, 101);
    assert.equal(comparison.status, 200);
    assert.equal(comparison.data.comparison[0].variancePercent, 20);
    assert.equal(comparison.data.comparison[0].catalogLine, 2);
    const downloaded = await call(`/cost-catalog/versions/${versionId}/source`, 101, { raw: true });
    assert.equal(downloaded.status, 200);
    assert.deepEqual(downloaded.data, source);
    assert.equal(downloaded.headers.get('x-content-sha256'), crypto.createHash('sha256').update(source).digest('hex'));
    assert.equal((await call(`/organizations/${org2}/cost-catalog/versions`, 101)).status, 403);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    execFileSync('dropdb', [dbName], { stdio: 'pipe' });
  }
});
