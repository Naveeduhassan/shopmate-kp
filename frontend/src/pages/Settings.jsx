import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import { Store, User, Phone, MapPin, Target, Palette, Save } from 'lucide-react';

const DEFAULT_SETTINGS = {
  shopName:    'My Shop',
  ownerName:   '',
  phone:       '',
  address:     '',
  city:        'Peshawar, KPK',
  dailyTarget: '10000',
  currency:    'Rs.',
  theme:       'dark',
  sidebarColor: 'dark',
  headerColor: 'transparent',
};

export default function Settings() {
  const toast = useToast();
  const { saveThemeSettings } = useLayout();
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shopmate_settings') || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch { return DEFAULT_SETTINGS; }
  });

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleStyleChange = (key, val) => {
    setSettings(s => {
      const updated = { ...s, [key]: val };
      saveThemeSettings({
        theme: updated.theme,
        sidebarColor: updated.sidebarColor,
        headerColor: updated.headerColor,
      });
      return updated;
    });
  };

  const save = () => {
    localStorage.setItem('shopmate_settings', JSON.stringify(settings));
    localStorage.setItem('shopName', settings.shopName);
    
    saveThemeSettings({
      theme: settings.theme,
      sidebarColor: settings.sidebarColor,
      headerColor: settings.headerColor,
    });
    
    toast('Settings saved ✅');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h2>⚙️ Settings</h2><p>Configure your shop profile and preferences</p></div>
        <button className="btn btn-primary" onClick={save}><Save size={16} /> Save Changes</button>
      </div>

      {/* Shop Info */}
      <div className="settings-section">
        <h3>🏪 Shop Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Shop Name *</label>
            <input placeholder="e.g. Al-Madina General Store"
              value={settings.shopName} onChange={e => set('shopName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Owner Name</label>
            <input placeholder="e.g. Naveed Ul Hassan"
              value={settings.ownerName} onChange={e => set('ownerName', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Phone Number</label>
            <input placeholder="0300-1234567"
              value={settings.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>City</label>
            <input placeholder="Peshawar, KPK"
              value={settings.city} onChange={e => set('city', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Shop Address</label>
          <input placeholder="e.g. Main Bazaar, Mansehra"
            value={settings.address} onChange={e => set('address', e.target.value)} />
        </div>
      </div>

      {/* Business Goals */}
      <div className="settings-section">
        <h3>🎯 Business Goals</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Daily Sales Target (Rs.)</label>
            <input type="number" min="0" placeholder="10000"
              value={settings.dailyTarget} onChange={e => set('dailyTarget', e.target.value)} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Monthly target: Rs. {(parseFloat(settings.dailyTarget || 0) * 26).toLocaleString()} (26 working days)
            </div>
          </div>
          <div className="form-group">
            <label>Currency Symbol</label>
            <select value={settings.currency} onChange={e => set('currency', e.target.value)}>
              <option value="Rs.">Rs. (Pakistani Rupee)</option>
              <option value="PKR">PKR</option>
              <option value="$">$ (USD)</option>
              <option value="£">£ (GBP)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="settings-section">
        <h3>🎨 Theme & Appearance</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Theme Mode</label>
            <select value={settings.theme} onChange={e => handleStyleChange('theme', e.target.value)}>
              <option value="dark">Dark Theme (Standard)</option>
              <option value="light">Light Theme (Clean Contrast)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sidebar Style</label>
            <select value={settings.sidebarColor} onChange={e => handleStyleChange('sidebarColor', e.target.value)}>
              <option value="dark">Slate Dark (Default)</option>
              <option value="emerald">Emerald Green (Professional)</option>
              <option value="navy">Navy Blue (Sleek)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Header / Topbar Style</label>
            <select value={settings.headerColor} onChange={e => handleStyleChange('headerColor', e.target.value)}>
              <option value="transparent">Transparent Dash</option>
              <option value="solid">Solid Surface Panel</option>
              <option value="accent">Accent Colored Highlight</option>
            </select>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="settings-section">
        <h3>ℹ️ App Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'App Name',     val: 'ShopMate KP' },
            { label: 'Version',      val: 'v1.0.0' },
            { label: 'Database',     val: 'SQLite (Local)' },
            { label: 'Backend',      val: 'Node.js + Express' },
            { label: 'Built for',    val: 'Pakistan 🇵🇰' },
            { label: 'Tech Stack',   val: 'React + Vite' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '12px 16px',
              border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Upgrade */}
      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.06))',
        border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        marginTop: 4 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>🚀 Coming in Version 2</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {['📱 Barcode Scanner','🖨️ Thermal Printer','📲 WhatsApp Receipts',
            '☁️ Cloud Backup','👥 Multi-User','📊 Advanced Analytics',
            '🔄 Return/Refund','💰 EasyPaisa/JazzCash'].map(f => (
            <div key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)',
              padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 8,
              border: '1px solid var(--border)' }}>{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
