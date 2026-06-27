const router              = require('express').Router();
const { query, queryOne, run } = require('../database');

router.get('/', (req, res) => {
  const { customer_id } = req.query;
  let sql    = `SELECT u.*, c.name as customer_name FROM udhaar u JOIN customers c ON u.customer_id = c.id`;
  const params = [];
  if (customer_id) { sql += ' WHERE u.customer_id = ?'; params.push(customer_id); }
  sql += ' ORDER BY u.created_at DESC';
  res.json(query(sql, params));
});

router.post('/', (req, res) => {
  const { customer_id, amount, type, note } = req.body;
  if (!customer_id || !type)
    return res.status(400).json({ error: 'customer_id and type are required' });
  if (amount === undefined || amount === null || amount === '')
    return res.status(400).json({ error: 'Amount is required' });
  if (isNaN(Number(amount)) || Number(amount) <= 0)
    return res.status(400).json({ error: 'Amount must be a positive number' });
  if (!['debit', 'payment'].includes(type))
    return res.status(400).json({ error: 'type must be "debit" or "payment"' });
  const customer = queryOne('SELECT id FROM customers WHERE id = ?', [customer_id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Prevent overpayment
  if (type === 'payment') {
    const rows = query(
      `SELECT type, SUM(amount) as total FROM udhaar WHERE customer_id = ? GROUP BY type`,
      [customer_id]
    );
    let debit = 0, paid = 0;
    rows.forEach(r => { if (r.type === 'debit') debit = r.total; else paid = r.total; });
    const balance = debit - paid;
    if (Number(amount) > balance)
      return res.status(400).json({
        error: `Payment Rs. ${amount} exceeds outstanding balance Rs. ${balance.toFixed(0)}`
      });
  }
  const { lastInsertRowid } = run(
    'INSERT INTO udhaar (customer_id, amount, type, note) VALUES (?,?,?,?)',
    [customer_id, amount, type, note || '']
  );
  res.status(201).json(queryOne('SELECT * FROM udhaar WHERE id = ?', [lastInsertRowid]));
});

router.delete('/:id', (req, res) => {
  if (!queryOne('SELECT id FROM udhaar WHERE id = ?', [req.params.id]))
    return res.status(404).json({ error: 'Udhaar entry not found' });
  run('DELETE FROM udhaar WHERE id = ?', [req.params.id]);
  res.json({ message: 'Entry deleted' });
});

module.exports = router;
