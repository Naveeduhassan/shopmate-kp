import { useLocation } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { Menu } from 'lucide-react';

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
  const { toggleSidebar } = useLayout();
  const info = titles[loc.pathname] || { title: 'ShopMate KP', sub: '' };
  const now  = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="menu-toggle-btn"
          onClick={toggleSidebar}
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="topbar-title">{info.title}</div>
          <div className="topbar-date">{info.sub}</div>
        </div>
      </div>
      <div className="topbar-date hide-on-mobile">{now}</div>
    </div>
  );
}
