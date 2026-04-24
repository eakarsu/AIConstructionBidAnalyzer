import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CompliancePage = () => {
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
    project_id: '', regulation: '', status: 'pending', description: '',
    checked_by: '', check_date: '', notes: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [ccRes, projRes] = await Promise.all([
        axios.get('/api/compliance', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(ccRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', regulation: '', status: 'pending', description: '', checked_by: '', check_date: '', notes: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '', regulation: selectedItem.regulation || '',
      status: selectedItem.status || 'pending', description: selectedItem.description || '',
      checked_by: selectedItem.checked_by || '', check_date: selectedItem.check_date ? selectedItem.check_date.split('T')[0] : '',
      notes: selectedItem.notes || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/compliance/${editItem.id}`, formData, { headers }); showToast('Compliance check updated'); }
      else { await axios.post('/api/compliance', formData, { headers }); showToast('Compliance check created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/compliance/${selectedItem.id}`, { headers }); showToast('Compliance check deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.regulation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const statusBadge = (s) => {
    const map = { compliant: 'badge-compliant', 'non-compliant': 'badge-non-compliant', 'partially-compliant': 'badge-partially-compliant', pending: 'badge-pending' };
    return map[s] || 'badge-pending';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading compliance checks...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\u2705'} Compliance Checks</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search compliance..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Regulation</th><th>Project</th><th>Status</th><th>Checked By</th><th>Check Date</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\u2705'}</span><p>No compliance checks found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.regulation}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                <td>{item.checked_by || 'N/A'}</td>
                <td>{formatDate(item.check_date)}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Compliance Check Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Regulation</div><div className="detail-value">{selectedItem.regulation}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${statusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Checked By</div><div className="detail-value">{selectedItem.checked_by || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Check Date</div><div className="detail-value">{formatDate(selectedItem.check_date)}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Description</div><div className="detail-value">{selectedItem.description || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Compliance Check' : 'New Compliance Check'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Regulation *</label><input className="form-control" value={formData.regulation} onChange={e => setFormData({...formData, regulation: e.target.value})} required placeholder="e.g., OSHA, ADA, Fire Code" /></div>
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="pending">Pending</option><option value="compliant">Compliant</option><option value="non-compliant">Non-Compliant</option><option value="partially-compliant">Partially Compliant</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Check Date</label><input type="date" className="form-control" value={formData.check_date} onChange={e => setFormData({...formData, check_date: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Checked By</label><input className="form-control" value={formData.checked_by} onChange={e => setFormData({...formData, checked_by: e.target.value})} /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Compliance Check</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Compliance Check</h3>
              <p>Are you sure you want to delete this compliance check?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompliancePage;
