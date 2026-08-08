import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string | null;
  open_time: string;
  close_time: string;
  is_active: boolean;
  manager_name?: string | null;
  manager_phone?: string | null;
  created_at: string;
}

interface BranchForm {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  open_time: string;
  close_time: string;
  is_active: boolean;
  manager_name: string;
  manager_phone: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultForm: BranchForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
  open_time: '09:00',
  close_time: '21:00',
  is_active: true,
  manager_name: '',
  manager_phone: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12h(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBranches = async () => {
    try {
      const { data, error: err } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setBranches(data ?? []);
    } catch (e: any) {
      console.error('Failed to fetch branches:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      pincode: b.pincode,
      phone: b.phone,
      email: b.email,
      gstin: b.gstin ?? '',
      open_time: b.open_time,
      close_time: b.close_time,
      is_active: b.is_active,
      manager_name: b.manager_name ?? '',
      manager_phone: b.manager_phone ?? '',
    });
    setError('');
    setShowModal(true);
  };

  const handleField = (field: keyof BranchForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gstin: form.gstin.trim() || null,
      open_time: form.open_time,
      close_time: form.close_time,
      is_active: form.is_active,
      manager_name: form.manager_name.trim() || null,
      manager_phone: form.manager_phone.trim() || null,
    };

    try {
      let err;
      if (editId) {
        ({ error: err } = await supabase.from('branches').update(payload).eq('id', editId));
      } else {
        ({ error: err } = await supabase.from('branches').insert(payload));
      }
      if (err) throw err;

      setSuccess(editId ? 'Branch updated!' : 'Branch created!');
      setShowModal(false);
      await fetchBranches();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from('branches')
        .update({ is_active: !current })
        .eq('id', id);
      if (err) throw err;
      await fetchBranches();
    } catch (e: any) {
      console.error('Toggle failed:', e.message);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) return;
    try {
      const { error: err } = await supabase.from('branches').delete().eq('id', id);
      if (err) throw err;
      await fetchBranches();
      setSuccess('Branch deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      console.error('Delete failed:', e.message);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.is_active).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Branch Management" variant="admin">
      <div className="p-4 sm:p-6">

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl px-4 py-3 mb-5 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total Branches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalBranches}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Active Branches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeBranches}</p>
            </div>
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            All Branches
            {!loading && (
              <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
                ({totalBranches})
              </span>
            )}
          </h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Branch
          </button>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-100 dark:bg-slate-700 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : branches.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-gray-300 dark:text-slate-500" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-1">No branches yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-5 max-w-xs">
              Add your first branch to start managing locations, hours, and staff.
            </p>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          </div>
        ) : (
          /* Branch cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map(b => (
              <div
                key={b.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden shadow-sm transition-all ${
                  b.is_active
                    ? 'border-gray-200 dark:border-slate-700 hover:shadow-md'
                    : 'opacity-60 border-gray-100 dark:border-slate-700'
                }`}
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight truncate">
                        {b.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{b.city}</p>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      b.is_active
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-slate-700 mx-5" />

                {/* Card body */}
                <div className="px-5 py-4 space-y-3">
                  {/* Address block */}
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <p>{b.address}</p>
                      <p>{b.city}, {b.state} – {b.pincode}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{b.phone}</span>
                  </div>

                  {/* Hours */}
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {fmt12h(b.open_time)} – {fmt12h(b.close_time)}
                    </span>
                  </div>

                  {/* Manager */}
                  {(b.manager_name || b.manager_phone) && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 font-medium uppercase tracking-wide">
                        Manager
                      </p>
                      {b.manager_name && (
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {b.manager_name}
                        </p>
                      )}
                      {b.manager_phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{b.manager_phone}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="px-5 pb-4 flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(b.id, b.is_active)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      b.is_active
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {b.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {b.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      title="Edit branch"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-slate-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  {editId ? 'Edit Branch' : 'New Branch'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {/* Branch Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => handleField('name', e.target.value)}
                  placeholder="e.g. Koramangala Branch"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={e => handleField('address', e.target.value)}
                  placeholder="Street / building / area"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 resize-none transition-colors"
                />
              </div>

              {/* City / State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.city}
                    onChange={e => handleField('city', e.target.value)}
                    placeholder="Bangalore"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.state}
                    onChange={e => handleField('state', e.target.value)}
                    placeholder="Karnataka"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Pincode / Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.pincode}
                    onChange={e => handleField('pincode', e.target.value)}
                    placeholder="560034"
                    maxLength={10}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={e => handleField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleField('email', e.target.value)}
                  placeholder="branch@example.com"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GSTIN
                </label>
                <input
                  value={form.gstin}
                  onChange={e => handleField('gstin', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 font-mono uppercase transition-colors"
                />
              </div>

              {/* Open / Close time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={form.open_time}
                    onChange={e => handleField('open_time', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={form.close_time}
                    onChange={e => handleField('close_time', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Manager info */}
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Manager (optional)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      value={form.manager_name}
                      onChange={e => handleField('manager_name', e.target.value)}
                      placeholder="Ravi Kumar"
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.manager_phone}
                      onChange={e => handleField('manager_phone', e.target.value)}
                      placeholder="+91 99999 00000"
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => handleField('is_active', e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 border-gray-300 dark:border-slate-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Branch is active</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center transition-colors"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editId ? (
                    'Update Branch'
                  ) : (
                    'Create Branch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
