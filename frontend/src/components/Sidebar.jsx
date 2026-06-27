import { NavLink } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  BarChart2, Sparkles, Store, Receipt, Settings, X
} from 'lucide-react';

export const links = [
  { to: '/',          icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/products',  icon: <Package size={18} />,         label: 'Products' },
  { to: '/sales',     icon: <ShoppingCart size={18} />,    label: 'Sales / POS' },
  { to: '/udhaar',    icon: <Users size={18} />,           label: 'Udhaar (Credit)' },
  { to: '/expenses',  icon: <Receipt size={18} />,         label: 'Expenses' },
  { to: '/reports',   icon: <BarChart2 size={18} />,       label: 'Reports & Logs' },
  { to: '/ai',        icon: <Sparkles size={18} />,        label: 'AI Advisor' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const shopName = localStorage.getItem('shopName') || 'ShopMate KP';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Store size={22} color="#10b981" />
              <h1 style={{ fontSize: '1.2rem' }}>ShopMate KP</h1>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{shopName}</p>
          </div>
          
          {/* Mobile close button */}
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={closeSidebar}
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Settings link at bottom */}
        <div style={{ padding: '8px 12px' }}>
          <NavLink to="/settings"
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={closeSidebar}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
              borderRadius: 10, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            <Settings size={18} /> Settings
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <p>ShopMate KP v1.0</p>
          <p style={{ marginTop: 3 }}>Made for Pakistan 🇵🇰</p>
        </div>
      </aside>
    </>
  );
}
