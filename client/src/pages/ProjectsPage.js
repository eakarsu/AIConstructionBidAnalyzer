import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProjectsPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', location: '', budget: '', status: 'planning',
    start_date: '', end_date: '', project_type: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/projects', { headers });
      setItems(res.data);
    } catch (err) {
      showToast('Failed to fetch projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ name: '', description: '', location: '', budget: '', status: 'planning', start_date: '', end_date: '', project_type: '' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      name: selectedItem.name || '',
      description: selectedItem.description || '',
      location: selectedItem.location || '',
      budget: selectedItem.budget || '',
      status: selectedItem.status || 'planning',
      start_date: selectedItem.start_date ? selectedItem.start_date.split('T')[0] : '',
      end_date: selectedItem.end_date ? selectedItem.end_date.split('T')[0] : '',
      project_type: selectedItem.project_type || ''
    });
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await axios.put(`/api/projects/${editItem.id}`, formData, { headers });
        showToast('Project updated successfully');
      } else {
        await axios.post('/api/projects', formData, { headers });
        showToast('Project created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/projects/${selectedItem.id}`, { headers });
      showToast('Project deleted successfully');
      setShowDelete(false);
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to delete project', 'error');
    }
  };

  const filtered = items.filter(item =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading projects...</p></div>;
  }

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>
            {toast.message}
            <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>{'\ud83d\udccb'} Projects</h1>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            {'\u2795'} Add New
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Type</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7"><div className="table-empty"><span className="empty-icon">{'\ud83d\udccb'}</span><p>No projects found</p></div></td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.location || 'N/A'}</td>
                  <td className="money">{formatMoney(item.budget)}</td>
                  <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                  <td>{item.project_type || 'N/A'}</td>
                  <td>{formatDate(item.start_date)}</td>
                  <td>{formatDate(item.end_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selectedItem.name}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selectedItem.location || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Budget</div><div className="detail-value money">{formatMoney(selectedItem.budget)}</div></div>
                <div className="detail-item"><div className="detail-label">Project Type</div><div className="detail-value">{selectedItem.project_type || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Start Date</div><div className="detail-value">{formatDate(selectedItem.start_date)}</div></div>
                <div className="detail-item"><div className="detail-label">End Date</div><div className="detail-value">{formatDate(selectedItem.end_date)}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{formatDate(selectedItem.created_at)}</div></div>
                <div className="detail-item full-width"><div className="detail-label">Description</div><div className="detail-value">{selectedItem.description || 'No description'}</div></div>
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
            <div className="modal-header">
              <h2>{editItem ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input className="form-control" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Budget</label>
                    <input type="number" className="form-control" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Project Type</label>
                    <input className="form-control" value={formData.project_type} onChange={e => setFormData({...formData, project_type: e.target.value})} placeholder="e.g., Commercial, Residential" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" className="form-control" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" className="form-control" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Project</button>
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
                <h3>Delete Project</h3>
                <p>Are you sure you want to delete &quot;{selectedItem.name}&quot;? This action cannot be undone.</p>
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

export default ProjectsPage;
