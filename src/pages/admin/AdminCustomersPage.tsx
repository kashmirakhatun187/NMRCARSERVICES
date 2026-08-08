import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Customer } from '../../lib/supabase';
import {
  Users, Plus, Search, Edit2, Trash2, X, Phone, Mail, MapPin, Car, Save, AlertCircle
} from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '',
    gstin: '', vehicle_number: '', vehicle_make: '', vehicle_model: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ full_name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', vehicle_number: '', vehicle_make: '', vehicle_model: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ full_name: c.full_name, phone: c.phone, email: c.email ?? '', address: c.address, city: c.city, state: c.state, pincode: c.pincode, gstin: c.gstin, vehicle_number: c.vehicle_number, vehicle_make: c.vehicle_make, vehicle_model: c.vehicle_model, notes: c.notes });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.full_name || !form.phone) { setError('Name and phone are required.'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('customers').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('customers').insert(form);
      if (error) setError(error.message);
    }
    setSaving(false);
    if (!error) { setShowModal(false); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    await supabase.from('customers').delete().eq('id', id);
    load();
  };

  return (
    <DashboardLayout title="Customers" variant="admin">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage all customer details. New bookings auto-create records.</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, phone, or email..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500" />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No customers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{c.full_name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone className="w-3.5 h-3.5 text-gray-400" /> {c.phone}</p>
                  {c.email && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {c.email}</p>}
                  {c.address && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {c.address}</p>}
                  {c.vehicle_number && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Car className="w-3.5 h-3.5 text-gray-400" /> {c.vehicle_make} {c.vehicle_model} ({c.vehicle_number})</p>}
                  {c.gstin && <p className="text-xs text-gray-400 dark:text-gray-500">GSTIN: {c.gstin}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="font-bold text-gray-900 dark:text-white">{editing ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl px-4 py-2.5 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSTIN</label>
                  <input type="text" value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                  <input type="text" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Make</label>
                  <input type="text" value={form.vehicle_make} onChange={e => setForm(p => ({ ...p, vehicle_make: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Model</label>
                  <input type="text" value={form.vehicle_model} onChange={e => setForm(p => ({ ...p, vehicle_model: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Number</label>
                  <input type="text" value={form.vehicle_number} onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
