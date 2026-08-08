import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase, Booking } from '../../lib/supabase';
import { Calendar, Clock, Car, Wrench, MapPin, Search, Filter, Eye, X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusSteps = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('bookings')
        .select('*, vehicles(*), services(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setBookings(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(id);
    const { error } = await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).in('status', ['pending', 'confirmed']);
    if (error) { alert('Failed to cancel: ' + error.message); }
    else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as any } : b));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: 'cancelled' as any } : null);
    }
    setCancelling(null);
  };

  const filtered = bookings.filter(b => {
    const svc = (b as any).services?.name ?? '';
    const veh = `${(b as any).vehicles?.make} ${(b as any).vehicles?.model}`;
    const matchSearch = svc.toLowerCase().includes(search.toLowerCase()) || veh.toLowerCase().includes(search.toLowerCase()) || b.booking_number.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || b.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout title="My Bookings" variant="customer">
      <div className="p-4 sm:p-6">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="Search bookings..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No bookings found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or book a new service.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Wrench className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900">{(b as any).services?.name}</h3>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${statusColors[b.status]}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{(b as any).vehicles?.make} {(b as any).vehicles?.model}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{b.scheduled_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.scheduled_time}</span>
                        {b.pickup_required && <span className="flex items-center gap-1 text-blue-600"><MapPin className="w-3.5 h-3.5" />Pickup</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">#{b.booking_number}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-gray-900">₹{b.estimated_cost?.toLocaleString('en-IN')}</p>
                    <button onClick={() => setSelected(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <button onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors disabled:opacity-50">
                        {cancelling === b.id ? 'Cancelling…' : <><XCircle className="w-3.5 h-3.5" /> Cancel</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {b.status !== 'cancelled' && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                      {statusSteps.map((s, i) => {
                        const currentIdx = statusSteps.indexOf(b.status);
                        const active = i <= currentIdx;
                        return (
                          <div key={s} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`w-full h-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            <span className={`text-xs capitalize hidden sm:block ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                              {s.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Booking #</span><span className="font-mono font-medium">{selected.booking_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{(selected as any).services?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-medium">{(selected as any).vehicles?.make} {(selected as any).vehicles?.model}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Plate</span><span className="font-mono font-medium">{(selected as any).vehicles?.license_plate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{selected.scheduled_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selected.scheduled_time}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${statusColors[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Pickup</span><span className="font-medium">{selected.pickup_required ? selected.pickup_address || 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Drop</span><span className="font-medium">{selected.drop_required ? selected.drop_address || 'Yes' : 'No'}</span></div>
              {selected.special_instructions && <div><span className="text-gray-500">Notes:</span><p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3">{selected.special_instructions}</p></div>}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Estimated Cost</span>
                <span className="font-bold text-lg text-blue-600">₹{selected.estimated_cost?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
