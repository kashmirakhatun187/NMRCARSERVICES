import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Calendar, Search, Filter, Eye, X, MapPin, Clock, Car, Wrench } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function GarageBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings')
      .select('*, vehicles(*), services(*), profiles!customer_id(*)')
      .order('scheduled_date', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchBookings();
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status: newStatus }));
  };

  const filtered = bookings.filter(b => {
    const svc = b.services?.name ?? '';
    const cust = b.profiles?.full_name ?? '';
    const veh = `${b.vehicles?.make} ${b.vehicles?.model}`;
    const matchSearch = svc.toLowerCase().includes(search.toLowerCase()) || cust.toLowerCase().includes(search.toLowerCase()) || b.booking_number.toLowerCase().includes(search.toLowerCase()) || veh.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || b.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout title="Bookings" variant="garage">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
              placeholder="Search bookings..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  status === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Booking #', 'Customer', 'Vehicle', 'Service', 'Date / Time', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No bookings found.</td></tr>
                  ) : filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.booking_number}</td>
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{b.profiles?.full_name ?? '-'}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{b.vehicles?.make} {b.vehicles?.model}<br /><span className="text-xs font-mono">{b.vehicles?.license_plate}</span></td>
                      <td className="px-5 py-3 text-gray-700">{b.services?.name}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{b.scheduled_date}<br />{b.scheduled_time}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>{b.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelected(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4" /></button>
                          {b.status === 'pending' && <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Confirm</button>}
                          {b.status === 'confirmed' && <button onClick={() => updateStatus(b.id, 'in_progress')} className="px-2 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700">Start</button>}
                          {b.status === 'in_progress' && <button onClick={() => updateStatus(b.id, 'completed')} className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Complete</button>}
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

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{selected.booking_number}</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium">{selected.profiles?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{selected.profiles?.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-medium">{selected.vehicles?.make} {selected.vehicles?.model} ({selected.vehicles?.year})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Plate</span><span className="font-mono">{selected.vehicles?.license_plate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{selected.services?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date & Time</span><span>{selected.scheduled_date} at {selected.scheduled_time}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pickup</span><span>{selected.pickup_required ? selected.pickup_address || 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Drop</span><span>{selected.drop_required ? selected.drop_address || 'Yes' : 'No'}</span></div>
              {selected.special_instructions && <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-500 block text-xs mb-1">Instructions:</span><p>{selected.special_instructions}</p></div>}
              <div className="flex justify-between font-bold border-t pt-3"><span>Estimated Cost</span><span className="text-orange-600">₹{selected.estimated_cost?.toLocaleString('en-IN')}</span></div>
              <div className="flex gap-2 pt-2">
                {selected.status === 'pending' && <button onClick={() => updateStatus(selected.id, 'confirmed')} className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">Confirm Booking</button>}
                {selected.status === 'confirmed' && <button onClick={() => updateStatus(selected.id, 'in_progress')} className="flex-1 py-2 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700">Start Service</button>}
                {selected.status === 'in_progress' && <button onClick={() => updateStatus(selected.id, 'completed')} className="flex-1 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700">Mark Complete</button>}
                {['pending', 'confirmed'].includes(selected.status) && <button onClick={() => updateStatus(selected.id, 'cancelled')} className="flex-1 py-2 bg-red-50 text-red-600 text-sm rounded-xl hover:bg-red-100 border border-red-200">Cancel</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
