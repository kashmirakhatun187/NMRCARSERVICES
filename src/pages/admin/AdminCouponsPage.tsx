import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Coupon } from '../../lib/supabase';
import { CreditCard, Plus, Edit2, Trash2, X, CheckCircle, ToggleLeft, ToggleRight, Tag } from 'lucide-react';

const defaultForm = { code: '', description: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_discount: '', usage_limit: '', valid_from: new Date().toISOString().slice(0, 10), valid_until: '', is_active: true };

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm as any);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openAdd = () => { setEditId(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({ code: c.code, description: c.description, discount_type: c.discount_type, discount_value: c.discount_value, min_order_amount: c.min_order_amount, max_discount: c.max_discount ?? '', usage_limit: c.usage_limit ?? '', valid_from: (c.valid_from ?? new Date().toISOString()).slice(0, 10), valid_until: (c.valid_until ?? new Date().toISOString()).slice(0, 10), is_active: c.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until + 'T23:59:59').toISOString(),
      is_active: form.is_active,
    };
    let err;
    if (editId) ({ error: err } = await supabase.from('coupons').update(payload).eq('id', editId));
    else ({ error: err } = await supabase.from('coupons').insert(payload));
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(editId ? 'Coupon updated!' : 'Coupon created!');
    setShowModal(false);
    await fetchCoupons();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    await fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    await fetchCoupons();
  };

  const isExpired = (until: string) => new Date(until) < new Date();

  return (
    <DashboardLayout title="Coupons & Offers" variant="admin">
      <div className="p-4 sm:p-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Coupons ({coupons.length})</h2>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm">
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No coupons yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coupons.map(c => {
              const expired = isExpired(c.valid_until);
              return (
                <div key={c.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${!c.is_active || expired ? 'opacity-60 border-gray-100' : 'border-gray-200 hover:shadow-md'}`}>
                  <div className={`px-5 py-4 ${c.discount_type === 'percentage' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs font-medium mb-0.5 uppercase tracking-wider">Coupon Code</p>
                        <p className="text-white font-bold text-2xl font-mono tracking-wider">{c.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-2xl">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}</p>
                        <p className="text-white/70 text-xs">off</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    {c.description && <p className="text-gray-600 text-sm mb-3">{c.description}</p>}
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      {c.min_order_amount > 0 && <p>Min order: ₹{c.min_order_amount}</p>}
                      {c.max_discount && <p>Max discount: ₹{c.max_discount}</p>}
                      <p>Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''} times</p>
                      <p>Valid until: {new Date(c.valid_until).toLocaleDateString('en-IN')}</p>
                      {expired && <p className="text-red-500 font-medium">EXPIRED</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(c.id, c.is_active)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {c.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 ml-auto"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input required value={form.code} onChange={e => setForm((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 font-mono uppercase" placeholder="SAVE20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" placeholder="20% off on all services" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select value={form.discount_type} onChange={e => setForm((p: any) => ({ ...p, discount_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input required type="number" min="0" value={form.discount_value} onChange={e => setForm((p: any) => ({ ...p, discount_value: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                  <input type="number" min="0" value={form.min_order_amount} onChange={e => setForm((p: any) => ({ ...p, min_order_amount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                  <input type="number" min="0" value={form.max_discount} onChange={e => setForm((p: any) => ({ ...p, max_discount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                  <input required type="date" value={form.valid_from} onChange={e => setForm((p: any) => ({ ...p, valid_from: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                  <input required type="date" value={form.valid_until} onChange={e => setForm((p: any) => ({ ...p, valid_until: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                <input type="number" min="1" value={form.usage_limit} onChange={e => setForm((p: any) => ({ ...p, usage_limit: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" placeholder="Unlimited" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded text-red-600" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (editId ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
