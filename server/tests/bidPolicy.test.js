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
test('approval requires an estimator and zero open risk', () => assert.equal(canApprove('estimator', 'review', 0), true));
test('production runtime rejects missing database credentials', () => assert.throws(() => validateRuntime({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(32), DB_NAME: 'test' }), /DB_PASSWORD/));
