import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SubcontractorsPage = () => {
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
    company_name: '', specialty: '', contact_name: '', email: '', phone: '',
    rating: '', hourly_rate: '', availability: 'available'
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try { const res = await axios.get('/api/subcontractors', { headers }); setItems(res.data); }
    catch { showToast('Failed to fetch subcontractors', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ company_name: '', specialty: '', contact_name: '', email: '', phone: '', rating: '', hourly_rate: '', availability: 'available' });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      company_name: selectedItem.company_name || '', specialty: selectedItem.specialty || '',
      contact_name: selectedItem.contact_name || '', email: selectedItem.email || '',
      phone: selectedItem.phone || '', rating: selectedItem.rating || '',
      hourly_rate: selectedItem.hourly_rate || '', availability: selectedItem.availability || 'available'
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/subcontractors/${editItem.id}`, formData, { headers }); showToast('Subcontractor updated'); }
      else { await axios.post('/api/subcontractors', formData, { headers }); showToast('Subcontractor created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/subcontractors/${selectedItem.id}`, { headers }); showToast('Subcontractor deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';
  const renderStars = (r) => { const rating = Number(r) || 0; return '\u2b50'.repeat(Math.min(Math.round(rating), 5)); };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading subcontractors...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83d\udd28'} Subcontractors</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search subcontractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Company</th><th>Specialty</th><th>Contact</th><th>Hourly Rate</th><th>Rating</th><th>Availability</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\ud83d\udd28'}</span><p>No subcontractors found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.company_name}</strong></td>
                <td>{item.specialty || 'N/A'}</td>
                <td>{item.contact_name || 'N/A'}</td>
                <td className="money">{formatMoney(item.hourly_rate)}/hr</td>
                <td>{renderStars(item.rating)}</td>
                <td><span className={`badge badge-${item.availability === 'available' ? 'completed' : item.availability === 'busy' ? 'active' : 'cancelled'}`}>{item.availability}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selectedItem.company_name}</h2><button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Company</div><div className="detail-value">{selectedItem.company_name}</div></div>
                <div className="detail-item"><div className="detail-label">Specialty</div><div className="detail-value">{selectedItem.specialty || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Contact</div><div className="detail-value">{selectedItem.contact_name || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selectedItem.email || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selectedItem.phone || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Hourly Rate</div><div className="detail-value money">{formatMoney(selectedItem.hourly_rate)}/hr</div></div>
                <div className="detail-item"><div className="detail-label">Rating</div><div className="detail-value">{renderStars(selectedItem.rating)} ({selectedItem.rating || 0}/5)</div></div>
                <div className="detail-item"><div className="detail-label">Availability</div><div className="detail-value"><span className={`badge badge-${selectedItem.availability === 'available' ? 'completed' : 'active'}`}>{selectedItem.availability}</span></div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Subcontractor' : 'New Subcontractor'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Company Name *</label><input className="form-control" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} required /></div>
                  <div className="form-group"><label>Specialty</label><input className="form-control" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="e.g., HVAC, Electrical" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Contact Name</label><input className="form-control" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} /></div>
                  <div className="form-group"><label>Email</label><input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Phone</label><input className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  <div className="form-group"><label>Hourly Rate</label><input type="number" step="0.01" className="form-control" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Rating (1-5)</label><input type="number" min="1" max="5" step="0.1" className="form-control" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} /></div>
                  <div className="form-group"><label>Availability</label>
                    <select className="form-control" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})}>
                      <option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Subcontractor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Subcontractor</h3>
              <p>Are you sure you want to delete &quot;{selectedItem.company_name}&quot;?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubcontractorsPage;
