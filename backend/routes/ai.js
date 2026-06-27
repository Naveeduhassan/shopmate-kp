const router           = require('express').Router();
const { query, queryOne } = require('../database');

router.get('/insights', (req, res) => {
  const insights = [];

  // Low stock alerts
  query('SELECT name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC').forEach(p => {
    insights.push({ type: 'warning', icon: '📦', title: 'Low Stock Alert',
      message: `${p.name} has only ${p.stock} units left. Restock soon!`, priority: 1 });
  });

  // Out of stock
  const outOfStock = queryOne('SELECT COUNT(*) as count FROM products WHERE stock = 0');
  if (outOfStock.count > 0) {
    insights.push({ type: 'danger', icon: '🚨', title: 'Out of Stock',
      message: `${outOfStock.count} product(s) are completely out of stock!`, priority: 1 });
  }

  // Best seller this week
  const top = queryOne(
    `SELECT si.product_name, SUM(si.quantity) as qty FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.created_at >= datetime('now', '-7 days')
     GROUP BY si.product_name ORDER BY qty DESC LIMIT 1`);
  if (top) insights.push({ type: 'success', icon: '🔥', title: 'Best Seller This Week',
    message: `${top.product_name} is your top product with ${top.qty} units sold this week.`, priority: 2 });

  // High udhaar customers
  query(
    `SELECT c.name,
       SUM(CASE WHEN u.type='debit'   THEN u.amount ELSE 0 END) -
       SUM(CASE WHEN u.type='payment' THEN u.amount ELSE 0 END) as balance
     FROM udhaar u JOIN customers c ON u.customer_id = c.id
     GROUP BY u.customer_id HAVING balance > 1000 ORDER BY balance DESC LIMIT 3`
  ).forEach(c => {
    insights.push({ type: 'warning', icon: '💰', title: 'High Udhaar Balance',
      message: `${c.name} owes Rs. ${Number(c.balance).toLocaleString()}. Send a reminder!`, priority: 2 });
  });

  // Today's profit margin
  const today = queryOne(
    `SELECT COALESCE(SUM(total_amount),0) as sales, COALESCE(SUM(total_profit),0) as profit
     FROM sales WHERE date(created_at) = date('now')`);
  if (today && today.sales > 0) {
    const margin  = ((today.profit / today.sales) * 100).toFixed(1);
    const quality = margin >= 25 ? 'excellent 🎉' : margin >= 15 ? 'good 👍' : 'low ⚠️';
    insights.push({ type: margin >= 15 ? 'success' : 'info', icon: '📈',
      title: "Today's Profit Margin",
      message: `Margin is ${margin}% — ${quality}. Profit: Rs. ${Number(today.profit).toLocaleString()}.`,
      priority: 3 });
  }

  // Most profitable product overall
  const profitable = queryOne(
    `SELECT product_name, SUM(unit_profit * quantity) as total_profit
     FROM sale_items GROUP BY product_name ORDER BY total_profit DESC LIMIT 1`);
  if (profitable) {
    insights.push({ type: 'info', icon: '💡', title: 'Most Profitable Product',
      message: `${profitable.product_name} generated Rs. ${Number(profitable.total_profit).toLocaleString()} total profit. Keep it stocked!`,
      priority: 3 });
  }

  if (insights.length === 0) {
    insights.push({ type: 'info', icon: '📊', title: 'Welcome to ShopMate KP!',
      message: 'Start adding products and recording sales to see AI-powered insights here.', priority: 4 });
  }

  insights.sort((a, b) => a.priority - b.priority);
  res.json({ insights, generated_at: new Date().toISOString() });
});

module.exports = router;
