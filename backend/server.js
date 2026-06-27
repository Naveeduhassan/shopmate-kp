const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const { initDB } = require('./database');

const app  = express();
const PORT = 3001;

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier local dashboard and Recharts render compatibility
}));
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/products',  require('./routes/products'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/udhaar',    require('./routes/udhaar'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/ai',        require('./routes/ai'));
app.use('/api/expenses',  require('./routes/expenses'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ShopMate KP Backend Running 🚀' });
});

// ─── Init DB then start server ────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏪 ShopMate KP Backend → http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
