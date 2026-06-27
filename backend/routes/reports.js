const router           = require('express').Router();
const { query, queryOne } = require('../database');

router.get('/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  const todaySales = queryOne(
    `SELECT COUNT(*) as total_transactions,
            COALESCE(SUM(total_amount),0) as total_sales,
            COALESCE(SUM(total_profit),0) as total_profit
     FROM sales WHERE date(created_at) = ?`, [date]);

  const stock         = queryOne('SELECT COUNT(*) as items, COALESCE(SUM(stock),0) as units FROM products');
  const customers     = queryOne('SELECT COUNT(*) as count FROM customers');
  const lowStock      = query('SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10');
  const recentSales   = query(
    `SELECT s.*, c.name as customer_name FROM sales s
     LEFT JOIN customers c ON s.customer_id = c.id
     ORDER BY s.created_at DESC LIMIT 5`);

  const udhaarRows    = query("SELECT type, SUM(amount) as total FROM udhaar GROUP BY type");
  let debit = 0, paid = 0;
  udhaarRows.forEach(r => { if (r.type === 'debit') debit = r.total; else paid = r.total; });

  // Weekly sales trend (past 7 days including today)
  const weeklyTrend = query(
    `SELECT date(created_at) as date,
            COALESCE(SUM(total_amount), 0) as sales,
            COALESCE(SUM(total_profit), 0) as profit
     FROM sales
     WHERE date(created_at) >= date(?, '-6 days')
     GROUP BY date(created_at)
     ORDER BY date(created_at) ASC`, [date]);

  // Payment method breakdown for today
  const paymentBreakdown = query(
    `SELECT payment_type,
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0) as total
     FROM sales
     WHERE date(created_at) = ?
     GROUP BY payment_type`, [date]);

  res.json({
    date,
    sales:           todaySales,
    stock,
    customers:       customers.count,
    low_stock_items: lowStock,
    recent_sales:    recentSales,
    udhaar:          { total_outstanding: debit - paid },
    weekly_trend:    weeklyTrend,
    payment_methods: paymentBreakdown,
  });
});

router.get('/monthly', (req, res) => {
  const now    = new Date();
  const y      = req.query.year  || now.getFullYear();
  const m      = req.query.month || (now.getMonth() + 1);
  const prefix = `${y}-${String(m).padStart(2, '0')}`;

  const dailyBreakdown = query(
    `SELECT date(created_at) as date, COUNT(*) as transactions,
            COALESCE(SUM(total_amount),0) as sales, COALESCE(SUM(total_profit),0) as profit
     FROM sales WHERE strftime('%Y-%m', created_at) = ?
     GROUP BY date(created_at) ORDER BY date(created_at)`, [prefix]);

  const bestSellers = query(
    `SELECT si.product_name, SUM(si.quantity) as total_qty,
            SUM(si.quantity * si.unit_price) as total_revenue
     FROM sale_items si JOIN sales s ON si.sale_id = s.id
     WHERE strftime('%Y-%m', s.created_at) = ?
     GROUP BY si.product_name ORDER BY total_qty DESC LIMIT 8`, [prefix]);

  const topCustomers = query(
    `SELECT c.name, COUNT(s.id) as total_purchases, COALESCE(SUM(s.total_amount),0) as total_spent
     FROM sales s JOIN customers c ON s.customer_id = c.id
     WHERE strftime('%Y-%m', s.created_at) = ?
     GROUP BY c.id ORDER BY total_spent DESC LIMIT 5`, [prefix]);

  const totals = queryOne(
    `SELECT COALESCE(SUM(total_amount),0) as total_sales,
            COALESCE(SUM(total_profit),0) as total_profit,
            COUNT(*) as total_transactions
     FROM sales WHERE strftime('%Y-%m', created_at) = ?`, [prefix]);

  res.json({ year: y, month: m, totals, daily_breakdown: dailyBreakdown,
    best_sellers: bestSellers, top_customers: topCustomers });
});

module.exports = router;
