import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MaterialsPage = () => {
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
    name: '', category: '', unit: '', unit_price: '', supplier: '', description: '', in_stock: true
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = async () => {
    try { const res = await axios.get('/api/materials', { headers }); setItems(res.data); }
    catch { showToast('Failed to fetch materials', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ name: '', category: '', unit: '', unit_price: '', supplier: '', description: '', in_stock: true });
    setShowForm(true);
  };

  const handleEdit = () => {
    setEditItem(selectedItem);
    setFormData({
      name: selectedItem.name || '', category: selectedItem.category || '',
      unit: selectedItem.unit || '', unit_price: selectedItem.unit_price || '',
      supplier: selectedItem.supplier || '', description: selectedItem.description || '',
      in_stock: selectedItem.in_stock !== false
    });
    setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await axios.put(`/api/materials/${editItem.id}`, formData, { headers }); showToast('Material updated'); }
      else { await axios.post('/api/materials', formData, { headers }); showToast('Material created'); }
      setShowForm(false); fetchItems();
    } catch (err) { showToast(err.response?.data?.error || 'Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await axios.delete(`/api/materials/${selectedItem.id}`, { headers }); showToast('Material deleted'); setShowDelete(false); setShowDetail(false); setSelectedItem(null); fetchItems(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = items.filter(item =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A';

  if (loading) return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading materials...</p></div>;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}><span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)}>&times;</button></div></div>}
      <div className="page-header">
        <h1>{'\ud83c\udfd7\ufe0f'} Materials</h1>
        <div className="header-actions">
          <div className="search-box"><input type="text" placeholder="Search materials..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Unit</th><th>Unit Price</th><th>Supplier</th><th>In Stock</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon">{'\ud83c\udfd7\ufe0f'}</span><p>No materials found</p></div></td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                <td><strong>{item.name}</strong></td>
                <td>{item.category || 'N/A'}</td>
                <td>{item.unit || 'N/A'}</td>
                <td className="money">{formatMoney(item.unit_price)}</td>
                <td>{item.supplier || 'N/A'}</td>
                <td><span className={`badge ${item.in_stock ? 'badge-completed' : 'badge-cancelled'}`}>{item.in_stock ? 'Yes' : 'No'}</span></td>
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
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Unit</div><div className="detail-value">{selectedItem.unit || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Unit Price</div><div className="detail-value money">{formatMoney(selectedItem.unit_price)}</div></div>
                <div className="detail-item"><div className="detail-label">Supplier</div><div className="detail-value">{selectedItem.supplier || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">In Stock</div><div className="detail-value"><span className={`badge ${selectedItem.in_stock ? 'badge-completed' : 'badge-cancelled'}`}>{selectedItem.in_stock ? 'Yes' : 'No'}</span></div></div>
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
            <div className="modal-header"><h2>{editItem ? 'Edit Material' : 'New Material'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name *</label><input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Category</label><input className="form-control" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g., Concrete, Steel, Wood" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Unit</label><input className="form-control" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="e.g., sqft, ton, piece" /></div>
                  <div className="form-group"><label>Unit Price</label><input type="number" step="0.01" className="form-control" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Supplier</label><input className="form-control" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} /></div>
                  <div className="form-group"><label>In Stock</label>
                    <select className="form-control" value={formData.in_stock} onChange={e => setFormData({...formData, in_stock: e.target.value === 'true'})}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body"><div className="confirm-dialog">
              <span className="confirm-icon">{'\u26a0\ufe0f'}</span><h3>Delete Material</h3>
              <p>Are you sure you want to delete &quot;{selectedItem.name}&quot;?</p>
              <div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;
