const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

let rows = [
  {
    id: 1,
    project_name: 'North Terminal Expansion',
    bond_type: 'Bid bond',
    surety: 'Atlantic Surety',
    bond_amount: 1250000,
    readiness_score: 91,
    missing_items: 'Updated financial statement',
    status: 'conditional',
  },
  {
    id: 2,
    project_name: 'County Pump Station Retrofit',
    bond_type: 'Performance bond',
    surety: 'BuilderSure',
    bond_amount: 680000,
    readiness_score: 98,
    missing_items: 'None',
    status: 'ready',
  },
];

const nextId = () => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

router.use(auth);
router.get('/', (req, res) => res.json(rows));
router.post('/', (req, res) => {
  const row = { id: nextId(), ...req.body };
  rows.unshift(row);
  res.status(201).json(row);
});
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = rows.findIndex((row) => row.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Bid bond readiness record not found.' });
  rows[idx] = { ...rows[idx], ...req.body, id };
  res.json(rows[idx]);
});
router.delete('/:id', (req, res) => {
  rows = rows.filter((row) => row.id !== Number(req.params.id));
  res.json({ message: 'deleted' });
});

module.exports = router;
