import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RiskAssessmentsPage = () => {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '', risk_type: '', severity: 'medium', likelihood: 'medium',
    description: '', mitigation: '', status: 'identified'
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [raRes, projRes] = await Promise.all([
        axios.get('/api/risk-assessments', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(raRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', risk_type: '', severity: 'medium', likelihood: 'medium', description: '', mitigation: '', status: 'identified' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '', risk_type: selectedItem.risk_type || '',
      severity: selectedItem.severity || 'medium', likelihood: selectedItem.likelihood || 'medium',
      description: selectedItem.description || '', mitigation: selectedItem.mitigation || '',
      status: selectedItem.status || 'identified'
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/risk-assessments/${editItem.id}`, formData, { headers }); showToast('Risk assessment updated'); }
      else { await axios.post('/api/risk-assessments', formData, { headers }); showToast('Risk assessment created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/risk-assessments/${selectedItem.id}`, { headers }); showToast('Risk assessment deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.risk_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.severity || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const severityColor = (s) => {
    const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' };
    return map[s] || 'badge-medium';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading risk assessments...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\u26a0\ufe0f'} Risk Assessments</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Risk Type</th><th>Project</th><th>Severity</th><th>Likelihood</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\u26a0\ufe0f'}</span><p>No risk assessments found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.risk_type}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td><span className={`badge ${severityColor(item.severity)}`}>{item.severity}</span></td>
                <td><span className={`badge ${severityColor(item.likelihood)}`}>{item.likelihood}</span></td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Risk Assessment Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Risk Type</div><div className="detail-value">{selectedItem.risk_type}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value"><span className={`badge ${severityColor(selectedItem.severity)}`}>{selectedItem.severity}</span></div></div>
                <div className="detail-item"><div className="detail-label">Likelihood</div><div className="detail-value"><span className={`badge ${severityColor(selectedItem.likelihood)}`}>{selectedItem.likelihood}</span></div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Description</div><div className="detail-value">{selectedItem.description || 'N/A'}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Mitigation</div><div className="detail-value">{selectedItem.mitigation || 'N/A'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => { setShowDetail(false); setShowDelete(true); }}>{'\ud83d\uddd1\ufe0f'} Delete</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>{'\u270f\ufe0f'} Edit</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Edit Risk Assessment' : 'New Risk Assessment'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Risk Type *</label><input className="form-control" value={formData.risk_type} onChange={e => setFormData({...formData, risk_type: e.target.value})} required placeholder="e.g., Financial, Safety, Schedule" /></div>
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Severity</label>
                    <select className="form-control" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Likelihood</label>
                    <select className="form-control" value={formData.likelihood} onChange={e => setFormData({...formData, likelihood: e.target.value})}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Status</label>
                  <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="identified">Identified</option><option value="in-progress">In Progress</option><option value="mitigated">Mitigated</option><option value="accepted">Accepted</option>
                  </select>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
                <div className="form-group"><label>Mitigation Strategy</label><textarea className="form-control" value={formData.mitigation} onChange={e => setFormData({...formData, mitigation: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Risk Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Risk Assessment</h3>
              <p>Are you sure you want to delete this risk assessment?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAssessmentsPage;
