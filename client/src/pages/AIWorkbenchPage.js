import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Unified registry: AI Analysis + AI Lab + CF/Gap — only endpoints that actually exist on the backend.
const FEATURES = [
  // Core analysis (data-driven; use Project/Bid)
  { key: 'bid-analysis', group: 'Analysis', label: 'Bid Analysis', endpoint: '/api/ai/analyze-bid', desc: 'Deep analysis of a bid proposal.' },
  { key: 'cost-estimation', group: 'Analysis', label: 'Cost Estimation', endpoint: '/api/ai/estimate-cost', desc: 'AI-powered cost projections.' },
  { key: 'risk-assessment', group: 'Analysis', label: 'Risk Assessment', endpoint: '/api/ai/assess-risk', desc: 'Identify and evaluate project risks.' },
  { key: 'compliance-check', group: 'Analysis', label: 'Compliance Check', endpoint: '/api/ai/check-compliance', desc: 'Automated regulatory compliance review.' },
  { key: 'scope-analysis', group: 'Analysis', label: 'Scope Analysis', endpoint: '/api/ai/analyze-scope', desc: 'Scope completeness evaluation.' },
  { key: 'timeline-estimation', group: 'Analysis', label: 'Timeline Estimation', endpoint: '/api/ai/estimate-timeline', desc: 'Project duration predictions.' },
  { key: 'bid-comparison', group: 'Analysis', label: 'Bid Comparison', endpoint: '/api/ai/compare-bids', desc: 'Compare multiple bids intelligently.' },
  { key: 'material-optimization', group: 'Analysis', label: 'Material Optimization', endpoint: '/api/ai/optimize-materials', desc: 'Optimize material costs and usage.' },
  // Custom features
  { key: 'supplier-intelligence', group: 'Custom Feature', label: 'Supplier Intelligence', endpoint: '/api/ai/supplier-intel', desc: 'Vendor catalogs, pricing, lead times; optimal sourcing.' },
  { key: 'vision-based-site-inspection', group: 'Custom Feature', label: 'Vision-Based Site Inspection', endpoint: '/api/ai/site-vision', desc: 'Detect delays, safety violations, quality issues from site notes/photos.' },
  { key: 'agentic-contract-negotiation', group: 'Custom Feature', label: 'Agentic Contract Negotiation', endpoint: '/api/ai/agentic-negotiation', desc: 'Draft and negotiate contract terms.' },
  { key: 'variance-alerts', group: 'Custom Feature', label: 'Real-Time Cost Variance Alerts', endpoint: '/api/ai/variance-alerts', desc: 'Track costs and flag budget variances.' },
  { key: 'insurance-recommend', group: 'Custom Feature', label: 'Liability Insurance Recommendation', endpoint: '/api/ai/insurance-recommend', desc: 'Recommend coverage based on project risk.' },
  { key: 'sub-performance', group: 'Custom Feature', label: 'Subcontractor Performance Scoring', endpoint: '/api/ai/sub-performance', desc: 'Score subcontractors on performance & reliability.' },
  // Gap features
  { key: 'gap-site-vision', group: 'Gap', label: 'Site-Vision AI (Progress / Safety)', endpoint: '/api/gap-no-photo-site-vision-ai-for-progress-or-safety-inspection', desc: 'Photo/site-vision AI for progress or safety inspection.' },
  { key: 'gap-contractor-scoring', group: 'Gap', label: 'Contractor / Subcontractor AI Scoring', endpoint: '/api/gap-contractors-subcontractors-lack-ai-scoring-or-performance-pr', desc: 'AI scoring & performance prediction.' },
  { key: 'gap-bid-negotiation', group: 'Gap', label: 'Agentic Bid Negotiation', endpoint: '/api/gap-no-agentic-bid-negotiation-flow', desc: 'Agentic bid-negotiation workflow.' },
  { key: 'gap-supplier-directory', group: 'Gap', label: 'Supplier Directory / Vendor Mgmt', endpoint: '/api/gap-no-supplier-directory-vendor-management-portal', desc: 'Supplier directory & vendor management.' },
  { key: 'gap-rfq-automation', group: 'Gap', label: 'RFQ Automation / Vendor Outreach', endpoint: '/api/gap-no-rfq-automation-or-vendor-outreach-workflow', desc: 'RFQ automation and vendor outreach.' },
  { key: 'gap-equipment-rental', group: 'Gap', label: 'Equipment Rental / Availability', endpoint: '/api/gap-no-equipment-rental-marketplace-or-availability-tracker', desc: 'Equipment rental & availability tracking.' },
  { key: 'gap-calendar', group: 'Gap', label: 'Calendar Integration', endpoint: '/api/gap-no-calendar-integration', desc: 'Calendar integration recommendations.' },
  { key: 'gap-mobile', group: 'Gap', label: 'Mobile / Field App Surfaces', endpoint: '/api/gap-limited-mobile-field-app-surfaces', desc: 'Mobile/field app surface recommendations.' },
];

