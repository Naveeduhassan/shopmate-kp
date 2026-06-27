import { useEffect, useState } from 'react';
import { getDailyReport } from '../api/api';
import { TrendingUp, ShoppingBag, Package, Users, AlertTriangle, ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
const customTooltipStyle = {
  background: '#1a2235', border: '1px solid #1e2d45', borderRadius: 8,
  color: '#f1f5f9', fontSize: '0.83rem',
};

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const settings = (() => {
    try { return JSON.parse(localStorage.getItem('shopmate_settings') || '{}'); } catch { return {}; }
  })();
  const dailyTarget = parseFloat(settings.dailyTarget || 10000);
  const shopName    = settings.shopName || 'My Shop';

  useEffect(() => {
    getDailyReport()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading dashboard…</span></div>;

  if (!data) return (
    <div className="loading" style={{ flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <strong style={{ color: 'var(--danger)' }}>Cannot connect to backend</strong>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340 }}>
        Make sure the backend server is running:<br />
        <code style={{ color: 'var(--accent)' }}>cd backend && node server.js</code>
      </p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>🔄 Retry</button>
    </div>
  );

  const { sales, stock, customers, low_stock_items, recent_sales, udhaar } = data;
  const targetPct = Math.min(100, ((sales.total_sales / dailyTarget) * 100));
  const targetDone = sales.total_sales >= dailyTarget;

  // Format Recharts data
  const trendData = (data.weekly_trend || []).map(t => ({
    ...t,
    formattedDate: new Date(t.date).toLocaleDateString('en-PK', { weekday: 'short' })
  }));

  const payMethodsData = (data.payment_methods || []).map(m => ({
    name: m.payment_type.toUpperCase(),
    value: m.total
  }));

  return (
    <div className="page">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(245,158,11,0.06))',
        border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: 16, padding: '16px 22px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>🏪 {shopName}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        <Link to="/sales" className="btn btn-primary">
          <ShoppingBag size={15} /> New Sale
        </Link>
      </div>

      {/* Daily Target Progress */}
      <div className="card" style={{ marginBottom: 24, padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Target size={18} color="var(--gold)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Daily Sales Target</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: targetDone ? 'var(--accent)' : 'var(--gold)', marginBottom: 6 }}>
            {fmt(sales.total_sales)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {fmt(dailyTarget)}</span>
          </div>
          <div className="target-bar-wrap" style={{ marginBottom: 8 }}>
            <div className="target-bar-fill" style={{ width: `${targetPct}%` }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: targetDone ? 'var(--accent)' : 'var(--text-muted)' }}>
            {targetDone
              ? `🎉 Target achieved! ${fmt(sales.total_sales - dailyTarget)} above target.`
              : `${targetPct.toFixed(0)}% done · ${fmt(dailyTarget - sales.total_sales)} remaining`}
          </div>
        </div>
        
        <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Done', value: sales.total_sales || 0.0001, fill: targetDone ? 'var(--accent)' : 'var(--gold)' },
                  { name: 'Remaining', value: Math.max(0, dailyTarget - sales.total_sales), fill: 'var(--border)' }
                ]}
                cx="50%" cy="50%"
                innerRadius={28} outerRadius={36}
                startAngle={90} endAngle={-270}
                dataKey="value"
              >
                <Cell fill={targetDone ? 'var(--accent)' : 'var(--gold)'} />
                <Cell fill="var(--border)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800, color: targetDone ? 'var(--accent)' : 'var(--gold)' }}>
            {targetPct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card green">
          <div className="stat-icon green"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Today's Sales</div>
            <div className="stat-value green">{fmt(sales.total_sales)}</div>
          </div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon gold"><ShoppingBag size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Today's Profit</div>
            <div className="stat-value gold">{fmt(sales.total_profit)}</div>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue"><Package size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Stock Items</div>
            <div className="stat-value blue">{stock.items}</div>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red"><Users size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value red">{customers}</div>
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: 28 }}>
        <div className="stat-card gold">
          <div className="stat-icon gold"><AlertTriangle size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Udhaar Outstanding</div>
            <div className="stat-value gold">{fmt(udhaar.total_outstanding)}</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><ShoppingBag size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Transactions Today</div>
            <div className="stat-value green">{sales.total_transactions}</div>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue"><Package size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Stock Units</div>
            <div className="stat-value blue">{stock.units}</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: sales.total_sales > 0
          ? 'var(--accent-glow)' : 'var(--bg-card)', borderColor: sales.total_sales > 0
          ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
          <div className="stat-info">
            <div className="stat-label">Profit Margin</div>
            <div className="stat-value green">
              {sales.total_sales > 0
                ? ((sales.total_profit / sales.total_sales) * 100).toFixed(1) + '%'
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Charts section */}
      <div className="charts-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
            <TrendingUp size={16} color="var(--accent)" />
            7-Day Sales & Profit Trend
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            {trendData.length === 0 ? (
              <div className="empty-state" style={{ padding: '80px 0' }}><p>No transaction history</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="formattedDate" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `Rs.${v/1000}k`} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(v, name) => [fmt(v), name]} />
                  <Area type="monotone" dataKey="sales" stroke="var(--accent)" fillOpacity={1} fill="url(#salesGrad)" name="Sales" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" stroke="var(--gold)" fillOpacity={1} fill="url(#profitGrad)" name="Profit" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
            <ShoppingBag size={16} color="var(--gold)" />
            Sales Share by Payment Method
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 260 }}>
            {payMethodsData.length === 0 ? (
              <div className="empty-state" style={{ padding: '80px 0' }}><p>No transactions recorded today</p></div>
            ) : (
              <>
                <div style={{ width: '55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={payMethodsData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {payMethodsData.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', paddingLeft: 10, flex: 1 }}>
                  {payMethodsData.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}:</span>
                      <span style={{ fontWeight: 700, marginLeft: 'auto' }}>{fmt(m.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Sales */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>🕒 Recent Sales</h3>
            <Link to="/sales" style={{ display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 600 }}>
              New Sale <ArrowRight size={14} />
            </Link>
          </div>
          {recent_sales.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>No sales yet today</p>
              <Link to="/sales" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                Start Selling
              </Link>
            </div>
          ) : recent_sales.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  {s.customer_name || 'Walk-in Customer'}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  <span className={`badge badge-${s.payment_type === 'cash' ? 'green' : s.payment_type === 'udhaar' ? 'gold' : 'blue'}`}>
                    {s.payment_type}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>{fmt(s.total_amount)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textAlign: 'right' }}>+{fmt(s.total_profit)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Low Stock */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
              ⚠️ Low Stock
              {low_stock_items.length > 0 && <span className="notif-dot" />}
            </h3>
            <Link to="/products" style={{ display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 600 }}>
              Manage <ArrowRight size={14} />
            </Link>
          </div>
          {low_stock_items.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p style={{ color: 'var(--accent)' }}>✅ All stock levels are good!</p>
            </div>
          ) : low_stock_items.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{p.category}</div>
              </div>
              <span className={`badge ${p.stock === 0 ? 'badge-red' : 'badge-gold'}`}>
                {p.stock === 0 ? '⛔ Out' : `⚠️ ${p.stock} left`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
