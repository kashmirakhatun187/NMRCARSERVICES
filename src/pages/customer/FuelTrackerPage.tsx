import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Fuel,
  Plus,
  TrendingDown,
  TrendingUp,
  Car,
  Trash2,
  BarChart2,
  X,
} from 'lucide-react';

type FuelType = 'petrol' | 'diesel' | 'cng' | 'electric';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

interface FuelExpense {
  id: string;
  vehicle_id: string;
  date: string;
  fuel_type: FuelType;
  quantity_liters: number;
  price_per_liter: number;
  total_amount: number;
  odometer: number | null;
  fuel_station: string | null;
  notes: string | null;
  vehicles: Vehicle;
}

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
};

const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  petrol: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  diesel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cng: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  electric: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const defaultForm = {
  vehicle_id: '',
  date: new Date().toISOString().split('T')[0],
  fuel_type: 'petrol' as FuelType,
  quantity_liters: '',
  price_per_liter: '',
  odometer: '',
  fuel_station: '',
  notes: '',
};

export default function FuelTrackerPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<FuelExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [expensesRes, vehiclesRes] = await Promise.all([
        supabase
          .from('fuel_expenses')
          .select('*, vehicles(id, make, model, license_plate)')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .eq('user_id', user.id),
      ]);
      if (expensesRes.error) throw expensesRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      setExpenses(expensesRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filtered = useMemo(
    () => (filterVehicle ? expenses.filter((e) => e.vehicle_id === filterVehicle) : expenses),
    [expenses, filterVehicle]
  );

  const stats = useMemo(() => {
    const totalSpent = filtered.reduce((s, e) => s + (e.total_amount || 0), 0);
    const totalLiters = filtered.reduce((s, e) => s + (e.quantity_liters || 0), 0);
    const avgPrice = totalLiters > 0 ? totalSpent / totalLiters : 0;
    return { totalSpent, totalLiters, avgPrice, count: filtered.length };
  }, [filtered]);

  // km/liter efficiency per vehicle
  const efficiencyMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    vehicles.forEach((v) => {
      const vExpenses = expenses
        .filter((e) => e.vehicle_id === v.id && e.odometer)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (vExpenses.length >= 2) {
        const first = vExpenses[0];
        const last = vExpenses[vExpenses.length - 1];
        const km = (last.odometer || 0) - (first.odometer || 0);
        const liters = vExpenses
          .slice(1)
          .reduce((s, e) => s + (e.quantity_liters || 0), 0);
        map[v.id] = liters > 0 ? km / liters : null;
      } else {
        map[v.id] = null;
      }
    });
    return map;
  }, [expenses, vehicles]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const qty = parseFloat(form.quantity_liters);
      const ppl = parseFloat(form.price_per_liter);
      const payload: any = {
        user_id: user.id,
        vehicle_id: form.vehicle_id || null,
        date: form.date,
        fuel_type: form.fuel_type,
        quantity_liters: qty,
        price_per_liter: ppl,
        total_amount: qty * ppl,
        odometer: form.odometer ? parseInt(form.odometer) : null,
        fuel_station: form.fuel_station || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from('fuel_expenses').insert(payload);
      if (error) throw error;
      setShowModal(false);
      setForm(defaultForm);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const { error } = await supabase.from('fuel_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const statCards = [
    {
      label: 'Total Spent',
      value: `₹${stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-500 bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'Avg Price/Liter',
      value: `₹${stats.avgPrice.toFixed(2)}`,
      icon: <BarChart2 className="w-5 h-5" />,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Total Liters',
      value: `${stats.totalLiters.toFixed(1)} L`,
      icon: <Fuel className="w-5 h-5" />,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    },
    {
      label: 'Entries',
      value: stats.count.toString(),
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
    },
  ];

  return (
    <DashboardLayout variant="customer" title="Fuel Expense Tracker">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fuel Expense Tracker</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor your fuel spend and efficiency</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}>{s.icon}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Efficiency per Vehicle */}
        {!loading && vehicles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {vehicles.map((v) => {
              const eff = efficiencyMap[v.id];
              return (
                <div key={v.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                      {v.make} {v.model}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{v.license_plate}</p>
                  {eff !== null ? (
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                      {eff.toFixed(1)} km/L
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Need 2+ entries</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Filter by vehicle:</label>
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.license_plate}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <Fuel className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No fuel entries yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Start tracking your fuel expenses.</p>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Date', 'Vehicle', 'Fuel', 'Qty (L)', '₹/L', 'Total', 'Odometer', 'Station', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr
                      key={e.id}
                      className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx === filtered.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {e.vehicles ? `${e.vehicles.make} ${e.vehicles.model}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${FUEL_TYPE_COLORS[e.fuel_type]}`}>
                          {FUEL_TYPE_LABELS[e.fuel_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.quantity_liters?.toFixed(1)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">₹{e.price_per_liter?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">₹{e.total_amount?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{e.odometer ? `${e.odometer.toLocaleString()} km` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{e.fuel_station || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Fuel Entry</h2>
              <button onClick={() => { setShowModal(false); setForm(defaultForm); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.license_plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuel Type <span className="text-red-500">*</span></label>
                <select required value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value as FuelType })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {Object.entries(FUEL_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qty (Liters) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" required placeholder="e.g. 40" value={form.quantity_liters} onChange={(e) => setForm({ ...form, quantity_liters: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price/Liter <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" required placeholder="e.g. 96.5" value={form.price_per_liter} onChange={(e) => setForm({ ...form, price_per_liter: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>
              {form.quantity_liters && form.price_per_liter && (
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Total: ₹{(parseFloat(form.quantity_liters) * parseFloat(form.price_per_liter)).toFixed(2)}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Odometer (km)</label>
                <input type="number" placeholder="e.g. 45230" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuel Station</label>
                <input type="text" placeholder="e.g. HP Petrol Pump, MG Road" value={form.fuel_station} onChange={(e) => setForm({ ...form, fuel_station: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={2} placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(defaultForm); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? 'Adding...' : 'Add Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
