import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Users, Car, Search, Eye, X, Phone, Mail, Calendar } from 'lucide-react';

export default function GarageCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
      setCustomers(data ?? []);
      setLoading(false);
    })();
  }, []);

  const openCustomer = async (c: any) => {
    setSelected(c);
    const [{ data: v }, { data: b }] = await Promise.all([
      supabase.from('vehicles').select('*').eq('owner_id', c.id),
      supabase.from('bookings').select('*, services(*)').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(5),
    ]);
    setVehicles(v ?? []);
    setBookings(b ?? []);
  };

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Customers" variant="garage">
      <div className="p-4 sm:p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
            placeholder="Search customers..." />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Customer', 'Phone', 'Address', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No customers found.</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-orange-600 font-semibold text-sm">{c.full_name?.[0]?.toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-900">{c.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{c.phone || '-'}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{c.address || '-'}</td>
                      <td className="px-5 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => openCustomer(c)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
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

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">Customer Details</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{selected.full_name?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{selected.full_name}</h4>
                  {selected.phone && <p className="text-gray-500 text-sm flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selected.phone}</p>}
                  <p className="text-xs text-gray-400 mt-1">Member since {new Date(selected.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {vehicles.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1.5"><Car className="w-4 h-4" />Vehicles</h5>
                  <div className="space-y-2">
                    {vehicles.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                        <span className="font-medium text-gray-900">{v.make} {v.model} ({v.year})</span>
                        <span className="font-mono text-gray-500 text-xs">{v.license_plate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bookings.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4" />Recent Bookings</h5>
                  <div className="space-y-2">
                    {bookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{b.services?.name}</p>
                          <p className="text-xs text-gray-500">{b.scheduled_date} · {b.scheduled_time}</p>
                        </div>
                        <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-gray-200 text-gray-600">{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
