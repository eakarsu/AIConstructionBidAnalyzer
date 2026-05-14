import React, { useState, useEffect } from 'react';
import axios from 'axios';

const aiFeatures = [
  {
    key: 'subcontractor-analysis',
    label: 'Subcontractor Analysis',
    icon: '🔨',
    endpoint: '/api/ai/subcontractor-analysis',
    desc: 'Evaluate subcontractor quotes for scope gaps, price anomalies, and risk.',
  },
  {
    key: 'value-engineering',
    label: 'Value Engineering',
    icon: '💡',
    endpoint: '/api/ai/value-engineering',
    desc: 'Cost reduction opportunities with trade-offs and revised budget estimate.',
  },
  {
    key: 'cash-flow-projection',
    label: 'Cash Flow Projection',
    icon: '💸',
    endpoint: '/api/ai/cash-flow-projection',
    desc: 'Monthly cash flow forecast, peak negative cash flow point, financing needs.',
  },
  {
    key: 'dispute-analyzer',
    label: 'Dispute Analyzer',
    icon: '⚖️',
    endpoint: '/api/ai/dispute-analyzer',
    desc: 'Legal risk assessment & settlement recommendations for change order disputes.',
  },
  {
    key: 'bid-history',
    label: 'Bid History Tracking',
    icon: '📜',
    endpoint: '/api/ai/compare-bids',
    desc: 'Maintain bid version history and AI-flag major shifts between revisions.',
  },
  {
    key: 'budget-vs-actual',
    label: 'Budget vs Actual',
    icon: '📉',
    endpoint: '/api/ai/estimate-cost',
    desc: 'Track project actuals vs estimates; AI identifies variance causes.',
  },
  {
    key: 'contractor-scoring',
    label: 'Contractor Performance',
    icon: '⭐',
    endpoint: '/api/ai/analyze-bid',
    desc: 'Rate contractors on schedule/cost/quality from past projects.',
  },
  {
    key: 'material-alerts',
    label: 'Material Price Alerts',
    icon: '🛒',
    endpoint: '/api/ai/optimize-materials',
    desc: 'Monitor material prices, alert on threshold crossings, suggest substitutes.',
  },
  {
    key: 'schedule-risk',
    label: 'Schedule Risk Mitigation',
    icon: '🛤️',
    endpoint: '/api/ai/assess-risk',
    desc: 'Identify critical path risks, suggest parallel work / acceleration.',
  },
  {
    key: 'sub-conflict',
    label: 'Subcontractor Conflict Detection',
    icon: '⚙️',
    endpoint: '/api/ai/analyze-scope',
    desc: 'Flag potential trade conflicts (electrical/plumbing routing).',
  },
  {
    key: 'safety-prediction',
    label: 'Safety Incident Prediction',
    icon: '🦺',
    endpoint: '/api/ai/assess-risk',
    desc: 'AI predicts high-risk phases by project type/complexity/budget/timeline.',
  },
  {
    key: 'profitability-dashboard',
    label: 'Profitability Dashboard',
    icon: '📊',
    endpoint: '/api/ai/estimate-cost',
    desc: 'Real-time P&L by project with labor/material/overhead variance.',
  },
];

