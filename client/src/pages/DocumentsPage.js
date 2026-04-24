import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DocumentsPage = () => {
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
    name: '', type: '', project_id: '', file_url: '', uploaded_by: '', description: '', status: 'active'
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try {
      const [docsRes, projRes] = await Promise.all([
        axios.get('/api/documents', { headers }),
        axios.get('/api/projects', { headers })
      ]);
      setItems(docsRes.data); setProjects(projRes.data);
    } catch { showToast('Failed to fetch data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ name: '', type: '', project_id: '', file_url: '', uploaded_by: '', description: '', status: 'active' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      name: selectedItem.name || '', type: selectedItem.type || '',
      project_id: selectedItem.project_id || '', file_url: selectedItem.file_url || '',
      uploaded_by: selectedItem.uploaded_by || '', description: selectedItem.description || '',
      status: selectedItem.status || 'active'
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/documents/${editItem.id}`, formData, { headers }); showToast('Document updated'); }
      else { await axios.post('/api/documents', formData, { headers }); showToast('Document created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/documents/${selectedItem.id}`, { headers }); showToast('Document deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading documents...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udcc4'} Documents</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Project</th><th>Uploaded By</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\ud83d\udcc4'}</span><p>No documents found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.name}</strong></td>
                <td>{item.type || 'N/A'}</td>
                <td>{item.project_name || 'N/A'}</td>
                <td>{item.uploaded_by || 'N/A'}</td>
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
            <div className="modal-header"><h2>{selectedItem.name}</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selectedItem.name}</div></div>
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selectedItem.type || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Project</div><div className="detail-value">{selectedItem.project_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Uploaded By</div><div className="detail-value">{selectedItem.uploaded_by || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">File URL</div><div className="detail-value">{selectedItem.file_url || 'N/A'}</div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Document' : 'New Document'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Document Name *</label><input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Type</label>
                    <select className="form-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="">Select Type</option>
                      <option value="contract">Contract</option><option value="specification">Specification</option>
                      <option value="blueprint">Blueprint</option><option value="permit">Permit</option>
                      <option value="report">Report</option><option value="invoice">Invoice</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Project</label>
                    <select className="form-control" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option><option value="archived">Archived</option><option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>File URL</label><input className="form-control" value={formData.file_url} onChange={e => setFormData({...formData, file_url: e.target.value})} /></div>
                  <div className="form-group"><label>Uploaded By</label><input className="form-control" value={formData.uploaded_by} onChange={e => setFormData({...formData, uploaded_by: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Document</h3>
              <p>Are you sure you want to delete &quot;{selectedItem.name}&quot;?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
