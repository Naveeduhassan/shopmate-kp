const router              = require('express').Router();
const { query, queryOne, run, transaction } = require('../database');

function getBalance(customer_id) {
  const rows = query(
    `SELECT type, SUM(amount) as total FROM udhaar WHERE customer_id = ? GROUP BY type`,
    [customer_id]
  );
  let debit = 0, paid = 0;
  rows.forEach(r => { if (r.type === 'debit') debit = r.total; else paid = r.total; });
  return { total_debit: debit, total_paid: paid, balance: debit - paid };
}

router.get('/', (req, res) => {
  const customers = query('SELECT * FROM customers ORDER BY name ASC');
  res.json(customers.map(c => ({ ...c, ...getBalance(c.id) })));
});

router.get('/:id', (req, res) => {
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const transactions = query('SELECT * FROM udhaar WHERE customer_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...customer, ...getBalance(req.params.id), transactions });
});

router.post('/', (req, res) => {
  const { name, phone, credit_limit } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Customer name is required' });

  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Phone number must be a valid Pakistani mobile format (e.g., 03001234567)' });
  }

  const limitVal = credit_limit !== undefined ? Number(credit_limit) : 15000;
  if (isNaN(limitVal) || limitVal <= 0) {
    return res.status(400).json({ error: 'Credit limit must be a positive number' });
  }

  const existing = queryOne('SELECT id FROM customers WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);
  if (existing) {
    return res.status(400).json({ error: 'A customer with this name already exists' });
  }

  const { lastInsertRowid } = run('INSERT INTO customers (name, phone, credit_limit) VALUES (?,?,?)', [name.trim(), phone?.trim() || '', limitVal]);
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [lastInsertRowid]);
  res.status(201).json({ ...customer, balance: 0, total_debit: 0, total_paid: 0 });
});

router.put('/:id', (req, res) => {
  const { name, phone, credit_limit } = req.body;
  if (!queryOne('SELECT id FROM customers WHERE id = ?', [req.params.id]))
    return res.status(404).json({ error: 'Customer not found' });
  if (!name?.trim()) return res.status(400).json({ error: 'Customer name is required' });

  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Phone number must be a valid Pakistani mobile format (e.g., 03001234567)' });
  }

  const limitVal = credit_limit !== undefined ? Number(credit_limit) : 15000;
  if (isNaN(limitVal) || limitVal <= 0) {
    return res.status(400).json({ error: 'Credit limit must be a positive number' });
  }

  const existing = queryOne('SELECT id FROM customers WHERE LOWER(name) = ? AND id != ?', [name.trim().toLowerCase(), req.params.id]);
  if (existing) {
    return res.status(400).json({ error: 'A customer with this name already exists' });
  }

  run('UPDATE customers SET name=?, phone=?, credit_limit=? WHERE id=?', [name.trim(), phone?.trim() || '', limitVal, req.params.id]);
  const updated = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json({ ...updated, ...getBalance(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const customer = queryOne('SELECT id FROM customers WHERE id = ?', [req.params.id]);
  if (!customer)
    return res.status(404).json({ error: 'Customer not found' });

  const balanceInfo = getBalance(req.params.id);
  if (Math.abs(balanceInfo.balance) > 0.01) {
    return res.status(400).json({
      error: `Cannot delete customer with outstanding balance (Current Balance: Rs. ${balanceInfo.balance.toLocaleString()}). Please clear the balance first.`
    });
  }

  transaction(() => {
    run('DELETE FROM udhaar WHERE customer_id = ?', [req.params.id]);
    run('DELETE FROM customers WHERE id = ?', [req.params.id]);
  });
  res.json({ message: 'Customer deleted successfully' });
});

module.exports = router;
