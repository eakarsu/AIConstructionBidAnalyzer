import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BidComparisonsPage = () => {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '', bid_ids: '', comparison_notes: '', recommendation: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [bcRes, projRes, bidsRes] = await Promise.all([
        axios.get('/api/bid-comparisons', { headers }),
        axios.get('/api/projects', { headers }),
        axios.get('/api/bids', { headers })
      ]);
      setItems(bcRes.data); setProjects(projRes.data); setBids(bidsRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', bid_ids: '', comparison_notes: '', recommendation: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    const bidIdsStr = Array.isArray(selectedItem.bid_ids) ? selectedItem.bid_ids.join(', ') :
      (typeof selectedItem.bid_ids === 'string' ? selectedItem.bid_ids : '');
    setFormData({
      project_id: selectedItem.project_id || '', bid_ids: bidIdsStr,
      comparison_notes: selectedItem.comparison_notes || '', recommendation: selectedItem.recommendation || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      bid_ids: formData.bid_ids.split(',').map(id => id.trim()).filter(Boolean)
    };
    try {
      if (editItem) { await axios.put(`/api/bid-comparisons/${editItem.id}`, payload, { headers }); showToast('Bid comparison updated'); }
      else { await axios.post('/api/bid-comparisons', payload, { headers }); showToast('Bid comparison created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/bid-comparisons/${selectedItem.id}`, { headers }); showToast('Bid comparison deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.recommendation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const getBidInfo = (bidIds) => {
    if (!bidIds) return 'N/A';
    const ids = Array.isArray(bidIds) ? bidIds : (typeof bidIds === 'string' ? JSON.parse(bidIds || '[]') : []);
    return ids.length > 0 ? `${ids.length} bids compared` : 'N/A';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading bid comparisons...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcc8'} Bid Comparisons</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search comparisons..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Project</th><th>Bids Compared</th><th>Recommendation</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcc8'}</span><p>No bid comparisons found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>#{item.id}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td>{getBidInfo(item.bid_ids)}</td>
                <td>{(item.recommendation || 'N/A').substring(0, 60)}{(item.recommendation || '').length > 60 ? '...' : ''}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Bid Comparison #{selectedItem.id}</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">ID</div><div className="detail-value">#{selectedItem.id}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Bids Compared</div><div className="detail-value">{getBidInfo(selectedItem.bid_ids)}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Comparison Notes</div><div className="detail-value">{selectedItem.comparison_notes || 'N/A'}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Recommendation</div><div className="detail-value">{selectedItem.recommendation || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Bid Comparison' : 'New Bid Comparison'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Project *</label>
                  <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} required>
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bid IDs (comma separated)</label>
                  <input className="form-control" value={formData.bid_ids} onChange={e => setFormData({...formData, bid_ids: e.target.value})} placeholder="e.g., 1, 2, 3" />
                  {bids.length > 0 && (
                    <p className="text-sm text-muted mt-2">Available bids: {bids.map(b => `#${b.id} (${b.contractor_name})`).join(', ')}</p>
                  )}
                </div>
                <div className="form-group"><label>Comparison Notes</label><textarea className="form-control" value={formData.comparison_notes} onChange={e => setFormData({...formData, comparison_notes: e.target.value})} rows="4" /></div>
                <div className="form-group"><label>Recommendation</label><textarea className="form-control" value={formData.recommendation} onChange={e => setFormData({...formData, recommendation: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Comparison</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Bid Comparison</h3>
              <p>Are you sure you want to delete this bid comparison?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidComparisonsPage;
