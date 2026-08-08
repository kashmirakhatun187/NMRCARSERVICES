import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase, Vehicle } from '../../lib/supabase';
import { Car, Plus, Edit2, Trash2, X, Fuel, Gauge, Calendar, CheckCircle } from 'lucide-react';

const fuelTypes = ['petrol', 'diesel', 'cng', 'electric', 'hybrid'];
const transmissions = ['manual', 'automatic'];

const defaultForm = { make: '', model: '', year: new Date().getFullYear(), license_plate: '', vin: '', color: '', fuel_type: 'petrol', transmission: 'manual', mileage: 0, notes: '' };

export default function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm as any);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch = async () => {
    const { data } = await supabase.from('vehicles').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false });
    setVehicles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetch(); }, [user]);

  const openAdd = () => { setEditId(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (v: Vehicle) => { setEditId(v.id); setForm({ make: v.make, model: v.model, year: v.year, license_plate: v.license_plate, vin: v.vin, color: v.color, fuel_type: v.fuel_type, transmission: v.transmission, mileage: v.mileage, notes: v.notes }); setError(''); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, year: Number(form.year), mileage: Number(form.mileage) };
    let err;
    if (editId) {
      ({ error: err } = await supabase.from('vehicles').update(payload).eq('id', editId));
    } else {
      ({ error: err } = await supabase.from('vehicles').insert({ ...payload, owner_id: user!.id }));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(editId ? 'Vehicle updated!' : 'Vehicle added!');
    setShowModal(false);
    await fetch();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? This will also remove related bookings.')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    await fetch();
  };

  const fuelIcons: Record<string, string> = { petrol: '⛽', diesel: '🛢️', cng: '💨', electric: '⚡', hybrid: '🔋' };

  return (
    <DashboardLayout title="My Vehicles" variant="customer">
      <div className="p-4 sm:p-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Vehicles</h2>
            <p className="text-gray-500 text-sm mt-1">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>

        {/* Vehicle Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Car className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm">Add your car to start booking services and tracking service history.</p>
            <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{v.make} {v.model}</h3>
                      <p className="text-blue-200 text-sm">{v.year} · {v.license_plate}</p>
                    </div>
                    <span className="text-2xl">{fuelIcons[v.fuel_type] ?? '🚗'}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div>
                      <Fuel className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500 capitalize">{v.fuel_type}</p>
                    </div>
                    <div>
                      <Gauge className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">{v.mileage.toLocaleString()} km</p>
                    </div>
                    <div>
                      <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">{v.last_service_date ?? 'N/A'}</p>
                    </div>
                  </div>
                  {v.color && <p className="text-xs text-gray-400 mb-1">Color: {v.color}</p>}
                  {v.vin && <p className="text-xs text-gray-400 font-mono truncate">VIN: {v.vin}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openEdit(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(v.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-100 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                {[['make', 'Make *', 'Maruti, Hyundai...'], ['model', 'Model *', 'Swift, Creta...']].map(([field, label, ph]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input required={label.includes('*')} value={form[field]} onChange={e => setForm((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input required type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year}
                    onChange={e => setForm((p: any) => ({ ...p, year: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
                  <input required value={form.license_plate} onChange={e => setForm((p: any) => ({ ...p, license_plate: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                    placeholder="DL 01 AB 1234" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm((p: any) => ({ ...p, fuel_type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white capitalize">
                    {fuelTypes.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                  <select value={form.transmission} onChange={e => setForm((p: any) => ({ ...p, transmission: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white capitalize">
                    {transmissions.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input value={form.color} onChange={e => setForm((p: any) => ({ ...p, color: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="White, Red..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (km)</label>
                  <input type="number" min="0" value={form.mileage} onChange={e => setForm((p: any) => ({ ...p, mileage: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="45000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Optional)</label>
                <input value={form.vin} onChange={e => setForm((p: any) => ({ ...p, vin: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder="Vehicle Identification Number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Any notes about your vehicle..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (editId ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
