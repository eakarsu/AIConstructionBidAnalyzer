'use strict';

// Base unit is feet for length units. Count/area/volume units are compared on
// their own scale (factor 1) because a scope line and its bid line are expected
// to use the same dimension; a mismatch surfaces as a large variance, not a crash.
const UNIT_FACTORS = Object.freeze({
  ft: 1,
  inch: 1 / 12,
  yard: 3,
  m: 3.28084,
  ea: 1,
  sf: 1,
  lf: 1,
  cy: 1,
  ls: 1,
});

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function isExcluded(line) {
  return String(line && line.inclusion_status || '').toLowerCase() === 'excluded';
}

function normalizeQuantity(quantity, unit) {
  if (!['number', 'string'].includes(typeof quantity) || String(quantity).trim() === '') throw invalid('Quantity is required');
  const value = Number(quantity);
  if (!Number.isFinite(value) || value < 0) throw invalid('Quantity must be a non-negative number');
  if (!UNIT_FACTORS[unit]) throw invalid(`Unsupported unit: ${unit}`);
  return Number((value * UNIT_FACTORS[unit]).toFixed(4));
}

function compareScope(expected, received) {
  for (const lines of [expected, received]) {
    if (!Array.isArray(lines)) throw invalid('Scope lines must be arrays');
    const codes = new Set();
    for (const line of lines) {
      if (!line || typeof line.code !== 'string' || !line.code.trim() || codes.has(line.code)) throw invalid('Unique scope codes required');
      codes.add(line.code);
      // An excluded line may legitimately carry no quantity or unit.
      if (lines === received && isExcluded(line)) continue;
      normalizeQuantity(line.quantity, line.unit);
    }
  }
  const actual = new Map(received.map((line) => [String(line.code), line]));
  return expected.map((line) => {
    const bid = actual.get(String(line.code));
    if (!bid) return { code: line.code, status: 'missing', variance: null };
    if (isExcluded(bid)) return { code: line.code, status: 'excluded', variance: null };
    const base = normalizeQuantity(line.quantity, line.unit);
    const offered = normalizeQuantity(bid.quantity, bid.unit);
    return { code: line.code, status: 'mapped', variance: base === 0 ? (offered === 0 ? 0 : null) : Number(((offered - base) / base).toFixed(4)) };
  });
}

function canApprove(role, status, unresolvedRisks) {
  return ['estimator', 'manager', 'admin'].includes(role) && status === 'review' && ['number','string'].includes(typeof unresolvedRisks) && String(unresolvedRisks).trim() !== '' && Number(unresolvedRisks) === 0;
}

module.exports = { normalizeQuantity, compareScope, canApprove };
