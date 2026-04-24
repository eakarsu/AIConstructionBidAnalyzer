import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CostEstimatesPage = () => {
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
    project_id: '', category: '', description: '', estimated_amount: '', actual_amount: '', variance: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [ceRes, projRes] = await Promise.all([
        axios.get('/api/cost-estimates', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(ceRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', category: '', description: '', estimated_amount: '', actual_amount: '', variance: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '', category: selectedItem.category || '',
      description: selectedItem.description || '', estimated_amount: selectedItem.estimated_amount || '',
      actual_amount: selectedItem.actual_amount || '', variance: selectedItem.variance || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/cost-estimates/${editItem.id}`, formData, { headers }); showToast('Cost estimate updated'); }
      else { await axios.post('/api/cost-estimates', formData, { headers }); showToast('Cost estimate created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/cost-estimates/${selectedItem.id}`, { headers }); showToast('Cost estimate deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const varianceClass = (v) => {
    const val = Number(v);
    if (val > 0) return 'text-danger';
    if (val < 0) return 'text-success';
    return '';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading cost estimates...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcb5'} Cost Estimates</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search estimates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Category</th><th>Project</th><th>Estimated</th><th>Actual</th><th>Variance</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcb5'}</span><p>No cost estimates found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.category}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td className="money">{formatMoney(item.estimated_amount)}</td>
                <td className="money">{formatMoney(item.actual_amount)}</td>
                <td className={`money ${varianceClass(item.variance)}`}>{item.variance ? `${Number(item.variance) > 0 ? '+' : ''}$${Number(item.variance).toLocaleString()}` : '$0'}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Cost Estimate Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Estimated Amount</div><div className="detail-value money">{formatMoney(selectedItem.estimated_amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Actual Amount</div><div className="detail-value money">{formatMoney(selectedItem.actual_amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Variance</div><div className={`detail-value money ${varianceClass(selectedItem.variance)}`}>{selectedItem.variance ? `${Number(selectedItem.variance) > 0 ? '+' : ''}$${Number(selectedItem.variance).toLocaleString()}` : '$0'}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Description</div><div className="detail-value">{selectedItem.description || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Cost Estimate' : 'New Cost Estimate'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Category *</label><input className="form-control" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required placeholder="e.g., Materials, Labor, Equipment" /></div>
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Estimated Amount *</label><input type="number" step="0.01" className="form-control" value={formData.estimated_amount} onChange={e => setFormData({...formData, estimated_amount: e.target.value})} required /></div>
                  <div className="form-group"><label>Actual Amount</label><input type="number" step="0.01" className="form-control" value={formData.actual_amount} onChange={e => setFormData({...formData, actual_amount: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Variance</label><input type="number" step="0.01" className="form-control" value={formData.variance} onChange={e => setFormData({...formData, variance: e.target.value})} /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Cost Estimate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Cost Estimate</h3>
              <p>Are you sure you want to delete this cost estimate?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostEstimatesPage;
