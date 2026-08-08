import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

interface Warranty {
  id: string;
  vehicle_id: string;
  part_name: string;
  provider: string;
  warranty_number: string | null;
  purchase_date: string;
  expiry_date: string;
  coverage_description: string | null;
  vehicles: Vehicle;
}

type WarrantyStatus = 'active' | 'expiring' | 'expired';

const getStatus = (expiryDate: string): WarrantyStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'active';
};

const getDaysRemaining = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const statusConfig = {
  active: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    border: 'border-green-400',
    label: 'Active',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  expiring: {
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    border: 'border-yellow-400',
    label: 'Expiring Soon',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  expired: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    border: 'border-red-500',
    label: 'Expired',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const defaultForm = {
  vehicle_id: '',
  part_name: '',
  provider: '',
  warranty_number: '',
  purchase_date: '',
  expiry_date: '',
  coverage_description: '',
};

export default function WarrantyPage() {
  const { user } = useAuth();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [warrantiesRes, vehiclesRes] = await Promise.all([
        supabase
          .from('warranties')
          .select('*, vehicles(id, make, model, license_plate)')
          .eq('user_id', user.id)
          .order('expiry_date', { ascending: true }),
        supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .eq('user_id', user.id),
      ]);
      if (warrantiesRes.error) throw warrantiesRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      setWarranties(warrantiesRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load warranties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const openEdit = (w: Warranty) => {
    setEditingWarranty(w);
    setForm({
      vehicle_id: w.vehicle_id,
      part_name: w.part_name,
      provider: w.provider,
      warranty_number: w.warranty_number || '',
      purchase_date: w.purchase_date,
      expiry_date: w.expiry_date,
      coverage_description: w.coverage_description || '',
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingWarranty(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        vehicle_id: form.vehicle_id || null,
        part_name: form.part_name,
        provider: form.provider,
        warranty_number: form.warranty_number || null,
        purchase_date: form.purchase_date,
        expiry_date: form.expiry_date,
        coverage_description: form.coverage_description || null,
      };
      if (editingWarranty) {
        const { error } = await supabase.from('warranties').update(payload).eq('id', editingWarranty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('warranties').insert(payload);
        if (error) throw error;
      }
      setShowModal(false);
      setForm(defaultForm);
      setEditingWarranty(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save warranty');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warranty?')) return;
    try {
      const { error } = await supabase.from('warranties').delete().eq('id', id);
      if (error) throw error;
      setWarranties((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <DashboardLayout variant="customer" title="Warranty Tracking">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Warranty Tracking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage warranties for all your vehicle parts</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Add Warranty
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-40" />
            ))}
          </div>
        ) : warranties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No warranties tracked</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Add warranty details to get expiry reminders.</p>
            <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Warranty
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranties.map((w) => {
              const status = getStatus(w.expiry_date);
              const daysLeft = getDaysRemaining(w.expiry_date);
              const cfg = statusConfig[status];
              return (
                <div key={w.id} className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 ${cfg.border} border-t border-r border-b border-slate-200 dark:border-slate-700 p-5 shadow-sm`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{w.part_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{w.provider}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  {w.vehicles && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      🚗 {w.vehicles.make} {w.vehicles.model} — {w.vehicles.license_plate}
                    </p>
                  )}
                  {w.warranty_number && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      # {w.warranty_number}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Purchased: {new Date(w.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Expires: {new Date(w.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-sm font-semibold ${status === 'expired' ? 'text-red-500' : status === 'expiring' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                      {status === 'expired'
                        ? `Expired ${Math.abs(daysLeft)} days ago`
                        : `${daysLeft} days remaining`}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(w)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(w.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {w.coverage_description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 border-t border-slate-100 dark:border-slate-700 pt-2">
                      {w.coverage_description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingWarranty ? 'Edit Warranty' : 'Add Warranty'}
              </h2>
              <button onClick={() => { setShowModal(false); setForm(defaultForm); setEditingWarranty(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.license_plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Part Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. Battery, Tyres, Engine" value={form.part_name} onChange={(e) => setForm({ ...form, part_name: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. Maruti Suzuki, Bosch" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty Number</label>
                <input type="text" placeholder="e.g. WRN-2024-001234" value={form.warranty_number} onChange={(e) => setForm({ ...form, warranty_number: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coverage Description</label>
                <textarea rows={3} placeholder="What is covered under this warranty..." value={form.coverage_description} onChange={(e) => setForm({ ...form, coverage_description: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(defaultForm); setEditingWarranty(null); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? 'Saving...' : editingWarranty ? 'Update' : 'Add Warranty'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
