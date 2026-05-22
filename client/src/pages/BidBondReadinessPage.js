import React, { useEffect, useState } from 'react';
import axios from 'axios';

const emptyDraft = {
  project_name: '',
  bond_type: 'Bid bond',
  surety: '',
  bond_amount: 0,
  readiness_score: 0,
  missing_items: '',
  status: 'review',
};

export default function BidBondReadinessPage() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const load = async () => {
    try {
      const res = await axios.get('/api/bid-bond-readiness', { headers });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load bid bond readiness records');
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async (e) => {
    e.preventDefault();
    await axios.post('/api/bid-bond-readiness', draft, { headers });
    setDraft(emptyDraft);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Bid Bond Readiness</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" style={{ padding: 20, marginBottom: 20 }} onSubmit={save}>
        <div className="form-grid">
          {[
            ['project_name', 'Project'],
            ['bond_type', 'Bond Type'],
            ['surety', 'Surety'],
            ['missing_items', 'Missing Items'],
            ['status', 'Status'],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input value={draft[key]} onChange={(e) => setField(key, e.target.value)} />
            </div>
          ))}
          <div className="form-group">
            <label>Bond Amount</label>
            <input type="number" value={draft.bond_amount} onChange={(e) => setField('bond_amount', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Readiness Score</label>
            <input type="number" value={draft.readiness_score} onChange={(e) => setField('readiness_score', Number(e.target.value))} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Add Review</button>
      </form>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Project</th><th>Bond</th><th>Surety</th><th>Amount</th><th>Score</th><th>Status</th><th>Missing</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.project_name}</td>
                <td>{row.bond_type}</td>
                <td>{row.surety}</td>
                <td>${Number(row.bond_amount || 0).toLocaleString()}</td>
                <td>{row.readiness_score}%</td>
                <td><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                <td>{row.missing_items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
