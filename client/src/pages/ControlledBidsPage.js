import React, { useEffect, useState } from 'react';

const endpoint = '/api/controlled-bids';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' });
async function request(path, method = 'GET', body) {
  const response = await fetch(`${endpoint}${path}`, { method, headers: auth(), body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Controlled bid request failed');
  return data;
}
async function uploadCatalog(organizationId, versionLabel, currency, file) {
  const body = new FormData();
  body.append('versionLabel', versionLabel);
  body.append('currency', currency);
  body.append('csv', file);
  const response = await fetch(`${endpoint}/organizations/${organizationId}/cost-catalog/imports`, {
    method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Cost catalog upload failed');
  return data;
}
const field = (label, value, update, type = 'text') =>
  <label style={{ display: 'block', marginBottom: 8 }}>{label}
    <input type={type} value={value} onChange={e => update(e.target.value)} style={{ display: 'block', width: '100%' }} />
  </label>;

export default function ControlledBidsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState('');
  const [packages, setPackages] = useState([]);
  const [detail, setDetail] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [catalogVersions, setCatalogVersions] = useState([]);
  const [catalogVersionId, setCatalogVersionId] = useState('');
  const [catalogDetail, setCatalogDetail] = useState(null);
  const [costComparison, setCostComparison] = useState(null);
  const [catalogLabel, setCatalogLabel] = useState('');
  const [catalogCurrency, setCatalogCurrency] = useState('USD');
  const [catalogFile, setCatalogFile] = useState(null);
  const [catalogRationale, setCatalogRationale] = useState('');
  const [packageName, setPackageName] = useState('');
  const [document, setDocument] = useState({ kind: 'plan', revision: '', storageKey: '', sha256: '' });
  const [scope, setScope] = useState({ code: '', description: '', quantity: '', unit: 'ea', sourceDocumentId: '', sourceLocator: '' });
  const [bidder, setBidder] = useState({ bidderId: '', currency: 'USD', total: '' });
  const [line, setLine] = useState({ scopeCode: '', inclusionStatus: 'included', quantity: '', unit: 'ea', unitPrice: '' });
  const [rationale, setRationale] = useState('');
  const [riskRationale, setRiskRationale] = useState('');
  const [riskStatus, setRiskStatus] = useState('mitigated');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    request('/organizations').then(rows => {
      setOrganizations(Array.isArray(rows) ? rows : []);
      if (rows[0]) setOrganizationId(String(rows[0].id));
    }).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!organizationId) return;
    request(`/organizations/${organizationId}/packages`)
      .then(rows => setPackages(Array.isArray(rows) ? rows : []))
      .catch(e => setError(e.message));
    request(`/organizations/${organizationId}/cost-catalog/versions`)
      .then(rows => setCatalogVersions(Array.isArray(rows) ? rows : []))
      .catch(e => setError(e.message));
  }, [organizationId]);
  async function loadCatalogVersions(orgId = organizationId) {
    const rows = await request(`/organizations/${orgId}/cost-catalog/versions`);
    setCatalogVersions(Array.isArray(rows) ? rows : []);
  }
  async function loadCatalogVersion(id) {
    if (!id) { setCatalogDetail(null); return; }
    setCatalogDetail(await request(`/cost-catalog/versions/${id}`));
  }
  async function downloadCatalog() {
    const response = await fetch(`${endpoint}/cost-catalog/versions/${catalogVersionId}/source`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (!response.ok) throw new Error('Catalog source download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `catalog-${catalogVersionId}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  async function loadPackage(id) {
    const data = await request(`/packages/${id}`);
    setDetail(data); setSubmission(null); setComparison([]);
    const rows = await request(`/organizations/${data.package.organization_id}/packages`);
    setPackages(rows);
  }
  async function loadSubmission(id) {
    const data = await request(`/submissions/${id}`);
    setSubmission(data);
    const compared = await request(`/submissions/${id}/scope-comparison`);
    setComparison(Array.isArray(compared.comparison) ? compared.comparison : []);
    setCostComparison(null);
  }
  async function mutate(work, success) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(success); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const packageId = detail?.package?.id;
  const submissionId = submission?.submission?.id;
  const findings = comparison.filter(item => item.status !== 'mapped' || item.variance === null || Math.abs(item.variance) > 0.1);
  return <div style={{ padding: 24 }}>
    <h1>Controlled bid packages</h1>
    <p>Register versioned plan and addendum references, map scope lines to source locations, compare bid exclusions and record estimator decisions. Cost catalogs can be imported from a source CSV and require independent approval. Plan and specification files still need an approved storage or estimating connector.</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <label>Organization <select value={organizationId} onChange={e => { setOrganizationId(e.target.value); setDetail(null); setSubmission(null); setCatalogVersionId(''); setCatalogDetail(null); setCostComparison(null); }}>
      {organizations.map(org => <option key={org.id} value={org.id}>{org.name} ({org.role})</option>)}
    </select></label>
    <h2>Versioned cost catalog</h2>
    <p>CSV columns: code, description, unit, unit_cost. The exact uploaded file and SHA-256 digest are retained. A different manager must approve a version before comparison. Enter an approved source; an imported spreadsheet alone does not authenticate market prices.</p>
    <form onSubmit={e => { e.preventDefault(); mutate(async () => {
      const imported = await uploadCatalog(organizationId, catalogLabel, catalogCurrency, catalogFile);
      setCatalogLabel(''); setCatalogFile(null); await loadCatalogVersions();
      setCatalogVersionId(String(imported.version.id)); await loadCatalogVersion(imported.version.id);
    }, 'Catalog imported as a draft.'); }}>
      {field('Catalog version label', catalogLabel, setCatalogLabel)}
      {field('Currency', catalogCurrency, setCatalogCurrency)}
      <label>Source CSV <input type="file" accept=".csv,text/csv" onChange={e => setCatalogFile(e.target.files?.[0] || null)} /></label>
      <button disabled={busy || !organizationId || !catalogLabel.trim() || !catalogFile} type="submit">Import draft catalog</button>
    </form>
    <label>Catalog version <select value={catalogVersionId} onChange={e => {
      const id = e.target.value; setCatalogVersionId(id); setCatalogDetail(null); setCostComparison(null);
      loadCatalogVersion(id).catch(error => setError(error.message));
    }}><option value="">Select a version</option>
      {catalogVersions.map(version => <option key={version.id} value={version.id}>
        {version.version_label} · {version.status} · {version.item_count} items
      </option>)}
    </select></label>
    {catalogDetail && <>
      <p>Source {catalogDetail.version.source_filename} · SHA-256 {catalogDetail.version.source_sha256} · {catalogDetail.version.currency} · {catalogDetail.version.status}</p>
      <button type="button" disabled={busy} onClick={() => mutate(downloadCatalog, 'Source CSV downloaded.')}>Download source CSV</button>
      <ul>{catalogDetail.items.slice(0, 50).map(item => <li key={item.code}>
        {item.code}: {item.description} · {item.unit_cost} per {item.unit} · source CSV line {item.source_line}
      </li>)}</ul>
      {catalogDetail.items.length > 50 && <p>Showing the first 50 of {catalogDetail.items.length} rows.</p>}
      {catalogDetail.version.status === 'draft' && <>
        {field('Independent reviewer rationale', catalogRationale, setCatalogRationale)}
        <button type="button" disabled={busy || catalogRationale.trim().length < 8} onClick={() => mutate(async () => {
          await request(`/cost-catalog/versions/${catalogVersionId}/approve`, 'POST', { rationale: catalogRationale });
          await loadCatalogVersion(catalogVersionId); await loadCatalogVersions(); setCatalogRationale('');
        }, 'Catalog version approved.')}>Approve as manager</button>
      </>}
    </>}
    <h2>Packages</h2>
    <form onSubmit={e => { e.preventDefault(); mutate(async () => {
      const row = await request(`/organizations/${organizationId}/packages`, 'POST', { name: packageName });
      setPackageName(''); await loadPackage(row.id);
    }, 'Package created.'); }}>
      {field('New package name', packageName, setPackageName)}
      <button type="submit" disabled={busy || !organizationId || !packageName.trim()}>Create package</button>
    </form>
    <ul>{packages.map(pkg => <li key={pkg.id}><button onClick={() => loadPackage(pkg.id)}>{pkg.name} · {pkg.status}</button></li>)}</ul>
    {detail && <>
      <h2>{detail.package.name}</h2>
      <h3>Versioned document references</h3>
      <ul>{detail.documents.map(doc => <li key={doc.id}>#{doc.id} {doc.kind} revision {doc.revision} · SHA-256 {doc.sha256}</li>)}</ul>
      <form onSubmit={e => { e.preventDefault(); mutate(async () => {
        await request(`/packages/${packageId}/documents`, 'POST', document);
        await loadPackage(packageId);
      }, 'Document reference recorded.'); }}>
        <select value={document.kind} onChange={e => setDocument({ ...document, kind: e.target.value })}>
          {['plan','specification','addendum','bid'].map(kind => <option key={kind}>{kind}</option>)}
        </select>
        {field('Revision', document.revision, value => setDocument({ ...document, revision: value }))}
        {field('Opaque storage key', document.storageKey, value => setDocument({ ...document, storageKey: value }))}
        {field('SHA-256 digest', document.sha256, value => setDocument({ ...document, sha256: value }))}
        <button disabled={busy} type="submit">Register document revision</button>
      </form>
      <h3>Plan and specification scope</h3>
      <ul>{detail.scopeItems.map(item => <li key={item.id}>{item.code}: {item.description} · {item.quantity} {item.unit} · document #{item.source_document_id || 'none'} {item.source_locator || ''}</li>)}</ul>
      <form onSubmit={e => { e.preventDefault(); mutate(async () => {
        await request(`/packages/${packageId}/scope-items`, 'POST', { ...scope, sourceDocumentId: scope.sourceDocumentId || null });
        await loadPackage(packageId);
      }, 'Cited scope item recorded.'); }}>
        {field('Scope code', scope.code, value => setScope({ ...scope, code: value }))}
        {field('Description', scope.description, value => setScope({ ...scope, description: value }))}
        {field('Quantity', scope.quantity, value => setScope({ ...scope, quantity: value }), 'number')}
        {field('Unit', scope.unit, value => setScope({ ...scope, unit: value }))}
        <label>Source document <select value={scope.sourceDocumentId} onChange={e => setScope({ ...scope, sourceDocumentId: e.target.value })}>
          <option value="">No source selected</option>{detail.documents.map(doc => <option key={doc.id} value={doc.id}>#{doc.id} {doc.kind} {doc.revision}</option>)}
        </select></label>
        {field('Page, sheet or specification locator', scope.sourceLocator, value => setScope({ ...scope, sourceLocator: value }))}
        <button disabled={busy} type="submit">Add scope item</button>
      </form>
      <h3>Bid submissions</h3>
      <form onSubmit={e => { e.preventDefault(); mutate(async () => {
        const row = await request(`/packages/${packageId}/submissions`, 'POST', bidder);
        await loadPackage(packageId); await loadSubmission(row.id);
      }, 'Bid submission recorded.'); }}>
        {field('Bidder ID', bidder.bidderId, value => setBidder({ ...bidder, bidderId: value }), 'number')}
        {field('Currency', bidder.currency, value => setBidder({ ...bidder, currency: value }))}
        {field('Total', bidder.total, value => setBidder({ ...bidder, total: value }), 'number')}
        <button disabled={busy} type="submit">Record bid</button>
      </form>
      <ul>{detail.submissions.map(item => <li key={item.id}><button onClick={() => loadSubmission(item.id)}>Bid #{item.id} · bidder {item.bidder_id} · {item.status}</button></li>)}</ul>
    </>}
    {submission && <>
      <h2>Bid #{submissionId} · {submission.submission.status}</h2>
      <p>Submission version {submission.submission.version}. Estimator review remains required before approval.</p>
      <form onSubmit={e => { e.preventDefault(); mutate(async () => {
        await request(`/submissions/${submissionId}/lines`, 'POST', line);
        await loadSubmission(submissionId);
      }, 'Bid line recorded.'); }}>
        {field('Scope code', line.scopeCode, value => setLine({ ...line, scopeCode: value }))}
        <label>Inclusion <select value={line.inclusionStatus} onChange={e => setLine({ ...line, inclusionStatus: e.target.value })}>
          {['included','excluded','allowance','unclear'].map(status => <option key={status}>{status}</option>)}
        </select></label>
        {field('Quantity', line.quantity, value => setLine({ ...line, quantity: value }), 'number')}
        {field('Unit', line.unit, value => setLine({ ...line, unit: value }))}
        {field('Unit price', line.unitPrice, value => setLine({ ...line, unitPrice: value }), 'number')}
        <button disabled={busy} type="submit">Add bid line</button>
      </form>
      <h3>Cited scope comparison</h3>
      <p>Heuristic review prompts come from recorded plan/spec revisions and bidder lines; they are not automated approval.</p>
      {findings.length === 0 ? <p>No missing, excluded or large variance lines found. Review all source documents before sign-off.</p> :
        <ul>{findings.map(item => <li key={item.code}>
          <strong>{item.code}: {item.status}</strong>{item.variance != null ? ` · variance ${(item.variance * 100).toFixed(1)}%` : ''}
          <br />{item.description || 'No description'} · {item.sourceKind || 'uncited'} revision {item.sourceRevision || 'unknown'} at {item.sourceLocator || 'unspecified location'}.
          <button disabled={busy} onClick={() => mutate(async () => {
            await request(`/submissions/${submissionId}/risks`, 'POST', {
              kind: 'scope_comparison', severity: 'high',
              evidence: { scopeCode: item.code, status: item.status, variance: item.variance,
                sourceDocumentId: item.sourceDocumentId, sourceRevision: item.sourceRevision, sourceLocator: item.sourceLocator },
            });
            await loadSubmission(submissionId);
          }, 'Cited risk recorded for estimator review.')}>Record risk</button>
        </li>)}</ul>}
      <h3>Cost comparison</h3>
      <p>Select an independently approved catalog version. The result shows source CSV lines and exact unit price variance; unit or currency mismatches remain unresolved for estimator review.</p>
      <button disabled={busy || !catalogVersionId || catalogDetail?.version.status !== 'approved'} onClick={() => mutate(async () => {
        const result = await request(`/submissions/${submissionId}/cost-comparison?catalogVersionId=${catalogVersionId}`);
        setCostComparison(result);
      }, 'Cost comparison loaded.')}>Compare against selected catalog</button>
      {costComparison && <>
        <p>Catalog {costComparison.catalog.version_label} · SHA-256 {costComparison.catalog.source_sha256}</p>
        <ul>{costComparison.comparison.map(item => <li key={item.scopeCode}>
          <strong>{item.scopeCode}</strong> · {item.status} · bid {item.bidUnitPrice ?? 'none'} per {item.bidUnit || 'none'} · catalog {item.catalogUnitCost ?? 'none'} per {item.catalogUnit || 'none'}
          {item.variancePercent != null ? ` · variance ${item.variancePercent}%` : ''}
          {item.catalogLine ? ` · CSV line ${item.catalogLine}` : ''}
        </li>)}</ul>
      </>}
      <h3>Estimator decisions</h3>
      <ul>{submission.risks.map(risk => <li key={risk.id}>
        {risk.kind} · {risk.severity} · {risk.status} · scope {risk.evidence?.scopeCode || 'unspecified'}
        {risk.status === 'open' && <button disabled={busy || riskRationale.trim().length < 8}
          onClick={() => mutate(async () => {
            await request(`/submissions/${submissionId}/risks/${risk.id}/resolve`, 'POST',
              { status: riskStatus, rationale: riskRationale });
            await loadSubmission(submissionId);
          }, 'Estimator risk disposition recorded.')}>Resolve this risk</button>}
      </li>)}</ul>
      {submission.risks.some(risk => risk.status === 'open') && <>
        <label>Risk disposition <select value={riskStatus} onChange={e => setRiskStatus(e.target.value)}>
          <option value="mitigated">Mitigated</option><option value="accepted">Accepted</option>
        </select></label>
        {field('Specific rationale for selected risk', riskRationale, setRiskRationale)}
      </>}
      {['received','normalized'].includes(submission.submission.status) && <button disabled={busy} onClick={() => mutate(async () => {
        await request(`/submissions/${submissionId}/review`, 'POST', { version: submission.submission.version });
        await loadSubmission(submissionId);
      }, 'Estimator review started.')}>Start review</button>}
      {submission.submission.status === 'review' && <>
        {field('Approval rationale', rationale, setRationale)}
        <button disabled={busy || !rationale.trim()} onClick={() => mutate(async () => {
          await request(`/submissions/${submissionId}/approve`, 'POST', { version: submission.submission.version, rationale });
          await loadSubmission(submissionId);
        }, 'Estimator approval recorded.')}>Approve after resolving risks</button>
      </>}
    </>}
  </div>;
}
