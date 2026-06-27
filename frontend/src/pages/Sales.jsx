import { useEffect, useState, useCallback, useRef } from 'react';
import { getProducts, getCustomers, createSale, createCustomer } from '../api/api';
import { useToast } from '../context/ToastContext';
import { showConfirm } from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { Search, ShoppingCart, Trash2, CheckCircle, Printer, X, Tag, Banknote, BookOpen, CreditCard, Smartphone, Store, Receipt, UserPlus } from 'lucide-react';

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ sale, cart, shopName, onClose }) {
  const handlePrint = () => window.print();
  
  const formattedTime = sale.created_at
    ? (() => {
        try {
          // Convert database datetime format (YYYY-MM-DD HH:MM:SS) to standard ISO format
          const isoStr = sale.created_at.replace(' ', 'T') + 'Z';
          return new Date(isoStr).toLocaleString('en-PK', {
            dateStyle: 'medium',
            timeStyle: 'short'
          });
        } catch (e) {
          return new Date().toLocaleString('en-PK');
        }
      })()
    : new Date().toLocaleString('en-PK');

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={18} /> Sale Receipt</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="receipt" id="printable-receipt">
          <div className="receipt-header">
            <h2>{shopName}</h2>
            <p>Kiryana & General Store POS Receipt</p>
            <p style={{ fontWeight: 700, marginTop: 4, letterSpacing: '0.05em' }}>INVOICE: KP-{sale.id || 'N/A'}</p>
            <p style={{ marginTop: 2, fontSize: '0.72rem', color: '#555' }}>Date: {formattedTime}</p>
          </div>

          {sale.customerName && (
            <>
              <div className="receipt-row" style={{ color: '#333', fontSize: '0.78rem' }}>
                <span>Customer:</span>
                <span style={{ fontWeight: 700 }}>{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="receipt-row" style={{ color: '#555', fontSize: '0.75rem', marginTop: 1 }}>
                  <span>Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div className="receipt-divider" />
            </>
          )}

          <div style={{ marginBottom: 8, fontSize: '0.78rem', fontWeight: 700, borderBottom: '1px dashed #ccc', paddingBottom: 4 }}>ITEMS</div>

          {cart.map((item, i) => (
            <div key={i} className="receipt-row" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, color: '#111' }}>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '0.78rem', marginTop: 1 }}>
                <span>{item.quantity} × {fmt(item.selling_price)}</span>
                <span style={{ fontWeight: 600, color: '#222' }}>{fmt(item.selling_price * item.quantity)}</span>
              </div>
            </div>
          ))}

          <div className="receipt-divider" />

          <div className="receipt-row" style={{ color: '#555', fontSize: '0.85rem' }}>
            <span>Subtotal</span>
            <span>{fmt(sale.total + sale.discount)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="receipt-row" style={{ color: '#e53e3e', fontSize: '0.85rem' }}>
              <span>Discount</span>
              <span>- {fmt(sale.discount)}</span>
            </div>
          )}

          <div className="receipt-row bold" style={{ fontSize: '1.05rem', borderTop: '1px dashed #ccc', paddingTop: 6, marginTop: 4 }}>
            <span>GRAND TOTAL</span>
            <span>{fmt(sale.total)}</span>
          </div>

          <div className="receipt-divider" />
          
          <div className="receipt-row" style={{ color: '#555', fontSize: '0.8rem' }}>
            <span>Payment Mode</span>
            <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{sale.payType}</span>
          </div>

          {sale.payType === 'cash' && sale.cashReceived > 0 && (
            <>
              <div className="receipt-row" style={{ color: '#555', fontSize: '0.8rem', marginTop: 2 }}>
                <span>Cash Received</span>
                <span>{fmt(sale.cashReceived)}</span>
              </div>
              <div className="receipt-row bold" style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: 2 }}>
                <span>Change Given</span>
                <span>{fmt(Math.max(0, sale.cashReceived - sale.total))}</span>
              </div>
            </>
          )}

          {sale.payType === 'udhaar' && (
            <div className="receipt-row bold" style={{ color: '#e53e3e', fontSize: '0.8rem', justifyContent: 'center', marginTop: 6, border: '1px dashed #e53e3e', padding: '4px 0' }}>
              <span>** Debited to Udhaar Khata **</span>
            </div>
          )}

          <div className="receipt-footer" style={{ borderTop: '2px dashed #ccc', paddingTop: 10, marginTop: 12 }}>
            <p style={{ fontWeight: 600, color: '#333' }}>شکریہ — Thank you for your business!</p>
            <p style={{ fontSize: '0.68rem', marginTop: 4 }}>Goods once sold cannot be returned or exchanged.</p>
            <p style={{ fontSize: '0.65rem', marginTop: 2, color: '#aaa' }}>Powered by ShopMate KP 🏪</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sales/POS Page ──────────────────────────────────────────────────────
