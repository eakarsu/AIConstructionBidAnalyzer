'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuantity, compareScope, canApprove } = require('../domain/bidPolicy');
const { validateRuntime } = require('../config/runtime');

test('quantities normalize to feet deterministically', () => assert.equal(normalizeQuantity(12, 'inch'), 1));
test('scope comparison exposes omissions and variance', () => {
  const result = compareScope([{ code: 'A', quantity: 10, unit: 'ft' }, { code: 'B', quantity: 2, unit: 'ft' }], [{ code: 'A', quantity: 11, unit: 'ft' }]);
  assert.deepEqual(result, [{ code: 'A', status: 'mapped', variance: 0.1 }, { code: 'B', status: 'missing', variance: null }]);
});
test('excluded bid lines are reported as exclusions, not omissions', () => {
  const result = compareScope([{ code: 'A', quantity: 10, unit: 'ft' }], [{ code: 'A', quantity: null, unit: null, inclusion_status: 'excluded' }]);
  assert.deepEqual(result, [{ code: 'A', status: 'excluded', variance: null }]);
});
test('common construction units normalize on their own scale', () => {
  for (const unit of ['ea', 'sf', 'lf', 'cy', 'ls']) assert.equal(normalizeQuantity(5, unit), 5);
});
test('null quantities and unsupported units yield a 4xx validation error', () => {
  assert.throws(() => normalizeQuantity(null, 'ft'), (err) => err.statusCode === 400);
  assert.throws(() => normalizeQuantity(5, 'furlong'), (err) => err.statusCode === 400);
});
test('non-excluded bid lines with missing quantity or unit fail as 4xx', () => {
  assert.throws(
    () => compareScope([{ code: 'A', quantity: 1, unit: 'ft' }], [{ code: 'A', quantity: null, unit: 'ft', inclusion_status: 'included' }]),
    (err) => err.statusCode === 400
  );
  assert.throws(
    () => compareScope([{ code: 'A', quantity: 1, unit: 'ft' }], [{ code: 'A', quantity: 1, unit: null, inclusion_status: 'unclear' }]),
    (err) => err.statusCode === 400
  );
});
test('approval requires an estimator and zero open risk', () => assert.equal(canApprove('estimator', 'review', 0), true));
test('production runtime rejects missing database credentials', () => assert.throws(() => validateRuntime({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(32), DB_NAME: 'test' }), /DB_PASSWORD/));
