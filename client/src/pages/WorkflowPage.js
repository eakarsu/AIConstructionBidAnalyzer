import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const configs = {
  tasks: {
    title: 'Tasks',
    icon: '\ud83d\udccc',
    endpoint: '/api/tasks',
    searchFields: ['title', 'project_name', 'owner', 'status', 'priority', 'category'],
    columns: [
      ['title', 'Task'],
      ['project_name', 'Project'],
      ['owner', 'Owner'],
      ['due_date', 'Due Date', 'date'],
      ['priority', 'Priority', 'badge'],
      ['status', 'Status', 'badge'],
    ],
    fields: [
      ['title', 'Title', 'text', true],
      ['project_id', 'Project', 'project'],
      ['owner', 'Owner'],
      ['due_date', 'Due Date', 'date'],
      ['priority', 'Priority', 'select', false, ['low', 'medium', 'high', 'critical']],
      ['status', 'Status', 'select', false, ['open', 'in_progress', 'blocked', 'completed']],
      ['category', 'Category'],
      ['description', 'Description', 'textarea'],
    ],
    empty: { title: '', project_id: '', owner: '', due_date: '', priority: 'medium', status: 'open', category: '', description: '' },
  },
  approvals: {
    title: 'Approvals',
    icon: '\u2705',
    endpoint: '/api/approvals',
    searchFields: ['title', 'project_name', 'approval_type', 'requester', 'approver', 'status'],
    columns: [
      ['title', 'Approval'],
      ['project_name', 'Project'],
      ['approval_type', 'Type'],
      ['approver', 'Approver'],
      ['due_date', 'Due Date', 'date'],
      ['amount', 'Amount', 'money'],
      ['status', 'Status', 'badge'],
    ],
    fields: [
      ['title', 'Title', 'text', true],
      ['project_id', 'Project', 'project'],
      ['approval_type', 'Approval Type', 'select', true, ['Bid Award', 'Change Order', 'Budget Release', 'Scope Change', 'Design Change', 'GMP Approval', 'Payment Approval', 'Safety Approval']],
      ['requester', 'Requester'],
      ['approver', 'Approver'],
      ['due_date', 'Due Date', 'date'],
      ['amount', 'Amount', 'number'],
      ['status', 'Status', 'select', false, ['pending', 'approved', 'rejected', 'needs_changes']],
      ['notes', 'Notes', 'textarea'],
    ],
    empty: { title: '', project_id: '', approval_type: 'Bid Award', requester: '', approver: '', due_date: '', amount: '', status: 'pending', notes: '' },
  },
  notifications: {
    title: 'Notifications',
    icon: '\ud83d\udd14',
    endpoint: '/api/notifications',
    searchFields: ['title', 'project_name', 'message', 'severity', 'category', 'recipient'],
    columns: [
      ['title', 'Notification'],
      ['project_name', 'Project'],
      ['category', 'Category'],
      ['recipient', 'Recipient'],
      ['severity', 'Severity', 'badge'],
      ['read_at', 'Read', 'read'],
      ['created_at', 'Created', 'date'],
    ],
    fields: [
      ['title', 'Title', 'text', true],
      ['message', 'Message', 'textarea', true],
      ['project_id', 'Project', 'project'],
      ['severity', 'Severity', 'select', false, ['info', 'warning', 'critical', 'success']],
      ['category', 'Category'],
      ['recipient', 'Recipient'],
      ['read_at', 'Read At', 'datetime-local'],
    ],
    empty: { title: '', message: '', project_id: '', severity: 'info', category: '', recipient: '', read_at: '' },
  },
  audit: {
    title: 'Audit Trail',
    icon: '\ud83d\udcc8',
    endpoint: '/api/audit-logs',
    readOnly: true,
    searchFields: ['user_email', 'action', 'entity_type', 'entity_id'],
    columns: [
      ['created_at', 'Time', 'datetime'],
      ['user_email', 'User'],
      ['action', 'Action', 'badge'],
      ['entity_type', 'Area'],
      ['entity_id', 'Record'],
      ['ip_address', 'IP Address'],
    ],
  },
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'N/A';
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'N/A';
const formatMoney = (value) => value || Number(value) === 0 ? `$${Number(value).toLocaleString()}` : 'N/A';

const toInputDate = (value) => value ? String(value).split('T')[0] : '';
const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const formatCell = (row, key, type) => {
  const value = row[key];
  if (type === 'date') return formatDate(value);
  if (type === 'datetime') return formatDateTime(value);
  if (type === 'money') return formatMoney(value);
  if (type === 'read') return value ? 'Read' : 'Unread';
  if (type === 'badge') return <span className={`badge badge-${String(value || 'pending').replace(/_/g, '-')}`}>{String(value || 'N/A').replace(/_/g, ' ')}</span>;
  return value || 'N/A';
};

const formatDetailValue = (key, value) => {
  if (key.includes('date') || key.includes('created_at') || key.includes('updated_at') || key.includes('read_at')) {
    return formatDateTime(value);
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="detail-list">
        {Object.entries(value).map(([itemKey, itemValue]) => (
          <div key={itemKey}>
            <strong>{itemKey.replace(/_/g, ' ')}:</strong> {typeof itemValue === 'object' && itemValue !== null ? 'See captured request details' : String(itemValue ?? 'N/A')}
          </div>
        ))}
      </div>
    );
  }

  return String(value ?? 'N/A');
};

