import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Plus, X, Truck, Package, Eye } from 'lucide-react';

type Supplier = { id: string; name: string };
type POItem = { part_name: string; quantity: number; unit_price: number };

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  total: number;
  status: string;
  payment_status: string;
  notes?: string;
  suppliers?: { name: string };
};

const statusConfig: Record<string, string> = {
  draft:     'bg-gray-700 text-gray-300',
  sent:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  confirmed: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  received:  'bg-green-500/20 text-green-400 border border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const paymentConfig: Record<string, string> = {
  pending: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  partial: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  paid:    'bg-green-500/20 text-green-400 border border-green-500/30',
};

const emptyItem: POItem = { part_name: '', quantity: 1, unit_price: 0 };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '' });
  const [items, setItems] = useState<POItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchData = async () => {
    const [{ data: pos }, { data: sups }] = await Promise.all([
      supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    ]);
    setOrders(pos ?? []);
    setSuppliers(sups ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalAmount = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);

  const openCreate = () => {
    setForm({ supplier_id: suppliers[0]?.id ?? '', expected_date: '', notes: '' });
    setItems([{ ...emptyItem }]);
    setError('');
    setShowModal(true);
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof POItem, value: any) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) { setError('Please select a supplier.'); return; }
    if (items.some(i => !i.part_name.trim())) { setError('All items must have a name.'); return; }
    setSaving(true);
    const po_number = `PO-${Date.now().toString().slice(-8)}`;
    const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
      po_number,
      supplier_id: form.supplier_id,
      order_date: new Date().toISOString().split('T')[0],
      expected_date: form.expected_date || null,
      notes: form.notes,
      total: totalAmount,
      status: 'draft',
      payment_status: 'pending',
    }).select().single();
    if (poErr) { setError(poErr.message); setSaving(false); return; }
    const itemPayload = items.map(i => ({
      purchase_order_id: po.id,
      part_name: i.part_name,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total_price: Number(i.quantity) * Number(i.unit_price),
    }));
    await supabase.from('purchase_order_items').insert(itemPayload);
    setSuccess('Purchase order created!');
    setShowModal(false);
    await fetchData();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    await supabase.from('purchase_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchData();
    setUpdatingStatus(null);
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <DashboardLayout title="Purchase Orders" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-400" /> Purchase Orders
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{orders.length} total orders</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create PO
          </button>
        </div>

        {success && <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['draft','sent','confirmed','received','cancelled'].map(s => (
            <div key={s} className={`rounded-xl border p-3 ${s === 'draft' ? 'bg-gray-700/30 border-gray-600/30' : s === 'sent' ? 'bg-blue-500/10 border-blue-500/20' : s === 'confirmed' ? 'bg-yellow-500/10 border-yellow-500/20' : s === 'received' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-gray-400 text-xs capitalize">{s}</p>
              <p className={`text-2xl font-bold mt-1 ${s === 'draft' ? 'text-gray-300' : s === 'sent' ? 'text-blue-400' : s === 'confirmed' ? 'text-yellow-400' : s === 'received' ? 'text-green-400' : 'text-red-400'}`}>
                {orders.filter(o => o.status === s).length}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No purchase orders yet.</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700/50">
                    {['PO Number','Supplier','Order Date','Expected Date','Total','Status','Payment','Actions'].map(h => (
                      <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-blue-400 font-mono font-medium">{o.po_number}</td>
                      <td className="px-4 py-3 text-white">{o.suppliers?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{o.order_date}</td>
                      <td className="px-4 py-3 text-gray-300">{o.expected_date ?? '-'}</td>
                      <td className="px-4 py-3 text-white font-semibold">₹{Number(o.total).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          disabled={updatingStatus === o.id}
                          onChange={e => updateStatus(o.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${statusConfig[o.status] ?? 'bg-gray-700 text-gray-300'}`}
                        >
                          {['draft','sent','confirmed','received','cancelled'].map(s => (
                            <option key={s} value={s} className="bg-gray-800 text-white capitalize">{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentConfig[o.payment_status] ?? 'bg-gray-700 text-gray-300'}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setShowDetail(o)} className="text-gray-400 hover:text-blue-400 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-400" /> Create Purchase Order</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {error && <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Supplier *</label>
                    <select value={form.supplier_id} onChange={e => f('supplier_id', e.target.value)} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Expected Delivery Date</label>
                    <input type="date" value={form.expected_date} onChange={e => f('expected_date', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Notes</label>
                    <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium flex items-center gap-2"><Package className="w-4 h-4 text-blue-400" /> Order Items</h3>
                    <button type="button" onClick={addItem} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"><Plus className="w-4 h-4" /> Add Item</button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                      <span className="col-span-5">Part Name</span>
                      <span className="col-span-2">Qty</span>
                      <span className="col-span-3">Unit Price</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800/50 rounded-lg p-2">
                        <input value={item.part_name} onChange={e => updateItem(idx, 'part_name', e.target.value)} placeholder="Part name" className="col-span-5 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="col-span-2 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input type="number" min={0} step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="col-span-3 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-gray-300 text-xs font-medium">₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString('en-IN')}</span>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3 pt-3 border-t border-gray-700">
                    <div className="text-right">
                      <span className="text-gray-400 text-sm">Total Amount: </span>
                      <span className="text-white font-bold text-lg ml-2">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                    {saving ? 'Creating...' : 'Create PO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="text-white font-semibold">{showDetail.po_number}</h2>
                <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Supplier</span><span className="text-white">{showDetail.suppliers?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Order Date</span><span className="text-white">{showDetail.order_date}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Expected Date</span><span className="text-white">{showDetail.expected_date ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[showDetail.status]}`}>{showDetail.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentConfig[showDetail.payment_status]}`}>{showDetail.payment_status}</span></div>
                <div className="flex justify-between border-t border-gray-700 pt-3"><span className="text-gray-400 font-medium">Total</span><span className="text-white font-bold text-base">₹{Number(showDetail.total).toLocaleString('en-IN')}</span></div>
                {showDetail.notes && <div className="bg-gray-800 rounded-lg p-3 text-gray-300">{showDetail.notes}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
