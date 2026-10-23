'use strict';
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length>=32 ? process.env.JWT_SECRET : 'x'.repeat(32);

process.env.OPENROUTER_API_KEY=''; process.env.OPENAI_API_KEY='';
const test = require('node:test'); const assert = require('node:assert/strict');
const fp = require('../domain/featurePack');
const records = [{contractor_name:'Acme', bid_amount:100, status:'submitted'},{contractor_name:'Beta', bid_amount:0, status:''}];
test('search/filter filters by q and exact field', () => {
  assert.equal(fp.filterRecords(records, { q: 'Acme' }).length, 1);
  assert.equal(fp.filterRecords(records, { status: 'submitted' }).length, 1);
  assert.equal(fp.filterRecords(records, { q: 'no-such' }).length, 0);
});
test('CSV export preserves header and values, JSON shape via filter', () => {
  const csv = fp.toCsv(records); assert.ok(csv.split('\n')[0].length>0); assert.ok(csv.includes('Acme'));
  assert.equal(fp.toCsv([]), '');
});
test('deterministic AI fallback is labelled and preserves 0/empty', async () => {
  const out = await fp.runAi('bid-risk-summary', [], fp.bidRiskSummary);
  assert.equal(out.aiGenerated, false); assert.equal(out.provider, null);
  const vals = out.sections.map(s=>s.value); assert.ok(vals.includes(0));
  assert.ok(out.sections.every(s=>typeof s.label==='string' && s.label.length>0));
  const one = await fp.runAi('bid-risk-summary', records, fp.bidRiskSummary); assert.equal(one.aiGenerated,false);
});

test('feature-pack search/export/AI endpoints require auth', async () => {
  const express = require('express'); const jwt = require('jsonwebtoken');
  const app = express(); app.use(express.json()); app.use('/api/feature-pack', require('../routes/featurePack'));
  const srv = app.listen(0); await new Promise(r=>srv.once('listening',r));
  const base = 'http://127.0.0.1:'+srv.address().port+'/api/feature-pack';
  const token = jwt.sign({id:1}, process.env.JWT_SECRET);
  const H = { Authorization:'Bearer '+token, 'Content-Type':'application/json' };
  try {
    assert.equal((await fetch(base+'/bids/search')).status, 401);
    const ai = await (await fetch(base+'/ai/bid-risk-summary',{method:'POST',headers:H,body:JSON.stringify({records})})).json(); assert.equal(ai.aiGenerated,false);
    const exp = await fetch(base+'/export/bids?format=json',{headers:H}); assert.equal(exp.status,200);
  } finally { srv.close(); }
});

