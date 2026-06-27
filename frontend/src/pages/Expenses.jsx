import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { showConfirm } from '../components/ConfirmDialog';
import { getDailyReport, getExpenses, createExpense, deleteExpense } from '../api/api';
import { Plus, Trash2, Receipt, BarChart2 } from 'lucide-react';

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

const EXPENSE_CATEGORIES = ['Rent','Electricity','Water','Gas','Salary','Transport',
  'Purchase / Inventory','Repairs','Packaging','Marketing','Miscellaneous'];

export default function Expenses() {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [form, setForm]     = useState({ amount: '', description: '', category: 'Miscellaneous' });
  const [showForm, setShowForm] = useState(false);
  const [todaySales, setTodaySales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getExpenses(), getDailyReport()])
      .then(([exp, rep]) => {
        setExpenses(exp.data);
        setTodaySales(rep.data.sales);
      })
      .catch(err => {
        toast(err.response?.data?.error || 'Failed to load expenses', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.created_at && e.created_at.startsWith(today));
  const totalExpenses = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit     = (todaySales?.total_profit || 0) - totalExpenses;

  const addExpense = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      return toast('Enter a valid amount greater than 0', 'error');
    }
    if (!form.description?.trim()) {
      return toast('Description is required', 'error');
    }
    if (form.description.trim().length > 250) {
      return toast('Description cannot exceed 250 characters', 'error');
    }

    setSaving(true);
    try {
      await createExpense({
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        category: form.category
      });
      toast('Expense recorded ✅');
      setForm({ amount: '', description: '', category: 'Miscellaneous' });
      setShowForm(false);
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExpense = async (id, desc) => {
    const ok = await showConfirm({
      title: 'Delete Expense?',
      message: `Remove "${desc}"?`,
      confirmText: 'Delete',
      icon: '🗑️',
      danger: true
    });
    if (!ok) return;
    try {
      await deleteExpense(id);
      toast('Expense removed');
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to delete expense', 'error');
    }
  };

  // Group by category
  const byCategory = todayExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading expenses...</span></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Receipt size={20} color="var(--accent)" /> Expenses</h2>
          <p>Track daily costs and calculate true profit</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* EOD Summary */}
      <div className="eod-grid">
        <div className="eod-card">
          <div className="eod-val" style={{ color: 'var(--accent)' }}>{fmt(todaySales?.total_sales || 0)}</div>
          <div className="eod-lbl">Today's Sales</div>
        </div>
        <div className="eod-card">
          <div className="eod-val" style={{ color: 'var(--gold)' }}>{fmt(todaySales?.total_profit || 0)}</div>
          <div className="eod-lbl">Gross Profit</div>
        </div>
        <div className="eod-card">
          <div className="eod-val" style={{ color: 'var(--danger)' }}>{fmt(totalExpenses)}</div>
          <div className="eod-lbl">Total Expenses</div>
        </div>
        <div className="eod-card" style={{
          background: netProfit >= 0 ? 'var(--accent-glow)' : 'var(--danger-glow)',
          borderColor: netProfit >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        }}>
          <div className="eod-val" style={{ color: netProfit >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
            {netProfit >= 0 ? '' : '−'}{fmt(Math.abs(netProfit))}
          </div>
          <div className="eod-lbl">Net Profit</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="settings-section" style={{ marginBottom: 20 }}>
          <h3>New Expense</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Amount (Rs.) *</label>
              <input type="number" min="0" placeholder="0" value={form.amount} autoFocus
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addExpense()} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description *</label>
            <input placeholder="e.g. Monthly shop rent" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExpense()} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addExpense}>Add Expense</button>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={16} color="var(--accent)" /> By Category</h3>
          {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cat}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmt(amt)}</span>
              </div>
              <div className="target-bar-wrap">
                <div className="target-bar-fill"
                  style={{ width: `${Math.min(100, (amt / totalExpenses) * 100)}%`,
                    background: 'linear-gradient(90deg, var(--danger), var(--gold))' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's expenses list */}
      <div style={{ marginBottom: 8, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Today's Expenses ({todayExpenses.length})
      </div>

      {todayExpenses.length === 0 ? (
        <div className="empty-state">
          <Receipt size={48} />
          <h3>No expenses recorded today</h3>
          <p>Add expenses to calculate your true net profit</p>
        </div>
      ) : (
        <div className="expense-list">
          {[...todayExpenses].reverse().map(e => (
            <div key={e.id} className="expense-item">
              <div>
                <div className="expense-desc">{e.description}</div>
                <div className="expense-date">
                  <span className="badge badge-muted">{e.category}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="expense-amount">{fmt(e.amount)}</div>
                <button className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveExpense(e.id, e.description)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
