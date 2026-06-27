import { useEffect, useState } from 'react';
import { getAIInsights } from '../api/api';
import { Sparkles, RefreshCw, Smartphone, Package, Coins, Users, Lightbulb } from 'lucide-react';

export default function AIAdvisor() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAIInsights().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>🤖 AI Business Advisor</h2>
          <p>Smart insights based on your real shop data</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(245,158,11,0.08) 100%)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <div style={{ fontSize: '2.5rem' }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
            ShopMate AI is analysing your business...
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Insights are generated from your real sales, stock, and customer data.
            {data && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>
              Last updated: {new Date(data.generated_at).toLocaleTimeString()}
            </span>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>AI is analysing your data...</span>
        </div>
      ) : !data ? (
        <div className="loading">Failed to load insights. Is the backend running?</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.insights.map((ins, i) => (
            <div key={i} className={`insight-card ${ins.type}`}>
              <div className="insight-icon">{ins.icon}</div>
              <div className="insight-content">
                <h4>{ins.title}</h4>
                <p>{ins.message}</p>
              </div>
            </div>
          ))}
          {data.insights.length === 0 && (
            <div className="empty-state">
              <Sparkles size={48} />
              <h3>No insights yet</h3>
              <p>Add products and record sales to get AI-powered insights</p>
            </div>
          )}
        </div>
      )}

      {/* AI Tips section */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem',
          textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lightbulb size={16} color="var(--gold)" /> Business Tips for Pakistan
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {[
            { icon: <Smartphone size={24} color="var(--accent)" />, title: 'Use Udhaar Wisely', tip: 'Limit credit to trusted customers. Always record immediately to avoid forgetting.' },
            { icon: <Package size={24} color="var(--info)" />, title: 'Stock Management', tip: 'Keep 2-3 weeks of fast-moving items. Review slow movers monthly.' },
            { icon: <Coins size={24} color="var(--gold)" />, title: 'Price Smartly', tip: 'Aim for 20-30% profit margin on groceries, 40-50% on cosmetics.' },
            { icon: <Users size={24} color="var(--danger)" />, title: 'Customer Relations', tip: 'Send monthly reminders for outstanding Udhaar. Personal touch builds loyalty.' },
          ].map((t, i) => (
            <div key={i} className="card" style={{ padding: 18 }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
