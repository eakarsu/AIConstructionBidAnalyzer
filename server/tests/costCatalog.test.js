'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCatalogCsv, compareCostLines } = require('../domain/costCatalog');

test('CSV import preserves quoted descriptions and source line locators', () => {
  const rows = parseCatalogCsv(Buffer.from('code,description,unit,unit_cost\r\nA,"Cable, 12 inch",ft,4.1250\r\nB,Installation,ea,0\r\n'));
  assert.deepEqual(rows, [
    { code: 'A', description: 'Cable, 12 inch', unit: 'ft', unitCost: '4.1250', sourceLine: 2 },
    { code: 'B', description: 'Installation', unit: 'ea', unitCost: '0', sourceLine: 3 },
  ]);
});

test('CSV rejects duplicate code, unsafe price and malformed quote rather than importing partial data', () => {
  for (const body of [
    'code,description,unit,unit_cost\nA,One,ea,1\nA,Two,ea,2\n',
    'code,description,unit,unit_cost\nA,One,ea,1.12345\n',
    'code,description,unit,unit_cost\nA,"One"junk,ea,1\n',
  ]) assert.throws(() => parseCatalogCsv(Buffer.from(body)), error => error.statusCode === 400);
});

test('comparisons never compute a numeric variance for unit/currency mismatch or missing source', () => {
  const bid = [
    { scope_code: 'A', unit: 'ft', unit_price: '12.0000', inclusion_status: 'included' },
    { scope_code: 'B', unit: 'ea', unit_price: '2.0000', inclusion_status: 'included' },
  ];
  const catalog = [{ code: 'A', description: 'Cable', unit: 'ft', unit_cost: '10.0000', source_line: 2 }];
  assert.deepEqual(compareCostLines(bid, catalog, 'USD', 'USD').map(row => [row.status, row.variancePercent]),
    [['comparable', 20], ['no_catalog_match', null]]);
  assert.equal(compareCostLines(bid, catalog, 'USD', 'EUR')[0].status, 'currency_mismatch');
  assert.equal(compareCostLines(bid, [{ ...catalog[0], unit: 'ea' }], 'USD', 'USD')[0].status, 'unit_mismatch');
});