export default function Sales() {
  const toast = useToast();
  const searchRef = useRef(null);

  const [products,   setProducts]   = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [cart,       setCart]       = useState([]);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('All');
  const [payType,    setPayType]    = useState('cash');
  const [custId,     setCustId]     = useState('');
  const [cashIn,     setCashIn]     = useState('');      // cash received
  const [discount,   setDiscount]   = useState('');      // discount value
  const [discType,   setDiscType]   = useState('%');     // '%' or 'Rs'
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt,    setReceipt]    = useState(null);    // sale data for receipt
  const [shopName,   setShopName]   = useState(() => localStorage.getItem('shopName') || 'My Shop');
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCust, setNewCust]         = useState({ name: '', phone: '', credit_limit: 15000 });
  const [savingCust, setSavingCust]   = useState(false);

  const cats = ['All', 'General','Grocery','Dairy','Bakery','Beverages','Household',
    'Electronics','Clothing','Cosmetics','Medical','Hardware'];

  const load = useCallback(() =>
    Promise.all([getProducts(), getCustomers()])
      .then(([p, c]) => { setProducts(p.data); setCustomers(c.data); })
      .finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  const handleQuickAddCustomer = async () => {
    if (!newCust.name?.trim()) return toast('Customer name is required', 'error');

    const cleanPhone = (newCust.phone || '').replace(/[\s-]/g, '');
    if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
      return toast('Phone number must be a valid Pakistani mobile format (e.g., 0300-1234567)', 'error');
    }

    const limitVal = newCust.credit_limit !== undefined && newCust.credit_limit !== '' ? Number(newCust.credit_limit) : 15000;
    if (isNaN(limitVal) || limitVal <= 0) {
      return toast('Credit limit must be a positive number', 'error');
    }

    setSavingCust(true);
    try {
      const res = await createCustomer({ name: newCust.name.trim(), phone: newCust.phone.trim(), credit_limit: limitVal });
      toast('Customer registered! ✅');
      setShowAddCust(false);
      setNewCust({ name: '', phone: '', credit_limit: 15000 });
      
      const custRes = await getCustomers();
      setCustomers(custRes.data);
      setCustId(String(res.data.id));
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to add customer', 'error');
    } finally {
      setSavingCust(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        e.preventDefault();
        const p = filtered[0];
        if (p.stock > 0) {
          addToCart(p);
          setSearch('');
          toast(`Added "${p.name}" to cart 🛒`);
        } else {
          toast(`"${p.name}" is out of stock!`, 'error');
        }
      }
    }
  };

  // Derived values
  const filtered = products.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat  = catFilter === 'All' || p.category === catFilter;
    return matchName && matchCat;
  });

  const subtotal = cart.reduce((s, i) => s + i.selling_price * i.quantity, 0);
  const profitRaw = cart.reduce((s, i) => s + (i.selling_price - i.buying_price) * i.quantity, 0);

  const discountAmt = (() => {
    const v = parseFloat(discount) || 0;
    if (discType === '%') return Math.min(subtotal, (subtotal * v) / 100);
    return Math.min(subtotal, v);
  })();

  const total   = subtotal - discountAmt;
  const change  = cashIn ? parseFloat(cashIn) - total : 0;

  const addToCart = (product) => {
    if (product.stock === 0) return toast('Out of stock!', 'error');
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) {
        if (ex.quantity >= product.stock) { toast(`Max stock: ${product.stock}`, 'error'); return prev; }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id, name: product.name,
        selling_price: product.selling_price, buying_price: product.buying_price,
        stock: product.stock, quantity: 1,
      }];
    });
  };

  const updateQty = (id, delta) => setCart(prev =>
    prev.map(i => i.product_id === id
      ? { ...i, quantity: Math.max(1, Math.min(i.stock, i.quantity + delta)) }
      : i
    )
  );

  const setQty = (id, val) => {
    const qty = parseInt(val);
    if (isNaN(qty)) {
      setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: '' } : i));
      return;
    }
    setCart(prev =>
      prev.map(i => {
        if (i.product_id === id) {
          const targetQty = Math.max(1, Math.min(i.stock, qty));
          if (qty > i.stock) {
            toast(`Max stock available: ${i.stock}`, 'error');
          }
          return { ...i, quantity: targetQty };
        }
        return i;
      })
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.product_id !== id));

  const clearCart = async () => {
    if (cart.length === 0) return;
    const ok = await showConfirm({
      title: 'Clear Cart?',
      message: 'This will remove all items from the current sale.',
      confirmText: 'Clear Cart',
      icon: '🗑️',
      danger: true,
    });
    if (ok) { setCart([]); setDiscount(''); setCashIn(''); }
  };

  const handleSale = async () => {
    if (cart.length === 0) return toast('Add at least one product to the cart', 'error');
    if (payType === 'udhaar' && !custId) return toast('Select a customer for Udhaar sale', 'error');
    if (payType === 'udhaar' && custId) {
      const c = customers.find(x => String(x.id) === String(custId));
      if (c) {
        const remainingAllowance = c.credit_limit - c.balance;
        if (total > remainingAllowance) {
          return toast(`Credit limit exceeded for "${c.name}"! Available: ${fmt(remainingAllowance)}. Required: ${fmt(total)}.`, 'error');
        }
      }
    }
    if (payType === 'cash' && cashIn && parseFloat(cashIn) < total) {
      return toast(`Cash received (${fmt(cashIn)}) is less than total (${fmt(total)})`, 'error');
    }

    setSubmitting(true);
    try {
      const res = await createSale({
        items:        cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_type: payType,
        customer_id:  custId || null,
        discount:     discountAmt,
      });
      const createdSale = res.data?.sale;

      // Show receipt before clearing
      setReceipt({
        id: createdSale?.id || 'N/A',
        total,
        discount: discountAmt,
        payType,
        cashReceived: parseFloat(cashIn) || 0,
        customerName: custId ? customers.find(c => String(c.id) === String(custId))?.name : null,
        customerPhone: custId ? customers.find(c => String(c.id) === String(custId))?.phone : null,
        created_at: createdSale?.created_at || new Date().toISOString(),
      });

      toast('Sale completed! 🎉');
      await load();
    } catch (e) {
      toast(e.response?.data?.error || 'Sale failed. Check stock levels.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    setCart([]);
    setDiscount('');
    setCashIn('');
    setCustId('');
    setPayType('cash');
  };

  // Keyboard shortcut: "/" focuses search, Alt+C/U toggles payType, Ctrl+Enter executes checkout
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (document.activeElement === searchRef.current) {
          setSearch('');
          searchRef.current.blur();
        }
      }
      // Alt + C (or Alt + 1) -> Cash
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === '1')) {
        e.preventDefault();
        setPayType('cash');
        setCustId('');
      }
      // Alt + U (or Alt + 2) -> Udhaar
      if (e.altKey && (e.key === 'u' || e.key === 'U' || e.key === '2')) {
        e.preventDefault();
        setPayType('udhaar');
      }
      // Ctrl + Enter -> Complete checkout
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!submitting && cart.length > 0) {
          handleSale();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, payType, custId, cashIn, total, submitting, customers, discountAmt]);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading POS...</span></div>;

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={20} color="var(--accent)" /> Sales / POS</h2>
          <p>
            Press <span className="kbd">/</span> to search &nbsp;·&nbsp;
            <span className="kbd">Esc</span> to clear
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
          </span>
          {cart.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clearCart}>
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="pos-layout">
        {/* ── Left Column: Search, Categories, Grid & Cart ── */}
        <div className="pos-products" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* 1. Search Bar Header */}
          <div className="pos-products-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div className="search-bar" style={{ flex: 1, position: 'relative', maxWidth: 'none' }}>
              <Search size={15} />
              <input
                ref={searchRef}
                placeholder='Search products... (press "/" to focus)'
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {filtered.length} found
            </span>
          </div>

          {/* 2. Horizontal Categories Row */}
          <div className="categories-row" style={{ display: 'flex', gap: 8, padding: '8px 20px', overflowX: 'auto', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-surface)', flexShrink: 0 }}>
            {cats.map(cat => (
              <button
                key={cat}
                className={`cat-pill ${catFilter === cat ? 'active' : ''}`}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: catFilter === cat ? 'var(--accent)' : 'var(--bg-card)',
                  color: catFilter === cat ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 3. Compact Product Grid (Scrollable) */}
          <div className="products-grid-pos" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
            gap: 10,
            padding: '12px 20px',
            maxHeight: 180,
            overflowY: 'auto',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0
          }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                No products found
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  className={`product-tile-compact ${p.stock === 0 ? 'out-of-stock' : ''}`}
                  onClick={() => p.stock > 0 && addToCart(p)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px',
                    cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                    opacity: p.stock === 0 ? 0.5 : 1,
                    transition: 'var(--transition)',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', marginTop: 4 }}>
                    {fmt(p.selling_price)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{p.category}</span>
                    <span style={{
                      color: p.stock === 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--gold)' : 'var(--text-muted)',
                      fontWeight: p.stock <= 5 ? 700 : 400
                    }}>
                      {p.stock === 0 ? 'Out' : `${p.stock} left`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 4. Cart Items Header */}
          <div className="cart-header" style={{ borderBottom: '1px solid var(--border)', padding: '12px 20px', background: 'var(--bg-surface)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <ShoppingCart size={16} />
            <span>Items List</span>
            {cart.length > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                {cart.length}
              </span>
            )}
          </div>

          {/* 5. Cart Items Table */}
          {cart.length === 0 ? (
            <div className="cart-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: 40 }}>
              <ShoppingCart size={48} />
              <p style={{ marginTop: 12, fontSize: '0.95rem', fontWeight: 600 }}>Cart is empty</p>
              <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Click on products above or search to add items</p>
            </div>
          ) : (
            <div className="cart-items" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }} className="cart-table-row">
                      <td style={{ padding: '14px 8px', textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: 2 }}>
                          Profit: +{fmt((item.selling_price - item.buying_price) * item.quantity)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {fmt(item.selling_price)}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button className="qty-btn" style={{ width: 28, height: 28, borderRadius: 6, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateQty(item.product_id, -1)}>−</button>
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={e => setQty(item.product_id, e.target.value)}
                            onBlur={() => {
                              if (item.quantity === '' || item.quantity <= 0) {
                                setQty(item.product_id, '1');
                              }
                            }}
                            style={{
                              width: 54,
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              padding: '2px 0',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <button className="qty-btn" style={{ width: 28, height: 28, borderRadius: 6, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateQty(item.product_id, 1)}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent)' }}>
                        {fmt(item.selling_price * item.quantity)}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                        <button onClick={() => removeItem(item.product_id)}
                          style={{ color: 'var(--danger)', background: 'none', cursor: 'pointer', opacity: 0.7, padding: 4 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right Column: Sticky Checkout Panel ── */}
        <div className="pos-cart" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="cart-header" style={{ flexShrink: 0 }}>
            <CheckCircle size={18} style={{ color: 'var(--accent)' }} /> Checkout Summary
          </div>
          
          <div className="checkout-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: 16 }}>
            {/* 1. Summary Card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Order Summary</div>
              
              <div className="total-row" style={{ marginBottom: 4, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              
              <div className="discount-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Tag size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <div className="discount-input-wrap" style={{ flex: 1, display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  <input
                    type="number" min="0" placeholder="Discount"
                    value={discount} onChange={e => setDiscount(e.target.value)}
                    style={{ border: 'none', padding: '4px 8px', fontSize: '0.8rem', background: 'transparent', flex: 1 }}
                  />
                  <div className="discount-type-toggle" style={{ display: 'flex', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>
                    {['%','Rs'].map(t => (
                      <button key={t} className={discType === t ? 'active' : ''}
                        onClick={() => setDiscType(t)}
                        style={{
                          padding: '0 6px', fontSize: '0.72rem', fontWeight: 600,
                          background: discType === t ? 'var(--accent)' : 'transparent',
                          color: discType === t ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'var(--transition)'
                        }}>{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {discountAmt > 0 && (
                <div className="total-row" style={{ marginBottom: 4, fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--gold)' }}>Discount</span>
                  <span style={{ color: 'var(--gold)' }}>− {fmt(discountAmt)}</span>
                </div>
              )}

              <div className="total-row" style={{ marginBottom: 8, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Profit</span>
                <span style={{ color: 'var(--accent)' }}>+{fmt(Math.max(0, profitRaw - discountAmt))}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>TOTAL</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>{fmt(total)}</span>
              </div>
            </div>

            {/* 2. Payment details Card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Payment Details</div>
              
              <div className="payment-type-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                {[
                  { key: 'cash',   icon: <Banknote size={14} />, label: 'Cash' },
                  { key: 'udhaar', icon: <BookOpen size={14} />, label: 'Udhaar' },
                  { key: 'card',   icon: <CreditCard size={14} />, label: 'Card' },
                  { key: 'online', icon: <Smartphone size={14} />, label: 'Online' },
                ].map(t => (
                  <button key={t.key} className={`pay-type-btn ${payType === t.key ? 'active' : ''}`}
                    onClick={() => { setPayType(t.key); if (t.key !== 'udhaar') setCustId(''); }}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 4, 
                      padding: '6px 2px', 
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: payType === t.key ? 'var(--accent)' : 'var(--border)',
                      background: payType === t.key ? 'var(--accent-glow)' : 'var(--bg-surface)',
                      color: payType === t.key ? 'var(--accent)' : 'var(--text-secondary)'
                    }}>
                    {t.icon}
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Cash calculator */}
              {payType === 'cash' && (
                <div className="cash-calc" style={{ marginTop: 6 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cash Received</label>
                  <input type="number" min="0" placeholder={`Enter amount ≥ ${fmt(total)}`}
                    value={cashIn} onChange={e => setCashIn(e.target.value)} 
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }} />
                  
                  {/* Quick-cash denomination buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <button
                      className="denom-btn"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: 'var(--accent)'
                      }}
                      onClick={() => setCashIn(total.toFixed(0))}
                    >
                      Exact
                    </button>
                    {[100, 500, 1000, 5000].map(val => (
                      <button
                        key={val}
                        className="denom-btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: 'var(--text-secondary)'
                        }}
                        onClick={() => setCashIn(val.toString())}
                      >
                        Rs. {val}
                      </button>
                    ))}
                  </div>
                  {cashIn && (
                    <div className="change-display" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Change Due</span>
                      <span className={`change-val ${change < 0 ? 'negative' : ''}`} style={{ fontWeight: 700, color: change < 0 ? 'var(--danger)' : 'var(--accent)', fontSize: '0.85rem' }}>
                        {change < 0 ? `⚠️ Short ${fmt(Math.abs(change))}` : fmt(Math.max(0, change))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Udhaar customer selector */}
              {payType === 'udhaar' && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Customer</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select value={custId} onChange={e => setCustId(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}>
                      <option value="">— Select Customer —</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.balance > 0 ? ` (owes ${fmt(c.balance)})` : ''}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', borderRadius: 6 }} title="Quick Register Customer"
                      onClick={() => setShowAddCust(true)}>
                      <UserPlus size={14} />
                    </button>
                  </div>
                  {custId && (() => {
                    const c = customers.find(x => String(x.id) === String(custId));
                    if (!c) return null;
                    const remainingAllowance = c.credit_limit - c.balance;
                    const isExceeded = total > remainingAllowance;
                    const usedPercent = Math.min(100, Math.max(0, (c.balance / c.credit_limit) * 100));
                    
                    return (
                      <div style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 8,
                        background: 'var(--bg-surface)',
                        border: `1px solid ${isExceeded ? 'var(--danger)' : 'var(--border)'}`,
                        fontSize: '0.78rem',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <span>👤 {c.name}</span>
                          {c.phone && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{c.phone}</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Outstanding Udhaar:</span>
                          <span style={{ fontWeight: 600, color: c.balance > 0 ? 'var(--gold)' : 'var(--accent)' }}>{fmt(c.balance)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Credit Limit:</span>
                          <span style={{ fontWeight: 600 }}>{fmt(c.credit_limit)}</span>
                        </div>
                        
                        {/* Utilization progress bar */}
                        <div style={{ margin: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                            <span>Credit Used</span>
                            <span>{usedPercent.toFixed(0)}%</span>
                          </div>
                          <div style={{ background: 'var(--border)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              background: usedPercent > 90 ? 'var(--danger)' : usedPercent > 70 ? 'var(--gold)' : 'var(--accent)',
                              width: `${usedPercent}%`,
                              height: '100%',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                          <span style={{ color: isExceeded ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>Allowance Left:</span>
                          <span style={{ color: isExceeded ? 'var(--danger)' : 'var(--accent)', fontWeight: 700 }}>{fmt(remainingAllowance)}</span>
                        </div>
                        {isExceeded && (
                          <div style={{ color: 'var(--danger)', marginTop: 6, fontWeight: 700, fontSize: '0.75rem' }}>
                            ⚠️ Credit limit exceeded by {fmt(total - remainingAllowance)}!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* 3. Sticky Action Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', borderRadius: 8 }}
              onClick={handleSale}
              disabled={submitting || cart.length === 0}
            >
              <CheckCircle size={16} />
              {submitting ? 'Processing…' : `Complete Sale — ${fmt(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <ReceiptModal
          sale={receipt}
          cart={cart}
          shopName={shopName}
          onClose={closeReceipt}
        />
      )}

      {/* Quick Add Customer Modal */}
      {showAddCust && (
        <Modal title="Quick Register Customer" onClose={() => setShowAddCust(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setShowAddCust(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleQuickAddCustomer} disabled={savingCust}>
              {savingCust ? 'Saving...' : 'Add Customer'}
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
    </div>
  );
}
