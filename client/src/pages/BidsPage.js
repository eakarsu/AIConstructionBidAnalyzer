import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BidsPage = () => {
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
    project_id: '', bid_amount: '', contractor_name: '', status: 'submitted',
    submission_date: '', scope: '', notes: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [bidsRes, projRes] = await Promise.all([
        axios.get('/api/bids', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(bidsRes.data);
      setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', bid_amount: '', contractor_name: '', status: 'submitted', submission_date: '', scope: '', notes: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '',
      bid_amount: selectedItem.bid_amount || '',
      contractor_name: selectedItem.contractor_name || '',
      status: selectedItem.status || 'submitted',
      submission_date: selectedItem.submission_date ? selectedItem.submission_date.split('T')[0] : '',
      scope: selectedItem.scope || '',
      notes: selectedItem.notes || ''
    });
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await axios.put(`/api/bids/${editItem.id}`, formData, { headers });
        showToast('Bid updated successfully');
      } else {
        await axios.post('/api/bids', formData, { headers });
        showToast('Bid created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/bids/${selectedItem.id}`, { headers });
      showToast('Bid deleted successfully');
      setShowDelete(false); setShowDetail(false); setSelectedItem(null);
      fetchItems();
    } catch { showToast('Failed to delete bid', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.contractor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading bids...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcb0'} Bids</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search bids..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Contractor</th><th>Project</th><th>Bid Amount</th><th>Status</th><th>Submission Date</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcb0'}</span><p>No bids found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.contractor_name}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td className="money">{formatMoney(item.bid_amount)}</td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                <td>{formatDate(item.submission_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Bid Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Contractor</div><div className="detail-value">{selectedItem.contractor_name}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Bid Amount</div><div className="detail-value money">{formatMoney(selectedItem.bid_amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Submission Date</div><div className="detail-value">{formatDate(selectedItem.submission_date)}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Scope</div><div className="detail-value">{selectedItem.scope || 'N/A'}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Notes</div><div className="detail-value">{selectedItem.notes || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Bid' : 'New Bid'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Project *</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} required>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contractor Name *</label>
                    <input className="form-control" value={formData.contractor_name} onChange={e => setFormData({...formData, contractor_name: e.target.value})} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bid Amount *</label>
                    <input type="number" className="form-control" value={formData.bid_amount} onChange={e => setFormData({...formData, bid_amount: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="submitted">Submitted</option>
                      <option value="review">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Submission Date</label>
                  <input type="date" className="form-control" value={formData.submission_date} onChange={e => setFormData({...formData, submission_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Scope</label>
                  <textarea className="form-control" value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})} rows="3" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-control" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Bid</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-dialog">
                <span className="confirm-icon">{'\u26a0\ufe0f'}</span>
                <h3>Delete Bid</h3>
                <p>Are you sure you want to delete this bid from &quot;{selectedItem.contractor_name}&quot;? This action cannot be undone.</p>
                <div className="confirm-actions">
                  <button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidsPage;