const OUTPUTS = [
  { key: 'scenario', label: 'Scenario plan', instruction: 'Provide a summary, prioritized action plan, assumptions, and follow-up questions.' },
  { key: 'analysis', label: 'Data analysis', instruction: 'Return structured findings, anomalies, recommendations, and confidence levels.' },
  { key: 'executive', label: 'Executive review', instruction: 'Include impact, risk, estimated effort, decision points, and a concise next-step plan for leaders.' },
];

// Complete one-click scenarios — each fills every field: feature, output, project, bid, and text inputs.
const SCENARIOS = [
  {
    label: '⚡ Quick scenario',
    feature: 'bid-analysis',
    output: 'scenario',
    context: 'A GC submitted a $4.2M bid for a mid-size commercial build-out on an 8-month schedule with incomplete MEP scope.',
    records: '- Base bid: $4,200,000\n- Allowances: $180,000\n- Exclusions: permits, hazmat\n- Schedule: 8 months',
    objective: 'Identify the best action, key risks, and missing information before award.',
  },
  {
    label: '📊 Sample data',
    feature: 'cost-estimation',
    output: 'analysis',
    context: 'Analyze cost line items for an active commercial project to flag variances.',
    records: '- Concrete: est $620k / actual $710k\n- Steel: est $900k / actual $880k\n- Labor: est $1.1M / actual $1.32M',
    objective: 'Surface anomalies, overruns, and a prioritized cost-control recommendation.',
  },
  {
    label: '📝 Executive review',
    feature: 'risk-assessment',
    output: 'executive',
    context: 'Prepare an executive briefing on project risk for the owner and operations lead.',
    records: '- 2 critical risks open\n- 5 high-severity items\n- 1 schedule slip (2 weeks)',
    objective: 'Summarize impact, risk, estimated effort, and decision points.',
  },
  {
    label: '🏗️ Design-build risk',
    feature: 'risk-assessment',
    output: 'analysis',
    context: 'Design-build proposal for a 120,000 SF mixed-use project with early procurement packages and incomplete civil drawings.',
    records: '- GMP: $38.5M\n- Civil design: 70% complete\n- Long-lead switchgear: 44 weeks\n- Owner requested phased turnover',
    objective: 'Identify the bid risks, schedule exposure, and contract clarifications needed before shortlist interview.',
    projectPick: 'last',
    bidPick: 'highest',
  },
  {
    label: '📦 Supplier lead times',
    feature: 'supplier-intelligence',
    output: 'analysis',
    context: 'Procurement team needs sourcing recommendations for materials with unstable pricing and long supplier lead times.',
    records: '- Structural steel: 1,100 tons, 16-20 week lead time\n- Curtainwall: 68,000 SF, 28 week lead time\n- Rooftop units: 14 units, limited allocation',
    objective: 'Recommend sourcing actions, vendor outreach priorities, and price-risk protections for the bid.',
    projectPick: 'first',
    bidPick: 'first',
  },
  {
    label: '📸 Site inspection',
    feature: 'vision-based-site-inspection',
    output: 'scenario',
    context: 'Field team submitted site notes instead of photos for a progress and safety review on an active commercial project.',
    records: '- Floor 3 framing 80% complete\n- Guardrails missing at east stair opening\n- Materials stored in egress path\n- Subcontractor reports two-day manpower shortage',
    objective: 'Produce progress findings, safety concerns, recommended corrective actions, and documentation follow-ups.',
    projectPick: 'first',
    bidPick: 'first',
  },
  {
    label: '🤝 Bid negotiation',
    feature: 'agentic-contract-negotiation',
    output: 'executive',
    context: 'Owner wants to negotiate a preferred contractor bid without weakening schedule certainty or risk transfer.',
    records: '- Preferred bid: $12.8M\n- Target budget: $12.1M\n- Alternate deducts: $420k\n- Liquidated damages requested: $8k/day',
    objective: 'Draft a negotiation strategy with concession order, contract redlines, and fallback positions.',
    projectPick: 'last',
    bidPick: 'highest',
  },
  {
    label: '💸 Variance alert',
    feature: 'variance-alerts',
    output: 'analysis',
    context: 'Project controls need an early-warning variance review using current cost and committed-cost signals.',
    records: '- Concrete committed: +11% versus estimate\n- Electrical buyout: -3% versus estimate\n- Labor productivity: 0.86 PF\n- Contingency remaining: 42%',
    objective: 'Flag urgent variances, likely root causes, and next controls actions by cost code.',
    projectPick: 'first',
    bidPick: 'first',
  },
  {
    label: '🛡️ Insurance coverage',
    feature: 'insurance-recommend',
    output: 'scenario',
    context: 'A contractor is bidding a public safety facility with high visitor traffic and multiple specialty trades.',
    records: '- Contract value: $24M\n- Work includes structural retrofit and occupied-campus logistics\n- Crane picks near public right-of-way\n- Builder risk required by owner',
    objective: 'Recommend coverage limits, endorsements, and risk notes for bid qualification.',
    projectPick: 'last',
    bidPick: 'first',
  },
  {
    label: '👷 Sub score',
    feature: 'sub-performance',
    output: 'analysis',
    context: 'Estimating team is choosing between subcontractors for HVAC and electrical scopes on a deadline-driven project.',
    records: '- Sub A: 4.7 rating, 3 late RFIs, price $1.42M\n- Sub B: 4.1 rating, clean safety record, price $1.36M\n- Sub C: 3.8 rating, strongest manpower availability, price $1.31M',
    objective: 'Score reliability, delivery risk, and best-value recommendation with mitigation steps.',
    projectPick: 'first',
    bidPick: 'lowest',
  },
  {
    label: '📨 RFQ outreach',
    feature: 'gap-rfq-automation',
    output: 'scenario',
    context: 'Estimating team needs an RFQ outreach workflow for missing vendor quotes before bid day.',
    records: '- Missing quotes: doors/hardware, fireproofing, landscaping\n- Bid due: 5 business days\n- Known vendors: 18\n- Quote coverage target: 3 qualified quotes per scope',
    objective: 'Create an outreach plan, follow-up timing, escalation rules, and data fields to track.',
    projectPick: 'first',
    bidPick: 'first',
  },
  {
    label: '🚜 Equipment availability',
    feature: 'gap-equipment-rental',
    output: 'analysis',
    context: 'Operations needs rental availability and cost exposure reviewed before committing to a fast-track schedule.',
    records: '- Crane required weeks 4-7\n- Telehandlers required weeks 2-18\n- Generator backup needed for temporary power\n- Local rental market reported tight availability',
    objective: 'Recommend reservation timing, substitute equipment options, and schedule risk controls.',
    projectPick: 'last',
    bidPick: 'first',
  },
  {
    label: '📱 Field mobile rollout',
    feature: 'gap-mobile',
    output: 'executive',
    context: 'Leadership is evaluating whether mobile field surfaces should be prioritized for bid tracking and site updates.',
    records: '- Current updates arrive by email and spreadsheets\n- Superintendents need offline access\n- Daily reports often delayed 24-48 hours\n- Photo evidence is not linked to bid assumptions',
    objective: 'Recommend launch scope, user roles, expected ROI, and implementation phases.',
    projectPick: 'first',
    bidPick: 'first',
  },
];

