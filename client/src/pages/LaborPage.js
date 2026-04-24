import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LaborPage = () => {
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
    role: '', hourly_rate: '', overtime_rate: '', project_id: '', estimated_hours: '', actual_hours: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [laborRes, projRes] = await Promise.all([
        axios.get('/api/labor', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(laborRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ role: '', hourly_rate: '', overtime_rate: '', project_id: '', estimated_hours: '', actual_hours: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      role: selectedItem.role || '', hourly_rate: selectedItem.hourly_rate || '',
      overtime_rate: selectedItem.overtime_rate || '', project_id: selectedItem.project_id || '',
      estimated_hours: selectedItem.estimated_hours || '', actual_hours: selectedItem.actual_hours || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/labor/${editItem.id}`, formData, { headers }); showToast('Labor cost updated'); }
      else { await axios.post('/api/labor', formData, { headers }); showToast('Labor cost created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/labor/${selectedItem.id}`, { headers }); showToast('Labor cost deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading labor costs...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcbc'} Labor Costs</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search labor costs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Role</th><th>Project</th><th>Hourly Rate</th><th>Overtime Rate</th><th>Est. Hours</th><th>Actual Hours</th><th>Est. Cost</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcbc'}</span><p>No labor costs found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.role}</strong></td>
                <td>{item.project_name || 'N/A'}</td>
                <td className="money">{formatMoney(item.hourly_rate)}/hr</td>
                <td className="money">{formatMoney(item.overtime_rate)}/hr</td>
                <td>{item.estimated_hours || 0}</td>
                <td>{item.actual_hours || 0}</td>
                <td className="money">{formatMoney((item.hourly_rate || 0) * (item.estimated_hours || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Labor Cost Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Role</div><div className="detail-value">{selectedItem.role}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Hourly Rate</div><div className="detail-value money">{formatMoney(selectedItem.hourly_rate)}/hr</div></div>
                <div className="detail-item"><div className="detail-label">Overtime Rate</div><div className="detail-value money">{formatMoney(selectedItem.overtime_rate)}/hr</div></div>
                <div className="detail-item"><div className="detail-label">Estimated Hours</div><div className="detail-value">{selectedItem.estimated_hours || 0}</div></div>
                <div className="detail-item"><div className="detail-label">Actual Hours</div><div className="detail-value">{selectedItem.actual_hours || 0}</div></div>
                <div className="detail-item"><div className="detail-label">Estimated Cost</div><div className="detail-value money">{formatMoney((selectedItem.hourly_rate || 0) * (selectedItem.estimated_hours || 0))}</div></div>
                <div className="detail-item"><div className="detail-label">Actual Cost</div><div className="detail-value money">{formatMoney((selectedItem.hourly_rate || 0) * (selectedItem.actual_hours || 0))}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Labor Cost' : 'New Labor Cost'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Role *</label><input className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} required placeholder="e.g., Electrician, Plumber" /></div>
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Hourly Rate *</label><input type="number" step="0.01" className="form-control" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: e.target.value})} required /></div>
                  <div className="form-group"><label>Overtime Rate</label><input type="number" step="0.01" className="form-control" value={formData.overtime_rate} onChange={e => setFormData({...formData, overtime_rate: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Estimated Hours</label><input type="number" className="form-control" value={formData.estimated_hours} onChange={e => setFormData({...formData, estimated_hours: e.target.value})} /></div>
                  <div className="form-group"><label>Actual Hours</label><input type="number" className="form-control" value={formData.actual_hours} onChange={e => setFormData({...formData, actual_hours: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Labor Cost</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Labor Cost</h3>
              <p>Are you sure you want to delete the &quot;{selectedItem.role}&quot; labor cost?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaborPage;
