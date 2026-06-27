const router              = require('express').Router();
const { query, queryOne, run } = require('../database');

router.get('/', (req, res) => {
  res.json(query('SELECT * FROM products ORDER BY name ASC'));
});

router.get('/:id', (req, res) => {
  const p = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

router.post('/', (req, res) => {
  const { name, category, buying_price, selling_price, stock } = req.body;
  if (!name?.trim())
    return res.status(400).json({ error: 'Product name is required' });

  const sellPrice = Number(selling_price);
  if (selling_price === undefined || selling_price === null || selling_price === '' || isNaN(sellPrice) || sellPrice <= 0) {
    return res.status(400).json({ error: 'Selling price must be a valid number greater than 0' });
  }

  const buyPrice = buying_price !== undefined && buying_price !== null && buying_price !== '' ? Number(buying_price) : 0;
  if (isNaN(buyPrice) || buyPrice < 0) {
    return res.status(400).json({ error: 'Buying price must be a valid non-negative number' });
  }

  if (sellPrice <= buyPrice) {
    return res.status(400).json({ error: 'Selling price must be greater than buying price' });
  }

  const stockQty = stock !== undefined && stock !== null && stock !== '' ? Number(stock) : 0;
  if (isNaN(stockQty) || stockQty < 0 || !Number.isInteger(stockQty)) {
    return res.status(400).json({ error: 'Stock must be a valid non-negative integer' });
  }

  const existing = queryOne('SELECT id FROM products WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);
  if (existing)
    return res.status(400).json({ error: 'A product with this name already exists' });

  const { lastInsertRowid } = run(
    'INSERT INTO products (name, category, buying_price, selling_price, stock) VALUES (?,?,?,?,?)',
    [name.trim(), category || 'General', buyPrice, sellPrice, stockQty]
  );
  res.status(201).json(queryOne('SELECT * FROM products WHERE id = ?', [lastInsertRowid]));
});

router.put('/:id', (req, res) => {
  const { name, category, buying_price, selling_price, stock } = req.body;
  const oldProduct = queryOne('SELECT stock, buying_price, name FROM products WHERE id = ?', [req.params.id]);
  if (!oldProduct)
    return res.status(404).json({ error: 'Product not found' });
  if (!name?.trim())
    return res.status(400).json({ error: 'Product name is required' });

  const sellPrice = Number(selling_price);
  if (selling_price === undefined || selling_price === null || selling_price === '' || isNaN(sellPrice) || sellPrice <= 0) {
    return res.status(400).json({ error: 'Selling price must be a valid number greater than 0' });
  }

  const buyPrice = buying_price !== undefined && buying_price !== null && buying_price !== '' ? Number(buying_price) : 0;
  if (isNaN(buyPrice) || buyPrice < 0) {
    return res.status(400).json({ error: 'Buying price must be a valid non-negative number' });
  }

  if (sellPrice <= buyPrice) {
    return res.status(400).json({ error: 'Selling price must be greater than buying price' });
  }

  const stockQty = stock !== undefined && stock !== null && stock !== '' ? Number(stock) : 0;
  if (isNaN(stockQty) || stockQty < 0 || !Number.isInteger(stockQty)) {
    return res.status(400).json({ error: 'Stock must be a valid non-negative integer' });
  }

  const existing = queryOne('SELECT id FROM products WHERE LOWER(name) = ? AND id != ?', [name.trim().toLowerCase(), req.params.id]);
  if (existing)
    return res.status(400).json({ error: 'A product with this name already exists' });

  run('UPDATE products SET name=?, category=?, buying_price=?, selling_price=?, stock=? WHERE id=?',
    [name.trim(), category, buyPrice, sellPrice, stockQty, req.params.id]);

  // Restock Expense Automation
  const addedStock = stockQty - oldProduct.stock;
  if (addedStock > 0 && buyPrice > 0) {
    const expenseAmount = addedStock * buyPrice;
    run(
      'INSERT INTO expenses (amount, category, description) VALUES (?, ?, ?)',
      [expenseAmount, 'Purchase / Inventory', `Restocked ${addedStock} units of "${name.trim()}"`]
    );
  }

  res.json(queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  if (!queryOne('SELECT id FROM products WHERE id = ?', [req.params.id]))
    return res.status(404).json({ error: 'Product not found' });
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ message: 'Product deleted successfully' });
});

module.exports = router;
