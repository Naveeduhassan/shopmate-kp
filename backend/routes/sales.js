const router              = require('express').Router();
const { query, queryOne, run, transaction } = require('../database');

// GET all sales with items (single bulk fetch — no N+1)
router.get('/', (req, res) => {
  const { date, limit = 50 } = req.query;
  let sql    = `SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id`;
  const params = [];
  if (date) { sql += ` WHERE date(s.created_at) = ?`; params.push(date); }
  sql += ` ORDER BY s.created_at DESC LIMIT ?`;
  params.push(Number(limit));

  const sales = query(sql, params);
  if (sales.length === 0) return res.json([]);

  const saleIds  = sales.map(s => s.id);
  const allItems = query(
    `SELECT * FROM sale_items WHERE sale_id IN (${saleIds.map(() => '?').join(',')})`, saleIds
  );
  const itemsBySale = {};
  allItems.forEach(item => { (itemsBySale[item.sale_id] ??= []).push(item); });
  res.json(sales.map(s => ({ ...s, items: itemsBySale[s.id] || [] })));
});

// POST create new sale — atomic stock decrement inside transaction prevents race conditions
router.post('/', (req, res) => {
  const { items, payment_type, customer_id, discount = 0 } = req.body;

  // Strict input validation (OWASP Top 10)
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sale must have at least one item' });
  }
  for (const item of items) {
    if (!item || item.product_id === undefined || isNaN(Number(item.product_id)) || item.quantity === undefined || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
      return res.status(400).json({ error: 'Each item must have a valid product_id and a positive quantity' });
    }
  }
  if (!payment_type || !['cash', 'udhaar', 'card', 'online'].includes(payment_type)) {
    return res.status(400).json({ error: 'Invalid or missing payment type' });
  }
  const numericDiscount = Number(discount);
  if (isNaN(numericDiscount) || numericDiscount < 0) {
    return res.status(400).json({ error: 'Discount must be a non-negative number' });
  }
  if (payment_type === 'udhaar' && !customer_id) {
    return res.status(400).json({ error: 'Selected customer is required for Udhaar sales' });
  }

  try {
    const sale = transaction(() => {
      let total_amount = 0;
      let total_profit = 0;

      // Validate products
      const resolvedItems = items.map(item => {
        const product = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (!product) throw new Error(`Product ID ${item.product_id} not found`);
        if (product.stock < item.quantity)
          throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock})`);
        const line_total  = product.selling_price * item.quantity;
        const line_profit = (product.selling_price - product.buying_price) * item.quantity;
        total_amount += line_total;
        total_profit += line_profit;
        return { product, quantity: item.quantity };
      });

      const discountAmt    = Math.min(total_amount, numericDiscount);
      const final_amount   = total_amount - discountAmt;
      const final_profit   = Math.max(0, total_profit - discountAmt);

      // Customer Credit Limit check for Udhaar sales
      if (payment_type === 'udhaar' && customer_id) {
        const customer = queryOne('SELECT name, credit_limit FROM customers WHERE id = ?', [customer_id]);
        if (!customer) throw new Error('Selected customer not found');

        // Calculate current balance
        const rows = query(
          `SELECT type, SUM(amount) as total FROM udhaar WHERE customer_id = ? GROUP BY type`,
          [customer_id]
        );
        let debit = 0, paid = 0;
        rows.forEach(r => { if (r.type === 'debit') debit = r.total; else paid = r.total; });
        const currentBalance = debit - paid;

        if (currentBalance + final_amount > customer.credit_limit) {
          throw new Error(`Credit limit exceeded for "${customer.name}". Limit: Rs. ${customer.credit_limit.toLocaleString()}, Current Balance: Rs. ${currentBalance.toLocaleString()}, New Balance: Rs. ${(currentBalance + final_amount).toLocaleString()}`);
        }
      }

      // Insert sale record
      const { lastInsertRowid: sale_id } = run(
        'INSERT INTO sales (total_amount, total_profit, payment_type, customer_id) VALUES (?,?,?,?)',
        [final_amount, final_profit, payment_type, customer_id || null]
      );

      // Atomic stock decrement — WHERE stock >= quantity prevents going negative
      for (const { product, quantity } of resolvedItems) {
        const { changes } = run(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [quantity, product.id, quantity]
        );
        if (changes === 0) {
          throw new Error(`Stock depleted for "${product.name}" during checkout. Please retry.`);
        }
        run(
          `INSERT INTO sale_items
           (sale_id, product_id, product_name, quantity, unit_price, unit_profit, buying_price)
           VALUES (?,?,?,?,?,?,?)`,
          [sale_id, product.id, product.name, quantity,
           product.selling_price,
           (product.selling_price - product.buying_price),
           product.buying_price]
        );
      }

      // Udhaar credit entry linked to sale_id
      if (payment_type === 'udhaar' && customer_id) {
        run("INSERT INTO udhaar (customer_id, amount, type, note, sale_id) VALUES (?,?,'debit','Sale on credit',?)",
          [customer_id, final_amount, sale_id]);
      }

      return queryOne('SELECT * FROM sales WHERE id = ?', [sale_id]);
    });

    res.status(201).json({
      message: 'Sale recorded successfully',
      sale,
    });

  } catch (err) {
    const isUserError = /not found|Insufficient|depleted|exceeded/i.test(err.message);
    res.status(isUserError ? 400 : 500).json({ error: err.message });
  }
});

// DELETE void/cancel a sale — restores stock and removes any linked credit transaction
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid sale ID' });
  }

  try {
    transaction(() => {
      const sale = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
      if (!sale) throw new Error('Sale not found');

      // Revert product inventory levels
      const items = query('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
      for (const item of items) {
        if (item.product_id) {
          run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      // Revert customer credit (udhaar record) if applicable
      if (sale.payment_type === 'udhaar') {
        run('DELETE FROM udhaar WHERE sale_id = ?', [id]);
      }

      // Delete sale records
      run('DELETE FROM sale_items WHERE sale_id = ?', [id]);
      run('DELETE FROM sales WHERE id = ?', [id]);
    });

    res.json({ message: 'Sale voided successfully and inventory restored' });
  } catch (err) {
    console.error(`[Void Sale Error] ${err.message}`);
    res.status(err.message === 'Sale not found' ? 404 : 500).json({ error: err.message });
  }
});

module.exports = router;