const AILabPage = () => {
  const [activeTab, setActiveTab] = useState('subcontractor-analysis');
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  // Shared form state
  const [projectId, setProjectId] = useState('');
  const [bidId, setBidId] = useState('');

  // Subcontractor Analysis
  const [scopeDescription, setScopeDescription] = useState('');
  const [subcontractorQuotesText, setSubcontractorQuotesText] = useState(
    JSON.stringify([{ company: 'Acme Drywall', amount: 45000 }, { company: 'Builtwell', amount: 38500 }], null, 2)
  );

  // Value Engineering
  const [budgetTarget, setBudgetTarget] = useState('');
  const [currentEstimate, setCurrentEstimate] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [scope, setScope] = useState('');

  // Cash Flow
  const [scheduleText, setScheduleText] = useState('Month 1: Foundation. Month 2-3: Framing. Month 4-5: MEP. Month 6: Finish.');
  const [contractValue, setContractValue] = useState('');
  const [retainagePct, setRetainagePct] = useState(10);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Dispute
  const [disputeDescription, setDisputeDescription] = useState('');
  const [contractType, setContractType] = useState('AIA A101 Stipulated Sum');
  const [disputedAmount, setDisputedAmount] = useState('');
  const [contractClauses, setContractClauses] = useState('');
  const [changeOrderId, setChangeOrderId] = useState('');

  // Generic notes for proposed features
  const [genericNotes, setGenericNotes] = useState('');

  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        const [projRes, bidsRes, contRes, coRes] = await Promise.all([
          axios.get('/api/projects', { headers }),
          axios.get('/api/bids', { headers }),
          axios.get('/api/contractors', { headers }),
          axios.get('/api/change-orders', { headers }),
        ]);
        setProjects(projRes.data || []);
        setBids(bidsRes.data || []);
        setContractors(contRes.data || []);
        setChangeOrders(coRes.data || []);
      } catch {
        showToast('Failed to fetch context data', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFeature = aiFeatures.find(f => f.key === activeTab);

  const buildPayload = () => {
    const base = {
      project_id: projectId ? Number(projectId) : undefined,
      bid_id: bidId ? Number(bidId) : undefined,
      analysis_type: activeTab,
    };
    switch (activeTab) {
      case 'subcontractor-analysis': {
        let quotes;
        try { quotes = JSON.parse(subcontractorQuotesText); }
        catch { showToast('Invalid quotes JSON', 'error'); return null; }
        return { ...base, subcontractor_quotes: quotes, scope_description: scopeDescription || undefined };
      }
      case 'value-engineering': {
        if (!budgetTarget) { showToast('Budget target required', 'error'); return null; }
        return {
          ...base,
          budget_target: Number(budgetTarget),
          current_estimate: currentEstimate ? Number(currentEstimate) : undefined,
          project_description: projectDescription || undefined,
          scope: scope || undefined,
        };
      }
      case 'cash-flow-projection': {
        return {
          ...base,
          schedule: scheduleText,
          contract_value: contractValue ? Number(contractValue) : undefined,
          retainage_pct: retainagePct ? Number(retainagePct) : undefined,
          payment_terms: paymentTerms,
          project_description: projectDescription || undefined,
        };
      }
      case 'dispute-analyzer': {
        if (!disputeDescription) { showToast('Dispute description required', 'error'); return null; }
        return {
          ...base,
          change_order_id: changeOrderId ? Number(changeOrderId) : undefined,
          dispute_description: disputeDescription,
          contract_type: contractType,
          disputed_amount: disputedAmount ? Number(disputedAmount) : undefined,
          contract_clauses: contractClauses || undefined,
        };
      }
      // Proposed features wrap the generic notes payload
      default:
        return { ...base, notes: genericNotes || undefined };
    }
  };

  const handleAnalyze = async () => {
    const payload = buildPayload();
    if (payload === null) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await axios.post(activeFeature.endpoint, payload, { headers });
      const out = { ...res.data, type: activeTab, timestamp: new Date().toISOString(), label: activeFeature.label };
      setResult(out);
      setHistory(prev => [out, ...prev].slice(0, 20));
      showToast('Analysis complete');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'AI analysis failed.';
      const errOut = { error: true, message: msg, type: activeTab, label: activeFeature.label, timestamp: new Date().toISOString() };
      setResult(errOut);
      showToast(msg, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderResult = (data) => {
    if (!data) return null;
    if (data.error) {
      return (
        <div className="ai-result">
          <div className="ai-result-header" style={{ background: 'linear-gradient(135deg, #e63946, #d32f2f)' }}>
            <span>❌</span>
            <h3>Analysis Error</h3>
          </div>
          <div className="ai-result-body">
            <div className="ai-finding"><p>{data.message}</p></div>
          </div>
        </div>
      );
    }
    const text = data.analysis || data.result || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    return (
      <div className="ai-result">
        <div className="ai-result-header">
          <span style={{ fontSize: '1.5rem' }}>{activeFeature.icon}</span>
          <div>
            <h3>{data.label || activeFeature.label} Results</h3>
            <span className="text-sm" style={{ opacity: 0.7 }}>{new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div className="ai-result-body">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.6' }}>
            {typeof text === 'string' ? text : JSON.stringify(text, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'subcontractor-analysis':
        return (
          <>
            <div className="form-group">
              <label>Project Scope (optional)</label>
              <textarea className="form-control" rows="2" value={scopeDescription} onChange={e => setScopeDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Subcontractor Quotes (JSON array)</label>
              <textarea className="form-control" rows="6" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} value={subcontractorQuotesText} onChange={e => setSubcontractorQuotesText(e.target.value)} />
              <small className="text-muted">Each entry: {`{ "company": "...", "amount": 12345, ...optional }`}</small>
            </div>
          </>
        );
      case 'value-engineering':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Budget Target ($) *</label>
                <input type="number" className="form-control" value={budgetTarget} onChange={e => setBudgetTarget(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Current Estimate ($)</label>
                <input type="number" className="form-control" value={currentEstimate} onChange={e => setCurrentEstimate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Project Description</label>
              <textarea className="form-control" rows="2" value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Scope</label>
              <textarea className="form-control" rows="2" value={scope} onChange={e => setScope(e.target.value)} />
            </div>
          </>
        );
      case 'cash-flow-projection':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Contract Value ($)</label>
                <input type="number" className="form-control" value={contractValue} onChange={e => setContractValue(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Retainage %</label>
                <input type="number" className="form-control" value={retainagePct} onChange={e => setRetainagePct(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input className="form-control" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Project Description</label>
              <textarea className="form-control" rows="2" value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Schedule / Milestones *</label>
              <textarea className="form-control" rows="4" value={scheduleText} onChange={e => setScheduleText(e.target.value)} />
            </div>
          </>
        );
      case 'dispute-analyzer':
        return (
          <>
            <div className="form-group">
              <label>Change Order (optional)</label>
              <select className="form-control" value={changeOrderId} onChange={e => setChangeOrderId(e.target.value)}>
                <option value="">No specific change order</option>
                {changeOrders.map(co => <option key={co.id} value={co.id}>#{co.id} {co.title || co.description}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contract Type</label>
                <input className="form-control" value={contractType} onChange={e => setContractType(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Disputed Amount ($)</label>
                <input type="number" className="form-control" value={disputedAmount} onChange={e => setDisputedAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Dispute Description *</label>
              <textarea className="form-control" rows="4" value={disputeDescription} onChange={e => setDisputeDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Relevant Contract Clauses</label>
              <textarea className="form-control" rows="3" value={contractClauses} onChange={e => setContractClauses(e.target.value)} />
            </div>
          </>
        );
      default:
        return (
          <div className="form-group">
            <label>Notes / Context</label>
            <textarea className="form-control" rows="4" value={genericNotes} onChange={e => setGenericNotes(e.target.value)} placeholder="Provide context for the AI..." />
          </div>
        );
    }
  };

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '✅' : '❌'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>×</button></div></div>}

      <div className="page-header">
        <h1>🧪 AI Lab</h1>
      </div>

      <div className="ai-tabs">
        {aiFeatures.map(f => (
          <button
            key={f.key}
            className={`ai-tab ${activeTab === f.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(f.key); setResult(null); }}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div className="ai-form-card">
        <h3>{activeFeature.icon} {activeFeature.label}</h3>
        <p className="text-muted mb-3">{activeFeature.desc}</p>

        <div className="form-row">
          <div className="form-group">
            <label>Project (optional)</label>
            <select className="form-control" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">No project link</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Bid (optional)</label>
            <select className="form-control" value={bidId} onChange={e => setBidId(e.target.value)}>
              <option value="">No bid link</option>
              {bids.filter(b => !projectId || String(b.project_id) === String(projectId)).map(b => (
                <option key={b.id} value={b.id}>{b.contractor_name} - ${Number(b.bid_amount).toLocaleString()}</option>
              ))}
            </select>
          </div>
        </div>

        {renderForm()}

        <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : `${activeFeature.icon} Run ${activeFeature.label}`}
        </button>
      </div>

      {analyzing && (
        <div className="ai-loading">
          <div className="ai-spinner"></div>
          <p><strong>AI is analyzing your data</strong></p>
          <p className="text-muted">This may take a few moments...</p>
        </div>
      )}

      {result && !analyzing && renderResult(result)}

      {history.length > 0 && (
        <div className="ai-history">
          <h3>📚 Analysis History</h3>
          {history.map((item, i) => {
            const feat = aiFeatures.find(f => f.key === item.type) || {};
            return (
              <div key={i} className="ai-history-item" onClick={() => setResult(item)}>
                <div>
                  <span style={{ marginRight: '8px' }}>{feat.icon || '📊'}</span>
                  <strong>{item.label || feat.label || item.type}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: '12px' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className={`badge ${item.error ? 'badge-cancelled' : 'badge-completed'}`}>
                  {item.error ? 'Error' : 'Completed'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AILabPage;
