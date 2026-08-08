import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Package, Gift, Plus, Users, Calendar, CheckCircle, Edit2, Trash2, X } from 'lucide-react';

type ServicePackage = {
  id: string;
  name: string;
  type: string;
  price: number;
  validity_days: number;
  services_included: string[];
  max_services: number;
  discount_percentage?: number;
  description?: string;
  is_active: boolean;
};

type UserPackage = {
  id: string;
  user_id: string;
  vehicle_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  services_used: number;
  amount_paid: number;
  status: string;
  profiles?: { full_name: string };
  vehicles?: { make: string; model: string; registration_number: string };
  service_packages?: { name: string };
};

type Customer = { id: string; full_name: string };
type Vehicle = { id: string; make: string; model: string; registration_number: string; owner_id: string };

const typeConfig: Record<string, string> = {
  package:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  amc:          'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  subscription: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

const subStatusConfig: Record<string, string> = {
  active:    'bg-green-500/20 text-green-400 border border-green-500/30',
  expired:   'bg-red-500/20 text-red-400 border border-red-500/30',
  cancelled: 'bg-gray-700 text-gray-400',
};

const defaultPkgForm = {
  name: '', type: 'package', price: 0, validity_days: 365, services_included: '',
  max_services: 1, discount_percentage: 0, description: '', is_active: true,
};

const defaultSubForm = { user_id: '', vehicle_id: '', package_id: '', amount_paid: 0 };

export default function PackagesPage() {
  const [tab, setTab] = useState<'packages' | 'subscriptions'>('packages');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPkgModal, setShowPkgModal] = useState(false);
  const [editPkgId, setEditPkgId] = useState<string | null>(null);
  const [pkgForm, setPkgForm] = useState<any>({ ...defaultPkgForm });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgError, setPkgError] = useState('');

  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState<any>({ ...defaultSubForm });
  const [subSaving, setSubSaving] = useState(false);
  const [subError, setSubError] = useState('');

  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pkgs }, { data: up }, { data: custs }, { data: vehs }] = await Promise.all([
      supabase.from('service_packages').select('*').order('name'),
      supabase.from('user_packages').select('*, profiles(full_name), vehicles(*), service_packages(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'customer').order('full_name'),
      supabase.from('vehicles').select('id, make, model, registration_number, owner_id'),
    ]);
    setPackages(pkgs ?? []);
    setUserPackages(up ?? []);
    setCustomers(custs ?? []);
    setVehicles(vehs ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const customerVehicles = vehicles.filter(v => v.owner_id === subForm.user_id);

  const openAddPkg = () => { setEditPkgId(null); setPkgForm({ ...defaultPkgForm }); setPkgError(''); setShowPkgModal(true); };
  const openEditPkg = (p: ServicePackage) => {
    setEditPkgId(p.id);
    setPkgForm({ ...p, services_included: (p.services_included ?? []).join(', ') });
    setPkgError('');
    setShowPkgModal(true);
  };

  const handlePkgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgForm.name.trim()) { setPkgError('Package name is required.'); return; }
    setPkgSaving(true);
    const payload = {
      ...pkgForm,
      price: Number(pkgForm.price),
      validity_days: Number(pkgForm.validity_days),
      max_services: Number(pkgForm.max_services),
      discount_percentage: Number(pkgForm.discount_percentage),
      services_included: pkgForm.services_included.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    let err;
    if (editPkgId) ({ error: err } = await supabase.from('service_packages').update(payload).eq('id', editPkgId));
    else ({ error: err } = await supabase.from('service_packages').insert(payload));
    if (err) { setPkgError(err.message); setPkgSaving(false); return; }
    setSuccess(editPkgId ? 'Package updated!' : 'Package created!');
    setShowPkgModal(false);
    await fetchData();
    setPkgSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeletePkg = async (id: string) => {
    if (!confirm('Delete this package?')) return;
    await supabase.from('service_packages').delete().eq('id', id);
    await fetchData();
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.user_id || !subForm.vehicle_id || !subForm.package_id) { setSubError('All fields are required.'); return; }
    setSubSaving(true);
    const pkg = packages.find(p => p.id === subForm.package_id);
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + (pkg?.validity_days ?? 365) * 86400000).toISOString().split('T')[0];
    const { error: err } = await supabase.from('user_packages').insert({
      user_id: subForm.user_id,
      vehicle_id: subForm.vehicle_id,
      package_id: subForm.package_id,
      start_date: startDate,
      end_date: endDate,
      services_used: 0,
      amount_paid: Number(subForm.amount_paid),
      status: 'active',
    });
    if (err) { setSubError(err.message); setSubSaving(false); return; }
    setSuccess('Subscription created!');
    setShowSubModal(false);
    await fetchData();
    setSubSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const fp = (k: string, v: any) => setPkgForm((p: any) => ({ ...p, [k]: v }));
  const fs = (k: string, v: any) => setSubForm((p: any) => ({ ...p, [k]: v }));

  return (
    <DashboardLayout title="Service Packages & AMC" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-blue-400" /> Service Packages & AMC
            </h1>
          </div>
          <div className="flex gap-2">
            {tab === 'packages' && (
              <button onClick={openAddPkg} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Add Package
              </button>
            )}
            {tab === 'subscriptions' && (
              <button onClick={() => { setSubForm({ ...defaultSubForm }); setSubError(''); setShowSubModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Create Subscription
              </button>
            )}
          </div>
        </div>

        {success && <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <div className="flex bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
          {(['packages', 'subscriptions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'packages'
                ? <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Packages</span>
                : <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Customer Subscriptions</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>
        ) : tab === 'packages' ? (
          packages.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No packages yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map(p => (
                <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold text-base">{p.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize ${typeConfig[p.type] ?? 'bg-gray-700 text-gray-300'}`}>{p.type}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditPkg(p)} className="text-gray-400 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePkg(p.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    ₹{Number(p.price).toLocaleString('en-IN')}
                    <span className="text-gray-500 text-sm font-normal ml-1">/ {p.validity_days} days</span>
                  </div>
                  {p.description && <p className="text-gray-400 text-sm">{p.description}</p>}
                  <div className="space-y-2">
                    {(p.services_included ?? []).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{s}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <span>Max {p.max_services} services</span>
                    {(p.discount_percentage ?? 0) > 0 && <span className="text-green-400">{p.discount_percentage}% discount</span>}
                    <span className={p.is_active ? 'text-green-400' : 'text-gray-500'}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          userPackages.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No subscriptions yet.</p></div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-700/50">
                      {['Customer','Vehicle','Package','Start Date','End Date','Services Used','Amount Paid','Status'].map(h => (
                        <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {userPackages.map(up => {
                      const used = up.services_used;
                      const pkg = packages.find(p => p.id === up.package_id);
                      const max = pkg?.max_services ?? 1;
                      const pct = Math.min(100, Math.round((used / max) * 100));
                      return (
                        <tr key={up.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-white font-medium">{up.profiles?.full_name ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {up.vehicles ? `${up.vehicles.make} ${up.vehicles.model}` : '-'}
                            <br /><span className="text-xs text-gray-500">{up.vehicles?.registration_number}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{up.service_packages?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-300">{up.start_date}</td>
                          <td className="px-4 py-3 text-gray-300">{up.end_date}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-700 rounded-full h-1.5 w-16">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-300 text-xs whitespace-nowrap">{used}/{max}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white font-semibold">₹{Number(up.amount_paid).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subStatusConfig[up.status] ?? 'bg-gray-700 text-gray-400'}`}>{up.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {showPkgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="text-white font-semibold text-lg">{editPkgId ? 'Edit Package' : 'Add Package'}</h2>
                <button onClick={() => setShowPkgModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handlePkgSave} className="p-6 space-y-4">
                {pkgError && <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{pkgError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Package Name *</label>
                    <input value={pkgForm.name} onChange={e => fp('name', e.target.value)} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Type</label>
                    <select value={pkgForm.type} onChange={e => fp('type', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="package">Package</option>
                      <option value="amc">AMC</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Price (₹)</label>
                    <input type="number" min={0} value={pkgForm.price} onChange={e => fp('price', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Validity (days)</label>
                    <input type="number" min={1} value={pkgForm.validity_days} onChange={e => fp('validity_days', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Max Services</label>
                    <input type="number" min={1} value={pkgForm.max_services} onChange={e => fp('max_services', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Discount (%)</label>
                    <input type="number" min={0} max={100} value={pkgForm.discount_percentage} onChange={e => fp('discount_percentage', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Services Included (comma-separated)</label>
                    <input value={pkgForm.services_included} onChange={e => fp('services_included', e.target.value)} placeholder="Oil Change, Tire Rotation..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Description</label>
                    <textarea value={pkgForm.description} onChange={e => fp('description', e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-400 text-xs font-medium">Active</label>
                    <button type="button" onClick={() => fp('is_active', !pkgForm.is_active)} className={`w-11 h-6 rounded-full transition-colors ${pkgForm.is_active ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${pkgForm.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowPkgModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={pkgSaving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                    {pkgSaving ? 'Saving...' : editPkgId ? 'Update' : 'Add Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="text-white font-semibold text-lg">Create Subscription</h2>
                <button onClick={() => setShowSubModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateSub} className="p-6 space-y-4">
                {subError && <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{subError}</div>}
                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1 block">Customer *</label>
                  <select value={subForm.user_id} onChange={e => { fs('user_id', e.target.value); fs('vehicle_id', ''); }} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1 block">Vehicle *</label>
                  <select value={subForm.vehicle_id} onChange={e => fs('vehicle_id', e.target.value)} required disabled={!subForm.user_id} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                    <option value="">Select vehicle...</option>
                    {customerVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number}</option>)}
                  </select>
                  {subForm.user_id && customerVehicles.length === 0 && <p className="text-yellow-400 text-xs mt-1">No vehicles found for this customer.</p>}
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1 block">Package *</label>
                  <select value={subForm.package_id} onChange={e => fs('package_id', e.target.value)} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select package...</option>
                    {packages.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString('en-IN')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1 block">Amount Paid (₹)</label>
                  <input type="number" min={0} value={subForm.amount_paid} onChange={e => fs('amount_paid', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {subForm.package_id && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Valid for {packages.find(p => p.id === subForm.package_id)?.validity_days ?? 0} days from today
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSubModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={subSaving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                    {subSaving ? 'Creating...' : 'Create Subscription'}
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
