import React, { useState, useEffect } from 'react';
import axios from 'axios';

const aiFeatures = [
  { key: 'bid-analysis', label: 'Bid Analysis', icon: '\ud83d\udcca', endpoint: '/api/ai/analyze-bid', desc: 'Deep analysis of bid proposals' },
  { key: 'cost-estimation', label: 'Cost Estimation', icon: '\ud83d\udcb0', endpoint: '/api/ai/estimate-cost', desc: 'AI-powered cost projections' },
  { key: 'risk-assessment', label: 'Risk Assessment', icon: '\u26a0\ufe0f', endpoint: '/api/ai/assess-risk', desc: 'Identify and evaluate project risks' },
  { key: 'compliance-check', label: 'Compliance Check', icon: '\u2705', endpoint: '/api/ai/check-compliance', desc: 'Automated regulatory compliance' },
  { key: 'scope-analysis', label: 'Scope Analysis', icon: '\ud83d\udd0d', endpoint: '/api/ai/analyze-scope', desc: 'Scope completeness evaluation' },
  { key: 'timeline-estimation', label: 'Timeline Estimation', icon: '\ud83d\udcc5', endpoint: '/api/ai/estimate-timeline', desc: 'Project duration predictions' },
  { key: 'bid-comparison', label: 'Bid Comparison', icon: '\ud83d\udcc8', endpoint: '/api/ai/compare-bids', desc: 'Compare multiple bids intelligently' },
  { key: 'material-optimization', label: 'Material Optimization', icon: '\ud83c\udfd7\ufe0f', endpoint: '/api/ai/optimize-materials', desc: 'Optimize material costs and usage' },
];

const AIAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState('bid-analysis');
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBidId, setSelectedBidId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, bidsRes] = await Promise.all([
          axios.get('/api/projects', { headers }),
          axios.get('/api/bids', { headers })
        ]);
        setProjects(projRes.data);
        setBids(bidsRes.data);
      } catch {
        showToast('Failed to fetch data', 'error');
      }
    };
    fetchData();
  }, []);

  const activeFeature = aiFeatures.find(f => f.key === activeTab);

  const handleAnalyze = async () => {
    if (!selectedProjectId && !selectedBidId) {
      showToast('Please select a project or bid to analyze', 'error');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const payload = {
        project_id: selectedProjectId || undefined,
        bid_id: selectedBidId || undefined,
        notes: additionalNotes || undefined,
        analysis_type: activeTab
      };

      const res = await axios.post(activeFeature.endpoint, payload, { headers });
      const analysisResult = {
        ...res.data,
        type: activeTab,
        timestamp: new Date().toISOString(),
        label: activeFeature.label
      };
      setResult(analysisResult);
      setHistory(prev => [analysisResult, ...prev].slice(0, 20));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'AI analysis failed. Please ensure the AI service is configured.';
      setResult({
        error: true,
        message: errorMsg,
        type: activeTab,
        label: activeFeature.label,
        timestamp: new Date().toISOString()
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const parseAndRenderResult = (data) => {
    if (!data) return null;
    if (data.error) {
      return (
        <div className="ai-result">
          <div className="ai-result-header" style={{ background: 'linear-gradient(135deg, #e63946, #d32f2f)' }}>
            <span>{'\u274c'}</span>
            <h3>Analysis Error</h3>
          </div>
          <div className="ai-result-body">
            <div className="ai-finding">
              <p>{data.message}</p>
            </div>
            <p className="text-muted text-sm mt-2">Make sure the AI service is properly configured with an API key.</p>
          </div>
        </div>
      );
    }

    const analysis = data.analysis || data.result || data;
    const analysisText = typeof analysis === 'string' ? analysis : (analysis.text || analysis.content || analysis.summary || JSON.stringify(analysis, null, 2));

    const sections = parseAnalysisText(analysisText);
    const overallScore = data.score || data.overall_score || analysis.score || null;
    const riskLevel = data.risk_level || data.risk || analysis.risk_level || null;
    const recommendations = data.recommendations || analysis.recommendations || [];
    const keyFindings = data.key_findings || data.findings || analysis.findings || [];

    return (
      <div className="ai-result">
        <div className="ai-result-header">
          <span style={{ fontSize: '1.5rem' }}>{activeFeature.icon}</span>
          <div>
            <h3>{data.label || activeFeature.label} Results</h3>
            <span className="text-sm" style={{ opacity: 0.7 }}>
              {new Date(data.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="ai-result-body">
          {overallScore !== null && (
            <div className="ai-section">
              <div className="ai-section-title">{'\ud83c\udfaf'} Overall Score</div>
              <div className="ai-score">
                <div className="ai-score-label">Score</div>
                <div className="ai-score-bar">
                  <div
                    className={`ai-score-fill ${Number(overallScore) >= 70 ? 'high' : Number(overallScore) >= 40 ? 'medium' : 'low'}`}
                    style={{ width: `${Math.min(Number(overallScore), 100)}%` }}
                  ></div>
                </div>
                <div className="ai-score-value">{overallScore}/100</div>
              </div>
            </div>
          )}

          {riskLevel && (
            <div className="ai-section">
              <div className="ai-section-title">{'\u26a0\ufe0f'} Risk Level</div>
              <span className={`ai-risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span>
            </div>
          )}

          {Array.isArray(keyFindings) && keyFindings.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">{'\ud83d\udca1'} Key Findings</div>
              {keyFindings.map((finding, i) => (
                <div key={i} className="ai-finding">
                  <p><strong>{typeof finding === 'object' ? finding.title || finding.finding : ''}</strong></p>
                  <p>{typeof finding === 'object' ? finding.description || finding.detail : finding}</p>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(recommendations) && recommendations.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">{'\u2705'} Recommendations</div>
              {recommendations.map((rec, i) => (
                <div key={i} className="ai-recommendation">
                  <span className="rec-icon">{'\u27a1\ufe0f'}</span>
                  <p>{typeof rec === 'object' ? rec.text || rec.recommendation || rec.description : rec}</p>
                </div>
              ))}
            </div>
          )}

          {sections.map((section, i) => (
            <div key={i} className="ai-section">
              {section.title && (
                <div className="ai-section-title">
                  {getSectionIcon(section.title)} {section.title}
                </div>
              )}
              {section.items.map((item, j) => {
                if (item.type === 'kv') {
                  return (
                    <div key={j} className="ai-key-value">
                      <span className="ai-key">{item.key}</span>
                      <span className="ai-value">{item.value}</span>
                    </div>
                  );
                }
                if (item.type === 'bullet') {
                  return (
                    <div key={j} className="ai-recommendation">
                      <span className="rec-icon">{'\u2022'}</span>
                      <p dangerouslySetInnerHTML={{ __html: highlightText(item.text) }} />
                    </div>
                  );
                }
                return (
                  <div key={j} className="ai-finding">
                    <p dangerouslySetInnerHTML={{ __html: highlightText(item.text) }} />
                  </div>
                );
              })}
            </div>
          ))}

          {typeof analysis === 'object' && !analysis.text && !analysis.content && !analysis.summary && !Array.isArray(keyFindings) && !Array.isArray(recommendations) && (
            <div className="ai-section">
              <div className="ai-section-title">{'\ud83d\udcca'} Detailed Analysis</div>
              {Object.entries(analysis).filter(([k]) => !['score', 'risk_level', 'findings', 'recommendations', 'key_findings', 'risk'].includes(k)).map(([key, value], i) => (
                <div key={i} className="ai-key-value">
                  <span className="ai-key">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="ai-value">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const parseAnalysisText = (text) => {
    if (typeof text !== 'string') return [];
    const sections = [];
    let currentSection = { title: '', items: [] };

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('##') || trimmed.startsWith('**') && trimmed.endsWith('**')) {
        if (currentSection.items.length > 0 || currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, ''),
          items: []
        };
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
        currentSection.items.push({
          type: 'bullet',
          text: trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
        });
      } else if (trimmed.includes(':') && trimmed.indexOf(':') < 30 && !trimmed.startsWith('http')) {
        const colonIdx = trimmed.indexOf(':');
        currentSection.items.push({
          type: 'kv',
          key: trimmed.substring(0, colonIdx).replace(/\*\*/g, ''),
          value: trimmed.substring(colonIdx + 1).trim().replace(/\*\*/g, '')
        });
      } else {
        currentSection.items.push({
          type: 'text',
          text: trimmed
        });
      }
    }

    if (currentSection.items.length > 0 || currentSection.title) {
      sections.push(currentSection);
    }

    return sections;
  };

  const highlightText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\$([\d,.]+)/g, '<span class="money" style="color:#4361ee;font-weight:700">$$$1</span>')
      .replace(/(\d+\.?\d*%)/g, '<span style="color:#7209b7;font-weight:700">$1</span>');
  };

  const getSectionIcon = (title) => {
    const lower = (title || '').toLowerCase();
    if (lower.includes('cost') || lower.includes('budget') || lower.includes('price')) return '\ud83d\udcb0';
    if (lower.includes('risk')) return '\u26a0\ufe0f';
    if (lower.includes('recommend')) return '\u2705';
    if (lower.includes('timeline') || lower.includes('schedule')) return '\ud83d\udcc5';
    if (lower.includes('compliance') || lower.includes('regulation')) return '\ud83d\udccb';
    if (lower.includes('material')) return '\ud83c\udfd7\ufe0f';
    if (lower.includes('scope')) return '\ud83d\udd0d';
    if (lower.includes('summary') || lower.includes('overview')) return '\ud83d\udcca';
    if (lower.includes('finding')) return '\ud83d\udca1';
    if (lower.includes('strength')) return '\ud83d\udcaa';
    if (lower.includes('weakness') || lower.includes('concern')) return '\ud83d\udea9';
    return '\ud83d\udccc';
  };

  const needsBid = ['bid-analysis', 'bid-comparison'].includes(activeTab);

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}

      <div className="page-header">
        <h1>{'\ud83e\udd16'} AI Analysis</h1>
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
            <label>Select Project</label>
            <select className="form-control" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
              <option value="">Choose a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {needsBid && (
            <div className="form-group">
              <label>Select Bid</label>
              <select className="form-control" value={selectedBidId} onChange={e => setSelectedBidId(e.target.value)}>
                <option value="">Choose a bid...</option>
                {bids.filter(b => !selectedProjectId || String(b.project_id) === String(selectedProjectId)).map(b => (
                  <option key={b.id} value={b.id}>{b.contractor_name} - ${Number(b.bid_amount).toLocaleString()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Additional Notes / Context</label>
          <textarea
            className="form-control"
            value={additionalNotes}
            onChange={e => setAdditionalNotes(e.target.value)}
            rows="3"
            placeholder="Provide any additional context for the AI analysis..."
          />
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? '' : activeFeature.icon} {analyzing ? 'Analyzing...' : `Run ${activeFeature.label}`}
        </button>
      </div>

      {analyzing && (
        <div className="ai-loading">
          <div className="ai-spinner"></div>
          <p><strong>AI is analyzing your data</strong></p>
          <p className="text-muted">This may take a few moments<span className="loading-dots"></span></p>
        </div>
      )}

      {result && !analyzing && parseAndRenderResult(result)}

      {history.length > 0 && (
        <div className="ai-history">
          <h3>{'\ud83d\udcda'} Analysis History</h3>
          {history.map((item, i) => {
            const feature = aiFeatures.find(f => f.key === item.type) || {};
            return (
              <div key={i} className="ai-history-item" onClick={() => setResult(item)}>
                <div>
                  <span style={{ marginRight: '8px' }}>{feature.icon || '\ud83d\udcca'}</span>
                  <strong>{item.label || feature.label || item.type}</strong>
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

export default AIAnalysisPage;
