import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, createUdhaar } from '../api/api';
import { useToast } from '../context/ToastContext';
import { showConfirm } from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { Plus, Search, Trash2, CreditCard, TrendingDown, Edit2, MessageCircle } from 'lucide-react';

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

export default function Udhaar() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
  const [selCust, setSelCust]     = useState(null);
  const [newCust, setNewCust]     = useState({ name: '', phone: '', credit_limit: 15000 });
  const [entry, setEntry]         = useState({ amount: '', type: 'debit', note: '' });
  const [saving, setSaving]       = useState(false);

  const load = () => getCustomers().then(r => setCustomers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const handleAddCustomer = async () => {
    if (!newCust.name?.trim()) return toast('Customer name is required', 'error');
    
    const cleanPhone = (newCust.phone || '').replace(/[\s-]/g, '');
    if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
      return toast('Phone number must be a valid Pakistani mobile format (e.g., 0300-1234567)', 'error');
    }

    const limitVal = newCust.credit_limit !== undefined && newCust.credit_limit !== '' ? Number(newCust.credit_limit) : 15000;
    if (isNaN(limitVal) || limitVal <= 0) {
      return toast('Credit limit must be a positive number', 'error');
    }

    setSaving(true);
    try {
      await createCustomer({ name: newCust.name.trim(), phone: newCust.phone.trim(), credit_limit: limitVal });
      toast('Customer added!');
      setModal(null);
      setNewCust({ name: '', phone: '', credit_limit: 15000 });
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to add customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (customer) => {
    setSelCust(customer);
    setNewCust({ name: customer.name, phone: customer.phone, credit_limit: customer.credit_limit });
    setModal('edit-customer');
  };

  const handleEditCustomer = async () => {
    if (!newCust.name?.trim()) return toast('Customer name is required', 'error');

    const cleanPhone = (newCust.phone || '').replace(/[\s-]/g, '');
    if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
      return toast('Phone number must be a valid Pakistani mobile format (e.g., 0300-1234567)', 'error');
    }

    const limitVal = newCust.credit_limit !== undefined && newCust.credit_limit !== '' ? Number(newCust.credit_limit) : 15000;
    if (isNaN(limitVal) || limitVal <= 0) {
      return toast('Credit limit must be a positive number', 'error');
    }

    setSaving(true);
    try {
      await updateCustomer(selCust.id, {
        name: newCust.name.trim(),
        phone: newCust.phone.trim(),
        credit_limit: limitVal
      });
      toast('Customer updated!');
      setModal(null);
      setNewCust({ name: '', phone: '', credit_limit: 15000 });
      setSelCust(null);
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to update customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await showConfirm({
      title: 'Delete Customer?',
      message: `Delete customer "${name}" and all their Udhaar records?`,
      confirmText: 'Delete',
      icon: '🗑️',
      danger: true
    });
    if (!ok) return;
    try {
      await deleteCustomer(id);
      toast('Customer deleted');
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const handleEntry = async () => {
    if (!entry.amount || isNaN(entry.amount) || Number(entry.amount) <= 0)
      return toast('Enter a valid amount', 'error');
    if (entry.type === 'payment' && Number(entry.amount) > selCust.balance)
      return toast(`Amount exceeds outstanding balance of Rs. ${selCust.balance.toLocaleString()}`, 'error');

    setSaving(true);
    try {
      await createUdhaar({
        customer_id: selCust.id,
        amount: Number(entry.amount),
        type: entry.type,
        note: entry.note?.trim() || ''
      });
      toast(entry.type === 'payment' ? 'Payment recorded! ✅' : 'Udhaar added!');
      setModal(null);
      setEntry({ amount: '', type: 'debit', note: '' });
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to save entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalOutstanding = customers.reduce((s, c) => s + (c.balance || 0), 0);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Udhaar (Credit)</h2>
          <p>Total outstanding: <strong style={{ color: 'var(--gold)' }}>{fmt(totalOutstanding)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add-customer')}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="toolbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={16} />
          <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={48} />
          <h3>No customers found</h3>
          <p>Add a customer to start tracking Udhaar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(c => (
            <div key={c.id} className="udhaar-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="udhaar-customer">{c.name}</div>
                  <div className="udhaar-phone">📞 {c.phone || 'No phone'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }}
                    onClick={() => handleStartEdit(c)}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ padding: '6px 8px' }}
                    onClick={() => handleDelete(c.id, c.name)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="udhaar-amounts">
                <div className="udhaar-amount">
                  <div className="udhaar-amount-val" style={{ color: 'var(--danger)' }}>{fmt(c.total_debit)}</div>
                  <div className="udhaar-amount-lbl">Total Udhaar</div>
                </div>
                <div className="udhaar-amount">
                  <div className="udhaar-amount-val" style={{ color: 'var(--accent)' }}>{fmt(c.total_paid)}</div>
                  <div className="udhaar-amount-lbl">Paid</div>
                </div>
                <div className="udhaar-amount">
                  <div className="udhaar-amount-val" style={{ color: c.balance > 0 ? 'var(--gold)' : 'var(--accent)' }}>
                    {fmt(c.balance)}
                  </div>
                  <div className="udhaar-amount-lbl">Remaining</div>
                </div>
                <div className="udhaar-amount">
                  <div className="udhaar-amount-val" style={{ color: 'var(--text-secondary)' }}>{fmt(c.credit_limit)}</div>
                  <div className="udhaar-amount-lbl">Limit</div>
                </div>
              </div>

              {c.balance > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                      onClick={() => { setSelCust(c); setEntry({ amount: '', type: 'debit', note: '' }); setModal('entry'); }}>
                      <CreditCard size={13} /> Add Udhaar
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                      onClick={() => { setSelCust(c); setEntry({ amount: c.balance, type: 'payment', note: '' }); setModal('entry'); }}>
                      <TrendingDown size={13} /> Record Payment
                    </button>
                  </div>
                  <button className="btn btn-ghost btn-sm" 
                    disabled={!c.phone}
                    style={{ 
                      width: '100%', 
                      borderColor: c.phone ? 'var(--accent)' : 'var(--border)', 
                      color: c.phone ? 'var(--accent)' : 'var(--text-muted)',
                      opacity: c.phone ? 1 : 0.5,
                      cursor: c.phone ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => {
                      if (!c.phone) return;
                      let phoneFormatted = c.phone.replace(/[^0-9]/g, '');
                      if (phoneFormatted.startsWith('03')) {
                        phoneFormatted = '92' + phoneFormatted.substring(1);
                      }
                      const savedSettings = JSON.parse(localStorage.getItem('shopmate_settings') || '{}');
                      const shopName = savedSettings.shopName || 'ShopMate KP';
                      const text = `Assalam-o-Alaikum, this is a friendly reminder from ${shopName} that your outstanding Udhaar balance is Rs. ${c.balance.toLocaleString()}. Please clear it at your earliest convenience. Shukriya!`;
                      window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(text)}`, '_blank');
                    }}>
                    <MessageCircle size={13} /> Send Reminder
                  </button>
                </div>
              )}
              {c.balance === 0 && (
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                    onClick={() => { setSelCust(c); setEntry({ amount: '', type: 'debit', note: '' }); setModal('entry'); }}>
                    <CreditCard size={13} /> Add Udhaar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {(modal === 'add-customer' || modal === 'edit-customer') && (
        <Modal title={modal === 'add-customer' ? "Add New Customer" : "Edit Customer"} onClose={() => { setModal(null); setNewCust({ name: '', phone: '', credit_limit: 15000 }); setSelCust(null); }}
          footer={<>
            <button className="btn btn-ghost" onClick={() => { setModal(null); setNewCust({ name: '', phone: '', credit_limit: 15000 }); setSelCust(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={modal === 'add-customer' ? handleAddCustomer : handleEditCustomer} disabled={saving}>
              {saving ? 'Saving...' : modal === 'add-customer' ? 'Add Customer' : 'Save Changes'}
            </button>
          </>}>
          <div className="form-group">
            <label>Customer Name *</label>
            <input placeholder="e.g. Ali Khan" value={newCust.name}
              onChange={e => setNewCust(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input placeholder="0300-1234567" value={newCust.phone}
              onChange={e => setNewCust(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Credit Limit (Rs.) *</label>
            <input type="number" min="0" placeholder="15000" value={newCust.credit_limit}
              onChange={e => setNewCust(f => ({ ...f, credit_limit: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Udhaar Entry Modal */}
      {modal === 'entry' && selCust && (
        <Modal title={`${entry.type === 'payment' ? 'Record Payment' : 'Add Udhaar'} — ${selCust.name}`}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className={`btn ${entry.type === 'payment' ? 'btn-primary' : 'btn-gold'}`}
              onClick={handleEntry} disabled={saving}>
              {saving ? 'Saving...' : entry.type === 'payment' ? '✅ Record Payment' : '📒 Add Udhaar'}
            </button>
          </>}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Balance</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold)' }}>
              {fmt(selCust.balance)}
            </div>
          </div>
          <div className="form-group">
            <label>Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['debit','payment'].map(t => (
                <button key={t} className={`pay-type-btn ${entry.type === t ? 'active' : ''}`}
                  onClick={() => setEntry(f => ({ ...f, type: t }))}>
                  {t === 'debit' ? '📒 Udhaar' : '💵 Payment'}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Amount (Rs.) *</label>
            <input type="number" min="0" placeholder="0" value={entry.amount}
              onChange={e => setEntry(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input placeholder="e.g. Monthly groceries" value={entry.note}
              onChange={e => setEntry(f => ({ ...f, note: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
