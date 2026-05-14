import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReportsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [downloading, setDownloading] = useState('');
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ projects: 0, bids: 0, contractors: 0, changeOrders: 0 });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, b, c, co] = await Promise.all([
          axios.get('/api/projects', { headers }),
          axios.get('/api/bids', { headers }),
          axios.get('/api/contractors', { headers }),
          axios.get('/api/change-orders', { headers }),
        ]);
        setProjects(p.data || []);
        setStats({
          projects: (p.data || []).length,
          bids: (b.data || []).length,
          contractors: (c.data || []).length,
          changeOrders: (co.data || []).length,
        });
      } catch {
        showToast('Failed to load projects', 'error');
      }
    })();
    // eslint-disable-next-line
  }, []);

  const downloadPDF = async (kind) => {
    if (!selectedProjectId) return showToast('Select a project first', 'error');
    setDownloading(kind);
    try {
      const url = `/api/export/${kind}/${selectedProjectId}`;
      const res = await axios.get(url, { headers, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${kind}-project-${selectedProjectId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('Download started');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Download failed';
      showToast(msg, 'error');
    } finally {
      setDownloading('');
    }
  };

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            {toast.message}
            <button className="toast-close" onClick={() => setToast(null)}>×</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>📋 Reports & Exports</h1>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-info"><h3>{stats.projects}</h3><p>Projects</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-info"><h3>{stats.bids}</h3><p>Bids</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">👷</div>
          <div className="stat-info"><h3>{stats.contractors}</h3><p>Contractors</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📝</div>
          <div className="stat-info"><h3>{stats.changeOrders}</h3><p>Change Orders</p></div>
        </div>
      </div>

      <div className="ai-form-card">
        <h3>📄 Project PDF Reports</h3>
        <p className="text-muted mb-3">Generate downloadable PDF reports including project information, bids, AI analysis, and cost estimate line items.</p>

        <div className="form-group">
          <label>Select Project</label>
          <select className="form-control" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="">Choose a project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} - {p.location}</option>)}
          </select>
        </div>

        <div className="form-row">
          <button
            className="btn btn-primary btn-lg"
            disabled={!selectedProjectId || downloading === 'bid-comparison'}
            onClick={() => downloadPDF('bid-comparison')}
          >
            {downloading === 'bid-comparison' ? 'Generating...' : '📊 Bid Comparison PDF'}
          </button>

          <button
            className="btn btn-success btn-lg"
            disabled={!selectedProjectId || downloading === 'cost-estimate'}
            onClick={() => downloadPDF('cost-estimate')}
          >
            {downloading === 'cost-estimate' ? 'Generating...' : '💰 Cost Estimate PDF'}
          </button>
        </div>
      </div>

      <div className="ai-form-card">
        <h3>🛈 Report Contents</h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: 2 }}>
          <li><strong>Bid Comparison PDF:</strong> Project summary, all received bids ranked by amount, lowest/highest/average analysis, AI bid comparison results.</li>
          <li><strong>Cost Estimate PDF:</strong> Project info, line items grouped by category, subtotals and grand total, budget variance, AI cost analysis.</li>
        </ul>
        <p className="text-muted text-sm">
          Note: PDF generation requires <code>pdfkit</code> on the backend. If you see a 503 error, run <code>npm install pdfkit</code> in the server directory.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
