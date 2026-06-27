import { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/api';
import { useToast } from '../context/ToastContext';
import { showConfirm } from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { Plus, Search, Pencil, Trash2, Package, ArrowUp } from 'lucide-react';

const CATEGORIES = ['General','Grocery','Dairy','Bakery','Beverages','Household',
  'Electronics','Clothing','Cosmetics','Medical','Hardware','Other'];

function fmt(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

const emptyForm = { name: '', category: 'General', buying_price: '', selling_price: '', stock: '' };

export default function Products() {
  const toast             = useToast();
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [sortBy, setSortBy]         = useState('name');
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [restockId, setRestockId]   = useState(null);
  const [restockQty, setRestockQty] = useState('');

  const load = () => getProducts().then(r => setProducts(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const sorted = [...products]
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = catFilter === 'All' || p.category === catFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'stock')  return a.stock - b.stock;
      if (sortBy === 'profit') return (b.selling_price - b.buying_price) - (a.selling_price - a.buying_price);
      if (sortBy === 'price')  return b.selling_price - a.selling_price;
      return 0;
    });

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModal('form'); };
  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category,
      buying_price: p.buying_price, selling_price: p.selling_price, stock: p.stock });
    setEditId(p.id); setModal('form');
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return toast('Product name is required', 'error');
    if (form.selling_price === undefined || form.selling_price === null || form.selling_price === '')
      return toast('Selling price is required', 'error');
    if (parseFloat(form.selling_price) <= 0)
      return toast('Selling price must be greater than 0', 'error');
    if (form.buying_price && parseFloat(form.buying_price) < 0)
      return toast('Buying price cannot be negative', 'error');
    if (form.buying_price && parseFloat(form.selling_price) <= parseFloat(form.buying_price))
      return toast('Selling price must be greater than buying price', 'error');
    if (form.stock && parseInt(form.stock) < 0)
      return toast('Stock cannot be negative', 'error');

    setSaving(true);
    try {
      if (editId) { await updateProduct(editId, form); toast('Product updated ✅'); }
      else         { await createProduct(form);         toast('Product added ✅'); }
      setModal(null); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    const ok = await showConfirm({
      title: `Delete "${name}"?`,
      message: 'This product and its data will be permanently removed.',
      confirmText: 'Delete',
      icon: '🗑️',
      danger: true,
    });
    if (!ok) return;
    try { await deleteProduct(id); toast('Product deleted'); load(); }
    catch { toast('Failed to delete', 'error'); }
  };

  const handleRestock = async () => {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) return toast('Enter a valid quantity', 'error');
    const p = products.find(x => x.id === restockId);
    if (!p) return;
    setSaving(true);
    try {
      await updateProduct(restockId, { ...p, stock: p.stock + qty });
      toast(`Restocked ${p.name} +${qty} units ✅`);
      setRestockId(null); setRestockQty(''); load();
    } catch { toast('Restock failed', 'error'); }
    finally { setSaving(false); }
  };

  const stockClass = (s) => s === 0 ? 'stock-empty' : s <= 5 ? 'stock-low' : 'stock-good';
  const profitPerUnit = (p) => (p.selling_price - p.buying_price).toFixed(0);
  const margin = (p) => p.selling_price > 0
    ? (((p.selling_price - p.buying_price) / p.selling_price) * 100).toFixed(0) + '%'
    : '0%';

  // Summary stats
  const lowStockCount  = products.filter(p => p.stock <= 5).length;
  const totalValue     = products.reduce((s, p) => s + p.selling_price * p.stock, 0);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading products…</span></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={20} color="var(--accent)" /> Products</h2>
          <p>
            {products.length} products · Inventory value: <strong style={{ color: 'var(--accent)' }}>{fmt(totalValue)}</strong>
            {lowStockCount > 0 && <span className="notif-dot" title={`${lowStockCount} low stock`} />}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>

      {/* Summary row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Products',  val: products.length,                           color: 'blue' },
          { label: 'Inventory Value', val: fmt(totalValue),                            color: 'green' },
          { label: 'Low Stock Items', val: products.filter(p => p.stock <= 5).length, color: 'red' },
          { label: 'Out of Stock',    val: products.filter(p => p.stock === 0).length, color: 'red' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.color}`}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={16} />
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Low Stock</option>
          <option value="profit">Sort: Profit</option>
          <option value="price">Sort: Price</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Buy Price</th>
              <th>Sell Price</th><th>Profit / Unit</th><th>Margin</th>
              <th>Stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state"><Package size={40} /><h3>No products found</h3></div>
              </td></tr>
            ) : sorted.map(p => (
              <tr key={p.id}>
                <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                <td><span className="badge badge-blue">{p.category}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{fmt(p.buying_price)}</td>
                <td style={{ fontWeight: 600 }}>{fmt(p.selling_price)}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>+{fmt(profitPerUnit(p))}</td>
                <td><span className="badge badge-green">{margin(p)}</span></td>
                <td>
                  <span className={`${stockClass(p.stock)}`} style={{ fontWeight: 700 }}>
                    {p.stock === 0 ? '⛔ Out' : p.stock <= 5 ? `⚠️ ${p.stock}` : p.stock}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => { setRestockId(p.id); setRestockQty(''); setModal('restock'); }}
                      title="Restock">
                      <ArrowUp size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal === 'form' && (
        <Modal title={editId ? 'Edit Product' : 'Add New Product'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Product'}
            </button>
          </>}>
          <div className="form-group">
            <label>Product Name *</label>
            <input placeholder="e.g. Milk (1L)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Buying Price (Rs.)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.buying_price}
                onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Selling Price (Rs.) *</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.selling_price}
                onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" min="0" placeholder="0" value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
          {form.buying_price && form.selling_price && (
            <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem' }}>
              💰 Profit per unit: <strong style={{ color: 'var(--accent)' }}>
                Rs. {(parseFloat(form.selling_price) - parseFloat(form.buying_price)).toFixed(0)}
              </strong>{' '}
              ({form.selling_price > 0
                ? (((parseFloat(form.selling_price) - parseFloat(form.buying_price)) / parseFloat(form.selling_price)) * 100).toFixed(0)
                : 0}% margin)
            </div>
          )}
        </Modal>
      )}

      {/* Restock Modal */}
      {modal === 'restock' && (
        <Modal title={`Restock: ${products.find(p => p.id === restockId)?.name}`}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRestock} disabled={saving}>
              <ArrowUp size={14} /> Add Stock
            </button>
          </>}>
          <div style={{ marginBottom: 14, background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Stock</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>
              {products.find(p => p.id === restockId)?.stock} units
            </div>
          </div>
          <div className="form-group">
            <label>Units to Add</label>
            <input type="number" min="1" placeholder="e.g. 50" value={restockQty} autoFocus
              onChange={e => setRestockQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRestock()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
