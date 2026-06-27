const router = require('express').Router();
const { query, queryOne, run } = require('../database');

const EXPENSE_CATEGORIES = [
  'Rent', 'Electricity', 'Water', 'Gas', 'Salary', 'Transport',
  'Purchase / Inventory', 'Repairs', 'Packaging', 'Marketing', 'Miscellaneous'
];

// GET all expenses
router.get('/', (req, res) => {
  try {
    const expenses = query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new expense
router.post('/', (req, res) => {
  const { amount, description, category } = req.body;

  if (amount === undefined || amount === null || amount === '') {
    return res.status(400).json({ error: 'Amount is required' });
  }
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (!description?.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }
  if (description.trim().length > 250) {
    return res.status(400).json({ error: 'Description cannot exceed 250 characters' });
  }

  const selectedCat = category || 'Miscellaneous';
  if (!EXPENSE_CATEGORIES.includes(selectedCat)) {
    return res.status(400).json({ error: 'Invalid expense category' });
  }

  try {
    const { lastInsertRowid } = run(
      'INSERT INTO expenses (amount, category, description) VALUES (?,?,?)',
      [numericAmount, selectedCat, description.trim()]
    );
    const newExpense = queryOne('SELECT * FROM expenses WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an expense
router.delete('/:id', (req, res) => {
  try {
    const expense = queryOne('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
