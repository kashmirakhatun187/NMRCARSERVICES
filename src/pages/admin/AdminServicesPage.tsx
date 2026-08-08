import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Service } from '../../lib/supabase';
import { Wrench, Plus, Edit2, Trash2, X, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const categories = ['general', 'periodic', 'repair', 'wash', 'inspection', 'tyres', 'ac', 'electrical', 'bodywork', 'other'];
const defaultForm = { name: '', description: '', category: 'general', base_price: 0, duration_minutes: 60, image_url: '', is_active: true };

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm as any);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*').order('category');
    if (error) { setServices([]); }
    else setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openAdd = () => { setEditId(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (s: Service) => { setEditId(s.id); setForm({ name: s.name, description: s.description, category: s.category, base_price: s.base_price, duration_minutes: s.duration_minutes, image_url: s.image_url, is_active: s.is_active }); setError(''); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, base_price: Number(form.base_price), duration_minutes: Number(form.duration_minutes) };
    let err;
    if (editId) ({ error: err } = await supabase.from('services').update(payload).eq('id', editId));
    else ({ error: err } = await supabase.from('services').insert(payload));
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(editId ? 'Service updated!' : 'Service added!');
    setShowModal(false);
    await fetchServices();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('services').update({ is_active: !current }).eq('id', id);
    if (error) { alert('Failed: ' + error.message); return; }
    await fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { alert('Failed to delete: ' + error.message); return; }
    await fetchServices();
  };

  return (
    <DashboardLayout title="Service Management" variant="admin">
      <div className="p-4 sm:p-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Services ({services.length})</h2>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(s => (
              <div key={s.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${s.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                {s.image_url && <div className="h-36 overflow-hidden"><img src={s.image_url} alt={s.name} className="w-full h-full object-cover" /></div>}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    <span className="font-bold text-red-600 text-lg">₹{s.base_price.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">{s.category}</span>
                    <span className="text-xs text-gray-400">{s.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(s.id, s.is_active)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${s.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                      {s.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-auto"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input required value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" placeholder="Full Service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white capitalize">
                    {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹) *</label>
                  <input required type="number" min="0" value={form.base_price} onChange={e => setForm((p: any) => ({ ...p, base_price: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input type="number" min="15" step="15" value={form.duration_minutes} onChange={e => setForm((p: any) => ({ ...p, duration_minutes: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input value={form.image_url} onChange={e => setForm((p: any) => ({ ...p, image_url: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" placeholder="https://images.pexels.com/..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded text-red-600" />
                <span className="text-sm text-gray-700">Active (visible to customers)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (editId ? 'Update' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
