import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimelinesPage = () => {
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
    project_id: '', phase: '', start_date: '', end_date: '',
    status: 'not_started', dependencies: '', progress_percent: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [tRes, projRes] = await Promise.all([
        axios.get('/api/timelines', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(tRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ project_id: '', phase: '', start_date: '', end_date: '', status: 'not_started', dependencies: '', progress_percent: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      project_id: selectedItem.project_id || '', phase: selectedItem.phase || '',
      start_date: selectedItem.start_date ? selectedItem.start_date.split('T')[0] : '',
      end_date: selectedItem.end_date ? selectedItem.end_date.split('T')[0] : '',
      status: selectedItem.status || 'not_started', dependencies: selectedItem.dependencies || '',
      progress_percent: selectedItem.progress_percent || ''
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/timelines/${editItem.id}`, formData, { headers }); showToast('Timeline updated'); }
      else { await axios.post('/api/timelines', formData, { headers }); showToast('Timeline created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/timelines/${selectedItem.id}`, { headers }); showToast('Timeline deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.phase || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const statusMap = {
    not_started: { label: 'Not Started', class: 'badge-draft' },
    in_progress: { label: 'In Progress', class: 'badge-in-progress' },
    completed: { label: 'Completed', class: 'badge-completed' },
    delayed: { label: 'Delayed', class: 'badge-cancelled' },
    on_hold: { label: 'On Hold', class: 'badge-on-hold' }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading timelines...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcc5'} Timelines</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search timelines..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Phase</th><th>Project</th><th>Start</th><th>End</th><th>Progress</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcc5'}</span><p>No timelines found</p></div></td></tr>
            ) : filtered.map(item => {
              const st = statusMap[item.status] || { label: item.status, class: 'badge-draft' };
              return (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                  <td><strong>{item.phase}</strong></td>
                  <td>{item.project_name || 'N/A'}</td>
                  <td>{formatDate(item.start_date)}</td>
                  <td>{formatDate(item.end_date)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.progress_percent || 0}%`, height: '100%', background: 'linear-gradient(90deg, #4361ee, #7209b7)', borderRadius: '4px' }}></div>
                      </div>
                      <span className="text-sm text-bold">{item.progress_percent || 0}%</span>
                    </div>
                  </td>
                  <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Timeline Details</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Phase</div><div className="detail-value">{selectedItem.phase}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Start Date</div><div className="detail-value">{formatDate(selectedItem.start_date)}</div></div>
                <div className="detail-item"><div className="detail-label">End Date</div><div className="detail-value">{formatDate(selectedItem.end_date)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${(statusMap[selectedItem.status] || {}).class || 'badge-draft'}`}>{(statusMap[selectedItem.status] || {}).label || selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Progress</div><div className="detail-value">{selectedItem.progress_percent || 0}%</div></div>
                <div className="detail-item full-width"><div className="detail-label">Dependencies</div><div className="detail-value">{selectedItem.dependencies || 'None'}</div></div>
              </div>
              <div className="mt-3">
                <div className="detail-label" style={{ marginBottom: '8px' }}>Progress Bar</div>
                <div style={{ height: '16px', background: '#e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedItem.progress_percent || 0}%`, height: '100%', background: 'linear-gradient(90deg, #4361ee, #7209b7)', borderRadius: '8px', transition: 'width 1s ease' }}></div>
                </div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Timeline' : 'New Timeline'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Phase *</label><input className="form-control" value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value})} required placeholder="e.g., Foundation, Framing, Finishing" /></div>
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Start Date</label><input type="date" className="form-control" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
                  <div className="form-group"><label>End Date</label><input type="date" className="form-control" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option><option value="on_hold">On Hold</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Progress (%)</label><input type="number" min="0" max="100" className="form-control" value={formData.progress_percent} onChange={e => setFormData({...formData, progress_percent: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Dependencies</label><input className="form-control" value={formData.dependencies} onChange={e => setFormData({...formData, dependencies: e.target.value})} placeholder="e.g., Foundation must be complete" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Timeline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Timeline</h3>
              <p>Are you sure you want to delete the &quot;{selectedItem.phase}&quot; timeline?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinesPage;
