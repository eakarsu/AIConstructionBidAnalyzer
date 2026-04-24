import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ChangeOrdersPage = () => {
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
    project_id: '', title: '', description: '', amount: '', status: 'pending',
    requested_by: '', reason: '', impact_days: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [coRes, projRes] = await Promise.all([
        axios.get('/api/change-orders', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(coRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', title: '', description: '', amount: '', status: 'pending', requested_by: '', reason: '', impact_days: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '', title: selectedItem.title || '',
      description: selectedItem.description || '', amount: selectedItem.amount || '',
      status: selectedItem.status || 'pending', requested_by: selectedItem.requested_by || '',
      reason: selectedItem.reason || '', impact_days: selectedItem.impact_days || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/change-orders/${editItem.id}`, formData, { headers }); showToast('Change order updated'); }
      else { await axios.post('/api/change-orders', formData, { headers }); showToast('Change order created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/change-orders/${selectedItem.id}`, { headers }); showToast('Change order deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.requested_by || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading change orders...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcdd'} Change Orders</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search change orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Project</th><th>Amount</th><th>Status</th><th>Requested By</th><th>Impact (Days)</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcdd'}</span><p>No change orders found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.title}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td className="money">{formatMoney(item.amount)}</td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                <td>{item.requested_by || 'N/A'}</td>
                <td>{item.impact_days || 0}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selectedItem.title}</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Title</div><div className="detail-value">{selectedItem.title}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Amount</div><div className="detail-value money">{formatMoney(selectedItem.amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Requested By</div><div className="detail-value">{selectedItem.requested_by || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Impact Days</div><div className="detail-value">{selectedItem.impact_days || 0} days</div></div>
                <div className="detail-item full-width"><div className="detail-label">Reason</div><div className="detail-value">{selectedItem.reason || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Change Order' : 'New Change Order'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Title *</label><input className="form-control" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Amount</label><input type="number" step="0.01" className="form-control" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Impact (Days)</label><input type="number" className="form-control" value={formData.impact_days} onChange={e => setFormData({...formData, impact_days: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Requested By</label><input className="form-control" value={formData.requested_by} onChange={e => setFormData({...formData, requested_by: e.target.value})} /></div>
                <div className="form-group"><label>Reason</label><textarea className="form-control" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows="2" /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Change Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Change Order</h3>
              <p>Are you sure you want to delete &quot;{selectedItem.title}&quot;?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeOrdersPage;