const inp = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };
const chip = { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '6px 12px', borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: 'pointer' };

function rowsFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function money(value) {
  const numeric = Number(value || 0);
  return numeric ? `$${numeric.toLocaleString()}` : 'N/A';
}

function bidLabel(bid) {
  if (!bid) return '';
  return `${bid.contractor_name || bid.title || `Bid ${bid.id}`} - ${money(bid.bid_amount || bid.amount)}`;
}

function bidRecord(bid) {
  if (!bid) return '';
  return [
    'Selected bid:',
    `- Contractor: ${bid.contractor_name || 'N/A'}`,
    `- Bid amount: ${money(bid.bid_amount || bid.amount)}`,
    `- Status: ${bid.status || 'N/A'}`,
    `- Project: ${bid.project_name || bid.project_id || 'N/A'}`,
    bid.scope ? `- Scope: ${bid.scope}` : null,
    bid.notes ? `- Notes: ${bid.notes}` : null,
  ].filter(Boolean).join('\n');
}

function renderValue(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{v.map((x, i) => <li key={i} style={{ fontSize: 14, color: '#334155' }}>{typeof x === 'object' ? Object.values(x).filter(Boolean).join(' — ') : String(x)}</li>)}</ul>;
  if (typeof v === 'object') return <div style={{ paddingLeft: 8 }}>{Object.entries(v).map(([k, val]) => <Section key={k} k={k} v={val} />)}</div>;
  return <p style={{ fontSize: 14, color: '#334155', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{String(v)}</p>;
}
function Section({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748b', marginBottom: 2 }}>{k.replace(/_/g, ' ')}</div>
      {renderValue(v)}
    </div>
  );
}

export default function AIWorkbenchPage() {
  const [featureKey, setFeatureKey] = useState(FEATURES[0].key);
  const [outputKey, setOutputKey] = useState('scenario');
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [bidId, setBidId] = useState('');
  const [context, setContext] = useState('');
  const [records, setRecords] = useState('');
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const feature = FEATURES.find((f) => f.key === featureKey);
  const output = OUTPUTS.find((o) => o.key === outputKey);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get('/api/projects?limit=100', { headers }).then((r) => setProjects(rowsFromResponse(r.data))).catch(() => {});
    axios.get('/api/bids?limit=100', { headers }).then((r) => setBids(rowsFromResponse(r.data))).catch(() => {});
  }, []);

  const pickProject = (mode, sourceProjects = projects) => {
    if (!sourceProjects.length || mode === 'none') return '';
    if (mode === 'last') return String(sourceProjects[sourceProjects.length - 1].id);
    return String(sourceProjects[0].id);
  };

  const pickBidObject = (mode, sourceBids = bids) => {
    if (!sourceBids.length || mode === 'none') return '';
    if (mode === 'highest') {
      return [...sourceBids].sort((a, b) => Number(b.bid_amount || b.amount || 0) - Number(a.bid_amount || a.amount || 0))[0] || null;
    }
    if (mode === 'lowest') {
      return [...sourceBids].sort((a, b) => Number(a.bid_amount || a.amount || 0) - Number(b.bid_amount || b.amount || 0))[0] || null;
    }
    return sourceBids[0] || null;
  };

  const getReferenceData = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [projectRes, bidRes] = await Promise.all([
      projects.length ? Promise.resolve({ data: projects }) : axios.get('/api/projects?limit=100', { headers }),
      bids.length ? Promise.resolve({ data: bids }) : axios.get('/api/bids?limit=100', { headers }),
    ]);
    const latestProjects = rowsFromResponse(projectRes.data);
    const latestBids = rowsFromResponse(bidRes.data);
    if (!projects.length) setProjects(latestProjects);
    if (!bids.length) setBids(latestBids);
    return { latestProjects, latestBids };
  };

  const applyPreset = async (p) => {
    const { latestProjects, latestBids } = await getReferenceData();
    const selectedBid = pickBidObject(p.bidPick || 'first', latestBids);
    const selectedProjectId = p.projectId || (selectedBid?.project_id ? String(selectedBid.project_id) : pickProject(p.projectPick || 'first', latestProjects));
    const selectedBidId = p.bidId || (selectedBid ? String(selectedBid.id) : '');
    const selectedBidRecord = bidRecord(selectedBid);

    setFeatureKey(p.feature);
    setOutputKey(p.output);
    setContext(p.context);
    setRecords([p.records, selectedBidRecord].filter(Boolean).join('\n\n'));
    setObjective(p.objective);
    setProjectId(selectedProjectId);
    setBidId(selectedBidId);
    setResult(null);
  };

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem('token');
      const body = {
        feature: feature.key,
        feature_label: feature.label,
        analysis_type: feature.key,
        projectId: projectId || undefined,
        bidId: bidId || undefined,
        context,
        records,
        objective,
        output_format: output.label,
        instruction: output.instruction,
        // legacy field some core endpoints read:
        additionalNotes: [context, objective, records].filter(Boolean).join('\n\n'),
      };
      const res = await axios.post(feature.endpoint, body, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data || {};
      setResult(data.ai_result || data.result || data.analysis || data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>🤖 AI Workbench</h2>
      <p style={{ opacity: 0.75, marginBottom: 20 }}>Every AI capability in one place — pick a feature, use a quick-fill button or enter your own details, and run.</p>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 6 }}>
          <div>
            <label style={lbl}>AI Feature</label>
            <select style={inp} value={featureKey} onChange={(e) => { setFeatureKey(e.target.value); setResult(null); }}>
              {['Analysis', 'Custom Feature', 'Gap'].map((g) => (
                <optgroup key={g} label={g === 'Custom Feature' ? 'Custom Features' : g === 'Gap' ? 'Gap Features' : g}>
                  {FEATURES.filter((f) => f.group === g).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Output Type</label>
            <select style={inp} value={outputKey} onChange={(e) => setOutputKey(e.target.value)}>
              {OUTPUTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 14px' }}>{feature.desc}</p>

        {/* Quick-fill buttons — populate every field below */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, alignSelf: 'center' }}>Full form presets:</span>
          {SCENARIOS.map((p, i) => (
            <button key={i} type="button" onClick={() => applyPreset(p)}
              style={chip}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Project (optional)</label>
            <select style={inp} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— none —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name || p.title || `Project ${p.id}`}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Bid (optional)</label>
            <select style={inp} value={bidId} onChange={(e) => setBidId(e.target.value)}>
              <option value="">— none —</option>
              {bids.map((b) => <option key={b.id} value={b.id}>{bidLabel(b)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Context / Scenario</label>
          <textarea style={{ ...inp, minHeight: 64 }} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Describe the situation, project, or constraints…" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Data / Records</label>
          <textarea style={{ ...inp, minHeight: 80, fontFamily: 'monospace', fontSize: 13 }} value={records} onChange={(e) => setRecords(e.target.value)} placeholder="Paste relevant records, line items, or metrics…" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Objective</label>
          <input style={inp} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What decision or output do you need?" />
        </div>

        <button onClick={run} disabled={loading}
          style={{ background: '#2563eb', color: '#fff', border: 0, padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Running…' : 'Run AI Feature'}
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {result && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>{feature.label} — {output.label}</h3>
          {renderValue(result)}
        </div>
      )}
    </div>
  );
}
