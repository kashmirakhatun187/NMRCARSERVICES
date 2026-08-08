import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, SparePart } from '../../lib/supabase';
import { Package, Plus, Edit2, Trash2, X, AlertTriangle, Search, CheckCircle } from 'lucide-react';

const defaultForm = { name: '', part_number: '', category: 'general', description: '', quantity: 0, unit_price: 0, reorder_level: 5, supplier: '', location: '' };

export default function AdminPartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm as any);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const fetchParts = async () => {
    const { data } = await supabase.from('spare_parts').select('*').order('name');
    setParts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchParts(); }, []);

  const openAdd = () => { setEditId(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (p: SparePart) => { setEditId(p.id); setForm({ name: p.name, part_number: p.part_number, category: p.category, description: p.description, quantity: p.quantity, unit_price: p.unit_price, reorder_level: p.reorder_level, supplier: p.supplier, location: p.location }); setError(''); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, quantity: Number(form.quantity), unit_price: Number(form.unit_price), reorder_level: Number(form.reorder_level) };
    let err;
    if (editId) ({ error: err } = await supabase.from('spare_parts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId));
    else ({ error: err } = await supabase.from('spare_parts').insert(payload));
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(editId ? 'Part updated!' : 'Part added!');
    setShowModal(false);
    await fetchParts();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this spare part?')) return;
    await supabase.from('spare_parts').delete().eq('id', id);
    await fetchParts();
  };

  const filtered = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.part_number.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = parts.filter(p => p.quantity <= p.reorder_level);

  return (
    <DashboardLayout title="Spare Parts Inventory" variant="admin">
      <div className="p-4 sm:p-6">
        {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm"><CheckCircle className="w-4 h-4" />{success}</div>}
        {lowStock.length > 0 && <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5"><AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" /><p className="text-sm text-yellow-700 font-medium">{lowStock.length} part(s) below reorder level: {lowStock.map(p => p.name).join(', ')}</p></div>}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1"><Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" placeholder="Search parts..." /></div>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm shrink-0"><Plus className="w-4 h-4" />Add Part</button>
        </div>
        {loading ? <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Part Name', 'Part #', 'Category', 'Qty', 'Unit Price', 'Reorder Level', 'Supplier', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No parts found.</td></tr> :
                  filtered.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.quantity <= p.reorder_level ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.part_number}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">{p.category}</span></td>
                      <td className={`px-4 py-3 font-bold ${p.quantity <= p.reorder_level ? 'text-red-600' : 'text-gray-900'}`}>{p.quantity}</td>
                      <td className="px-4 py-3 text-gray-700">₹{p.unit_price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-500">{p.reorder_level}</td>
                      <td className="px-4 py-3 text-gray-500">{p.supplier || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b"><h3 className="font-bold text-gray-900">{editId ? 'Edit Part' : 'Add Spare Part'}</h3><button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label><input required value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label><input required value={form.part_number} onChange={e => setForm((p: any) => ({ ...p, part_number: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><input value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label><input value={form.supplier} onChange={e => setForm((p: any) => ({ ...p, supplier: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label><input required type="number" min="0" value={form.quantity} onChange={e => setForm((p: any) => ({ ...p, quantity: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label><input required type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm((p: any) => ({ ...p, unit_price: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label><input type="number" min="0" value={form.reorder_level} onChange={e => setForm((p: any) => ({ ...p, reorder_level: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label><input value={form.location} onChange={e => setForm((p: any) => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (editId ? 'Update' : 'Add Part')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
