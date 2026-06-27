import { useLocation, NavLink } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { Menu, Store, Settings as SettingsIcon } from 'lucide-react';
import { links } from './Sidebar';

const titles = {
  '/':         { title: 'Dashboard',        sub: 'Overview of your shop today' },
  '/products': { title: 'Product Manager',  sub: 'Add, edit and manage your inventory' },
  '/sales':    { title: 'Sales / POS',      sub: 'Record new sales and transactions' },
  '/udhaar':   { title: 'Udhaar (Credit)',  sub: 'Track customer debts and payments' },
  '/reports':  { title: 'Reports & Logs',   sub: 'Analytics, charts and transaction logs' },
  '/ai':       { title: 'AI Advisor',       sub: 'Smart recommendations for your business' },
  '/expenses': { title: 'Expenses Manager', sub: 'Track business costs and calculate profit' },
  '/settings': { title: 'Settings',          sub: 'Customize shop details and styling' },
};

export default function TopBar() {
  const loc  = useLocation();
  const { toggleSidebar, themeSettings } = useLayout();
  const layoutMode = themeSettings.layoutMode || 'sidebar';
  const shopName = localStorage.getItem('shopName') || 'ShopMate KP';

  const info = titles[loc.pathname] || { title: 'ShopMate KP', sub: '' };
  const now  = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className={`topbar ${layoutMode === 'topbar' ? 'topbar-layout' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="menu-toggle-btn"
          onClick={toggleSidebar}
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        
        {layoutMode === 'topbar' ? (
          <div className="topbar-logo hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={20} color="#10b981" />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{shopName}</span>
          </div>
        ) : (
          <div>
            <div className="topbar-title">{info.title}</div>
            <div className="topbar-date">{info.sub}</div>
          </div>
        )}
      </div>

      {layoutMode === 'topbar' && (
        <nav className="topbar-nav hide-on-mobile">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => isActive ? 'topbar-link active' : 'topbar-link'}
            >
              {l.icon}
              <span>{l.label.replace(' / POS', '').replace(' (Credit)', '').replace(' & Logs', '')}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) => isActive ? 'topbar-link active' : 'topbar-link'}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>
      )}

      <div className="topbar-date hide-on-mobile">{now}</div>
    </div>
  );
}

