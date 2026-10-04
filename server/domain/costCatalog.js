'use strict';

const HEADERS = ['code', 'description', 'unit', 'unit_cost'];
const ALLOWED_UNITS = new Set(['ft', 'inch', 'yard', 'm', 'ea', 'sf', 'lf', 'cy', 'ls']);

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function records(text) {
  const result = [];
  let fields = [];
  let value = '';
  let quoted = false;
  let justClosed = false;
  let line = 1;
  let recordLine = 1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') { quoted = false; justClosed = true; }
      else { value += char; if (char === '\n') line += 1; }
    } else if (justClosed && char !== ',' && char !== '\n' && char !== '\r') {
      throw invalid(`Unexpected text after quoted field at CSV line ${line}`);
    } else if (char === '"') {
      if (value) throw invalid(`Unexpected quote at CSV line ${line}`);
      quoted = true;
    } else if (char === ',') {
      fields.push(value); value = ''; justClosed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      fields.push(value); value = ''; justClosed = false;
      if (fields.some(field => field !== '')) result.push({ fields, line: recordLine });
      fields = []; line += 1; recordLine = line;
    } else {
      value += char;
    }
  }
  if (quoted) throw invalid('CSV contains an unclosed quoted field');
  fields.push(value);
  if (fields.some(field => field !== '')) result.push({ fields, line: recordLine });
  return result;
}

function parseCatalogCsv(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 2 * 1024 * 1024) throw invalid('CSV must be 1 byte to 2 MB');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, ''); }
  catch (_) { throw invalid('CSV must be valid UTF-8'); }
  if (text.includes('\0')) throw invalid('CSV cannot contain NUL bytes');
  const parsed = records(text);
  if (parsed.length < 2 || parsed.length > 5001) throw invalid('CSV requires 1 to 5000 data rows');
  const headers = parsed[0].fields.map(value => value.trim().toLowerCase());
  if (headers.length !== HEADERS.length || !HEADERS.every((name, index) => headers[index] === name)) {
    throw invalid('CSV header must be code,description,unit,unit_cost');
  }
  const seen = new Set();
  return parsed.slice(1).map(({ fields, line }) => {
    if (fields.length !== 4) throw invalid(`CSV line ${line} must have four fields`);
    const [code, description, unit, cost] = fields.map(value => value.trim());
    if (!code || code.length > 80 || seen.has(code)) throw invalid(`CSV line ${line} has a missing or duplicate code`);
    if (!description || description.length > 500) throw invalid(`CSV line ${line} needs a description`);
    if (!ALLOWED_UNITS.has(unit)) throw invalid(`CSV line ${line} has an unsupported unit`);
    if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,4})?$/.test(cost)) throw invalid(`CSV line ${line} has an invalid unit_cost`);
    seen.add(code);
    return { code, description, unit, unitCost: cost, sourceLine: line };
  });
}

function compareCostLines(bidLines, catalogItems, bidCurrency, catalogCurrency) {
  const items = new Map(catalogItems.map(item => [item.code, item]));
  return bidLines.map(line => {
    const item = items.get(line.scope_code);
    const base = { scopeCode: line.scope_code, catalogLine: item?.source_line || null,
      catalogDescription: item?.description || null, bidUnit: line.unit, catalogUnit: item?.unit || null,
      bidUnitPrice: line.unit_price, catalogUnitCost: item?.unit_cost || null };
    if (!item) return { ...base, status: 'no_catalog_match', variancePercent: null };
    if (bidCurrency !== catalogCurrency) return { ...base, status: 'currency_mismatch', variancePercent: null };
    if (line.unit !== item.unit) return { ...base, status: 'unit_mismatch', variancePercent: null };
    if (line.inclusion_status === 'excluded' || line.unit_price == null) return { ...base, status: 'no_bid_price', variancePercent: null };
    const bid = Number(line.unit_price); const catalog = Number(item.unit_cost);
    if (!Number.isFinite(bid) || !Number.isFinite(catalog)) throw invalid('Cost comparison requires numeric unit prices');
    return { ...base, status: catalog === 0 ? 'zero_catalog_baseline' : 'comparable',
      variancePercent: catalog === 0 ? null : Number((((bid - catalog) / catalog) * 100).toFixed(2)) };
  });
}

module.exports = { parseCatalogCsv, compareCostLines };
