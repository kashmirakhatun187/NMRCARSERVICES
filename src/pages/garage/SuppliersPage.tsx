import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Truck, Plus, Edit2, Trash2, Star, Phone, Mail, Search, X } from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  payment_terms?: string;
  rating?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
};

const defaultForm = {
  name: '', contact_person: '', phone: '', email: '', address: '',
  gstin: '', payment_terms: 'net30', rating: 3, notes: '', is_active: true,
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`w-4 h-4 ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const openAdd = () => { setEditId(null); setForm({ ...defaultForm }); setError(''); setShowModal(true); };
  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ name: s.name, contact_person: s.contact_person ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', gstin: s.gstin ?? '', payment_terms: s.payment_terms ?? 'net30', rating: s.rating ?? 3, notes: s.notes ?? '', is_active: s.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Supplier name is required.'); return; }
    setSaving(true);
    const payload = { ...form, rating: Number(form.rating) };
    let err;
    if (editId) ({ error: err } = await supabase.from('suppliers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId));
    else ({ error: err } = await supabase.from('suppliers').insert(payload));
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(editId ? 'Supplier updated!' : 'Supplier added!');
    setShowModal(false);
    await fetchSuppliers();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    await fetchSuppliers();
  };

  const toggleActive = async (s: Supplier) => {
    await supabase.from('suppliers').update({ is_active: !s.is_active }).eq('id', s.id);
    await fetchSuppliers();
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').includes(search) ||
    (s.contact_person ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <DashboardLayout title="Suppliers" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-400" /> Suppliers
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>

        {success && <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No suppliers found.</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700/50">
                    {['Name', 'Contact Person', 'Phone', 'Email', 'GSTIN', 'Payment Terms', 'Rating', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{s.name}</p>
                        {s.address && <p className="text-gray-500 text-xs">{s.address}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{s.contact_person || '-'}</td>
                      <td className="px-4 py-3">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                            <Phone className="w-3 h-3" />{s.phone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {s.email ? (
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                            <Mail className="w-3 h-3" />{s.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">{s.gstin || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{s.payment_terms || '-'}</span>
                      </td>
                      <td className="px-4 py-3"><StarRating value={s.rating ?? 0} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(s)} className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${s.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="text-white font-semibold text-lg">{editId ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Supplier Name *</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Contact Person</label>
                    <input value={form.contact_person} onChange={e => f('contact_person', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Phone</label>
                    <input value={form.phone} onChange={e => f('phone', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Email</label>
                    <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">GSTIN</label>
                    <input value={form.gstin} onChange={e => f('gstin', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Payment Terms</label>
                    <select value={form.payment_terms} onChange={e => f('payment_terms', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="cod">COD</option>
                      <option value="net15">Net 15</option>
                      <option value="net30">Net 30</option>
                      <option value="net45">Net 45</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Address</label>
                    <textarea value={form.address} onChange={e => f('address', e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-2 block">Rating</label>
                    <StarRating value={form.rating} onChange={v => f('rating', v)} />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <label className="text-gray-400 text-xs font-medium">Active</label>
                    <button type="button" onClick={() => f('is_active', !form.is_active)} className={`w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Notes</label>
                    <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                    {saving ? 'Saving...' : editId ? 'Update' : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
