'use strict';

const UNIT_FACTORS = Object.freeze({ ft: 1, inch: 1 / 12, yard: 3, m: 3.28084 });

function normalizeQuantity(quantity, unit) {
  const value = Number(quantity);
  if (!Number.isFinite(value) || value < 0) throw Object.assign(new Error('Quantity must be a non-negative number'), { statusCode: 400 });
  if (!UNIT_FACTORS[unit]) throw Object.assign(new Error(`Unsupported unit: ${unit}`), { statusCode: 400 });
  return Number((value * UNIT_FACTORS[unit]).toFixed(4));
}

function compareScope(expected, received) {
  const actual = new Map(received.map((line) => [String(line.code), line]));
  return expected.map((line) => {
    const bid = actual.get(String(line.code));
    if (!bid) return { code: line.code, status: 'missing', variance: null };
    const base = normalizeQuantity(line.quantity, line.unit);
    const offered = normalizeQuantity(bid.quantity, bid.unit);
    return { code: line.code, status: 'mapped', variance: base === 0 ? 0 : Number(((offered - base) / base).toFixed(4)) };
  });
}

function canApprove(role, status, unresolvedRisks) {
  return ['estimator', 'manager', 'admin'].includes(role) && status === 'review' && Number(unresolvedRisks) === 0;
}

module.exports = { normalizeQuantity, compareScope, canApprove };