const WorkflowPage = ({ type }) => {
  const config = configs[type];
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(config.empty || {});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, toastType = 'success') => {
    setToast({ message, type: toastType });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get(config.endpoint);
      setItems(res.data);
    } catch (err) {
      showToast(`Failed to fetch ${config.title.toLowerCase()}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    if (!config.readOnly) {
      axios.get('/api/projects').then((res) => setProjects(res.data)).catch(() => setProjects([]));
    }
    // config is selected by route type and fetchItems intentionally runs on type changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return items;
    return items.filter((item) => config.searchFields.some((field) => String(item[field] || '').toLowerCase().includes(term)));
  }, [items, searchTerm, config.searchFields]);

  const handleCreate = () => {
    setEditItem(null);
    setFormData(config.empty);
    setShowForm(true);
  };

  const handleEdit = () => {
    const next = { ...config.empty };
    config.fields.forEach(([key, , fieldType]) => {
      next[key] = fieldType === 'date'
        ? toInputDate(selectedItem[key])
        : fieldType === 'datetime-local'
          ? toInputDateTime(selectedItem[key])
          : selectedItem[key] ?? '';
    });
    setEditItem(selectedItem);
    setFormData(next);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.project_id) payload.project_id = null;
      if (payload.read_at === '') payload.read_at = null;

      if (editItem) {
        await axios.put(`${config.endpoint}/${editItem.id}`, payload);
        showToast(`${config.title.slice(0, -1)} updated`);
      } else {
        await axios.post(config.endpoint, payload);
        showToast(`${config.title.slice(0, -1)} created`);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${config.endpoint}/${selectedItem.id}`);
      showToast(`${config.title.slice(0, -1)} deleted`);
      setShowDelete(false);
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const markRead = async () => {
    try {
      await axios.patch(`${config.endpoint}/${selectedItem.id}/read`);
      showToast('Notification marked read');
      setShowDetail(false);
      fetchItems();
    } catch {
      showToast('Failed to mark notification read', 'error');
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p className="loading-text">Loading {config.title.toLowerCase()}...</p></div>;
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
        <h1>{config.icon} {config.title}</h1>
        <div className="header-actions">
          <div className="search-box">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} />
          </div>
          {!config.readOnly && <button className="btn btn-primary" onClick={handleCreate}>{'\u2795'} Add New</button>}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={config.columns.length}><div className="table-empty"><span className="empty-icon">{config.icon}</span><p>No {config.title.toLowerCase()} found</p></div></td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                {config.columns.map(([key, , cellType]) => <td key={key}>{formatCell(item, key, cellType)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.title || selectedItem.action || config.title}</h2>
              <button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selectedItem).map(([key, value]) => (
                  <div className={key === 'description' || key === 'message' || key === 'notes' || key === 'metadata' ? 'detail-item full-width' : 'detail-item'} key={key}>
                    <div className="detail-label">{key.replace(/_/g, ' ')}</div>
                    <div className="detail-value">
                      {formatDetailValue(key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowDetail(false)}>Cancel</button>
              {type === 'notifications' && !selectedItem.read_at && <button className="btn btn-success btn-sm" onClick={markRead}>Mark Read</button>}
              {!config.readOnly && <button className="btn btn-danger btn-sm" onClick={() => { setShowDetail(false); setShowDelete(true); }}>Delete</button>}
              {!config.readOnly && <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>}
            </div>
          </div>
        </div>
      )}

      {showForm && !config.readOnly && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? `Edit ${config.title.slice(0, -1)}` : `New ${config.title.slice(0, -1)}`}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {config.fields.map(([key, label, fieldType = 'text', required, options]) => (
                  <div className="form-group" key={key}>
                    <label>{label}{required ? ' *' : ''}</label>
                    {fieldType === 'textarea' ? (
                      <textarea className="form-control" value={formData[key] || ''} required={required} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                    ) : fieldType === 'select' ? (
                      <select className="form-control" value={formData[key] || ''} required={required} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}>
                        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : fieldType === 'project' ? (
                      <select className="form-control" value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}>
                        <option value="">No project</option>
                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    ) : (
                      <input type={fieldType} className="form-control" value={formData[key] || ''} required={required} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDelete(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="confirm-dialog">
                <span className="confirm-icon">{'\u26a0\ufe0f'}</span>
                <h3>Delete this record?</h3>
                <p>This action cannot be undone.</p>
                <div className="confirm-actions">
                  <button className="btn btn-outline" onClick={() => setShowDelete(false)}>Cancel</button>
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

export default WorkflowPage;
