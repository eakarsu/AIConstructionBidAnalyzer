'use strict';
// Feature-pack domain helpers (wave 31B): deterministic, dependency-free.
function filterRecords(records, query = {}) {
  const list = Array.isArray(records) ? records : [];
  const q = String(query.q || query.search || '').trim().toLowerCase();
  const reserved = new Set(['q','search','format','page','limit']);
  const filters = Object.entries(query).filter(([k,v]) => !reserved.has(k) && v !== undefined && v !== '');
  return list.filter((r) => {
    if (q) {
      const hay = Object.values(r || {}).filter(v => v !== null && typeof v !== 'object').join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return filters.every(([k,v]) => String((r||{})[k] ?? '').toLowerCase() === String(v).toLowerCase());
  });
}
function toCsv(records) {
  const list = Array.isArray(records) ? records : [];
  if (!list.length) return '';
  const cols = [...new Set(list.flatMap(r => Object.keys(r || {})))];
  const esc = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  return [cols.join(','), ...list.map(r => cols.map(c => esc((r||{})[c])).join(','))].join('\n') + '\n';
}
function breakdown(records, field) {
  const out = {};
  for (const r of (records||[])) { const k = String((r||{})[field] ?? ''); out[k] = (out[k]||0)+1; }
  return out;
}
function sumField(records, field) { return (records||[]).reduce((a,r)=> a + (Number((r||{})[field])||0), 0); }
function sections(pairs) { return pairs.map(([label, value]) => ({ label, value })); }

function bidRiskSummary(records) {
  const amounts = (records||[]).map(r=>Number(r.bid_amount)).filter(Number.isFinite);
  const total = amounts.reduce((a,b)=>a+b,0);
  return { summary: 'Deterministic bid risk summary over '+records.length+' record(s).', sections: sections([['Record count', records.length],['Total bid amount', total],['Average bid amount', amounts.length? total/amounts.length : 0],['Status breakdown', breakdown(records,'status')],['Lowest bid', amounts.length? Math.min(...amounts):0],['Highest bid', amounts.length? Math.max(...amounts):0]]) };
}
function contractorComparison(records) {
  const by={}; for (const r of records||[]) { const k=String(r.contractor_name??''); by[k]=by[k]||{count:0,total:0}; by[k].count++; by[k].total+=Number(r.bid_amount)||0; }
  return { summary:'Deterministic contractor comparison.', sections: sections([['Record count',records.length],['Contractor count',Object.keys(by).length],['By contractor',by]]) };
}
function costVariance(records) {
  const amounts=(records||[]).map(r=>Number(r.bid_amount)).filter(Number.isFinite);
  const low=amounts.length?Math.min(...amounts):0, high=amounts.length?Math.max(...amounts):0;
  return { summary:'Deterministic bid spread / cost variance.', sections: sections([['Record count',records.length],['Lowest bid',low],['Highest bid',high],['Spread',high-low],['Spread percent', low? ((high-low)/low)*100 : 0]]) };
}

async function runAi(feature, records, builder) {
  const list = Array.isArray(records) ? records : [];
  const built = builder(list);
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return { aiGenerated: false, provider: null, feature, ...built };
  try {
    const base = process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
    const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'anthropic/claude-haiku-4.5';
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000);
    const resp = await fetch(base + '/chat/completions', { method:'POST', signal: ctrl.signal,
      headers:{ Authorization:'Bearer '+key, 'Content-Type':'application/json' },
      body: JSON.stringify({ model, messages:[{role:'user', content: 'Summarize these records for '+feature+': '+JSON.stringify(list).slice(0,4000)}] }) });
    clearTimeout(t);
    if (!resp.ok) throw new Error('provider '+resp.status);
    const data = await resp.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('empty provider response');
    return { aiGenerated: true, provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai', feature, text, ...built };
  } catch (_) { return { aiGenerated: false, provider: null, feature, ...built }; }
}
module.exports = { filterRecords, toCsv, breakdown, runAi, bidRiskSummary, contractorComparison, costVariance };
