import { useEffect, useState, useCallback, Fragment } from 'react';
import { getMonthlyReport, getSales, deleteSale } from '../api/api';
import { useToast } from '../context/ToastContext';
import { showConfirm } from '../components/ConfirmDialog';
import { TrendingUp, Banknote, Receipt, Percent, Calendar, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

const COLORS = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

const customTooltipStyle = {
  background: '#1a2235', border: '1px solid #1e2d45', borderRadius: 8,
  color: '#f1f5f9', fontSize: '0.83rem',
};

export default function Reports() {
  const toast = useToast();
  const now  = new Date();
  
  // Analytics State
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'log'

  // Sales Log State
  const [salesLog, setSalesLog] = useState([]);
  const [logDate, setLogDate] = useState(''); // YYYY-MM-DD
  const [loadingLog, setLoadingLog] = useState(false);
  const [expandedSale, setExpandedSale] = useState(null);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Load Monthly Report Analytics
  const loadAnalytics = useCallback(() => {
    setLoading(true);
    getMonthlyReport(year, month)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Load Sales History Log
  const loadSalesLog = useCallback(() => {
    setLoadingLog(true);
    getSales({ date: logDate || undefined, limit: 100 })
      .then(r => setSalesLog(r.data))
      .catch(err => {
        toast(err.response?.data?.error || 'Failed to load sales history', 'error');
      })
      .finally(() => setLoadingLog(false));
  }, [logDate, toast]);

  useEffect(() => {
    if (activeTab === 'log') {
      loadSalesLog();
    }
  }, [activeTab, loadSalesLog]);

  // Void Sale handler
  const handleVoidSale = async (id, total) => {
    const ok = await showConfirm({
      title: 'Void Transaction?',
      message: `Are you sure you want to void sale #${id} of Rs. ${Number(total).toLocaleString()}? This will restore product stocks and delete any associated Udhaar records.`,
      confirmText: 'Void Sale',
      icon: '🚨',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteSale(id);
      toast('Sale voided and stock restored successfully! ✅');
      loadSalesLog();
      // Also refresh analytics in case we switch back
      loadAnalytics();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to void sale', 'error');
    }
  };

  if (loading && activeTab === 'analytics') return <div className="loading"><div className="spinner" /><span>Loading reports...</span></div>;
  if (!data && activeTab === 'analytics')   return <div className="loading">Failed to load reports.</div>;

  const { totals, daily_breakdown, best_sellers, top_customers } = data || {};

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>Reports & Logs</h2>
          <p>{activeTab === 'analytics' ? `Analytics for ${months[month - 1]} ${year}` : 'Browse and manage sales transactions'}</p>
        </div>
        
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ width: 'auto', minWidth: 110 }}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ width: 'auto', minWidth: 90 }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="tabs-row" style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'var(--transition)'
          }}
        >
          📈 Monthly Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'log' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'log' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'var(--transition)'
          }}
        >
          🕒 Sales History Log
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Summary cards */}
          <div className="stat-grid" style={{ marginBottom: 28 }}>
            <div className="stat-card green">
              <div className="stat-icon green"><Banknote size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Total Sales</div>
                <div className="stat-value green">{fmt(totals?.total_sales)}</div>
              </div>
            </div>
            <div className="stat-card gold">
              <div className="stat-icon gold"><TrendingUp size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Total Profit</div>
                <div className="stat-value gold">{fmt(totals?.total_profit)}</div>
              </div>
            </div>
            <div className="stat-card blue">
              <div className="stat-icon blue"><Receipt size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Transactions</div>
                <div className="stat-value blue">{totals?.total_transactions || 0}</div>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green"><Percent size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Profit Margin</div>
                <div className="stat-value green">
                  {totals?.total_sales > 0
                    ? ((totals.total_profit / totals.total_sales) * 100).toFixed(1) + '%'
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            {/* Daily Sales Chart */}
            <div className="chart-card">
              <h3>Daily Sales & Profit</h3>
              {daily_breakdown?.length === 0 ? (
                <div className="empty-state"><p>No sales data for this month</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={daily_breakdown} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={d => d.slice(8)} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v/1000}k`} />
                    <Tooltip contentStyle={customTooltipStyle}
                      formatter={(v, n) => [fmt(v), n === 'sales' ? 'Sales' : 'Profit']} />
                    <Legend formatter={v => v === 'sales' ? 'Sales' : 'Profit'} />
                    <Bar dataKey="sales"  fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="profit" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Best Sellers Pie */}
            <div className="chart-card">
              <h3>Best Selling Products</h3>
              {best_sellers?.length === 0 ? (
                <div className="empty-state"><p>No sales data yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={best_sellers} dataKey="total_qty" nameKey="product_name"
                      cx="50%" cy="50%" outerRadius={90} label={({ product_name, percent }) =>
                        `${product_name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#475569' }}>
                      {best_sellers.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle}
                      formatter={(v, n) => [v + ' units', n]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="charts-grid">
            {/* Top Products Table */}
            <div className="chart-card">
              <h3>🏆 Top Products by Revenue</h3>
              {best_sellers?.length === 0 ? (
                <div className="empty-state"><p>No data yet</p></div>
              ) : (
                <div className="table-wrap" style={{ marginTop: 4 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {best_sellers?.map((p, i) => (
                        <tr key={i}>
                          <td><span className="badge badge-blue">{i + 1}</span></td>
                          <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                          <td>{p.total_qty}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Customers */}
            <div className="chart-card">
              <h3>👥 Top Customers</h3>
              {top_customers?.length === 0 ? (
                <div className="empty-state"><p>No customer data yet</p></div>
              ) : (
                <div className="table-wrap" style={{ marginTop: 4 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer</th>
                        <th>Purchases</th>
                        <th>Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top_customers?.map((c, i) => (
                        <tr key={i}>
                          <td><span className="badge badge-gold">{i + 1}</span></td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.total_purchases}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(c.total_spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Sales History Log View */
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 280 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Calendar size={14} />
              </span>
              <input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            {logDate && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLogDate('')}
                style={{ height: 36, padding: '0 12px' }}
              >
                Clear Filter
              </button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {salesLog.length} recent sales
            </div>
          </div>

          {loadingLog ? (
            <div className="loading" style={{ padding: 48 }}>
              <div className="spinner" />
              <span>Loading transactions...</span>
            </div>
          ) : salesLog.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 0' }}>
              <Receipt size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3>No sales found</h3>
              <p>{logDate ? `No transactions recorded on ${new Date(logDate).toLocaleDateString('en-PK')}` : 'Start checking out items in Sales / POS page.'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Sale ID</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Payment Method</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Profit</th>
                    <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLog.map(s => {
                    const isExpanded = expandedSale === s.id;
                    const dateObj = new Date(s.created_at);
                    const formattedDate = dateObj.toLocaleDateString('en-PK', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-PK', {
                      hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <Fragment key={s.id}>
                        <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                              onClick={() => setExpandedSale(isExpanded ? null : s.id)}
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>#{s.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={12} color="var(--text-muted)" />
                              <span>{formattedDate} · {formattedTime}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{s.customer_name || 'Walk-in Customer'}</td>
                          <td>
                            <span className={`badge badge-${s.payment_type === 'cash' ? 'green' : s.payment_type === 'udhaar' ? 'gold' : 'blue'}`}>
                              {s.payment_type}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>{fmt(s.total_amount)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>+{fmt(s.total_profit)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6 }}
                              onClick={() => handleVoidSale(s.id, s.total_amount)}
                            >
                              <Trash2 size={12} /> Void
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'var(--bg-surface)' }}>
                            <td colSpan={8} style={{ padding: '12px 20px' }}>
                              <div style={{
                                padding: '14px 18px',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                background: 'var(--bg-card)',
                              }}>
                                <h4 style={{
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  color: 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  marginBottom: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}>
                                  🛒 Items Purchased
                                </h4>
                                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                                      <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-muted)' }}>Product</th>
                                      <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', width: 100 }}>Unit Price</th>
                                      <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-muted)', width: 80 }}>Qty</th>
                                      <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', width: 120 }}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(s.items || []).map((item, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{item.product_name}</td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(item.unit_price)}</td>
                                        <td style={{ padding: '8px 4px', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.unit_price * item.quantity)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {s.discount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: '0.82rem', fontWeight: 600, color: 'var(--danger)' }}>
                                    <span>Discount applied: −{fmt(s.discount)}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
