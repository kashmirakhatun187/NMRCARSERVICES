import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Calendar, Search, Eye, X, Wrench, CheckCircle, Clock, Play, XCircle, Phone, Mail, Car, MessageSquare } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const nextActions: Record<string, { label: string; status: string; icon: typeof Wrench; class: string }[]> = {
  pending: [{ label: 'Confirm', status: 'confirmed', icon: CheckCircle, class: 'bg-blue-600 text-white hover:bg-blue-700' }],
  confirmed: [
    { label: 'Start Work', status: 'in_progress', icon: Play, class: 'bg-orange-600 text-white hover:bg-orange-700' },
    { label: 'Cancel', status: 'cancelled', icon: XCircle, class: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  ],
  in_progress: [{ label: 'Complete', status: 'completed', icon: CheckCircle, class: 'bg-green-600 text-white hover:bg-green-700' }],
  completed: [],
  cancelled: [],
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async () => {
    const { data, error } = await supabase.from('bookings')
      .select('*, services(*)')
      .order('created_at', { ascending: false });
    if (error) { setBookings([]); }
    else setBookings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Failed to update status: ' + error.message); }
    else {
      await fetchBookings();
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status: newStatus }));
    }
    setActionLoading(null);
  };

  const filtered = bookings.filter(b => {
    const svc = b.services?.name ?? '';
    const cust = b.customer_name ?? '';
    const phone = b.customer_phone ?? '';
    const matchSearch = svc.toLowerCase().includes(search.toLowerCase()) || cust.toLowerCase().includes(search.toLowerCase()) || phone.includes(search) || b.booking_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || b.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout title="All Bookings" variant="admin">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-400"
              placeholder="Search bookings..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${status === s ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No bookings found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
                  <tr>{['Booking #', 'Customer', 'Vehicle', 'Service', 'Date', 'Status', 'Cost', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{b.booking_number}</td>
                      <td className="px-5 py-3 whitespace-nowrap"><p className="font-medium text-gray-900 dark:text-white">{b.customer_name || '-'}</p><p className="text-xs text-gray-400">{b.customer_phone}</p></td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{b.vehicle_info || '-'}</td>
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{b.services?.name}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{b.scheduled_date}</td>
                      <td className="px-5 py-3"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>{b.status.replace('_', ' ')}</span></td>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">₹{b.estimated_cost?.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 items-center flex-wrap">
                          <button onClick={() => setSelected(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {(nextActions[b.status] ?? []).map(a => (
                            <button key={a.status} disabled={actionLoading === b.id}
                              onClick={() => updateStatus(b.id, a.status)}
                              className={`px-2 py-1 text-xs rounded-lg transition-all disabled:opacity-50 ${a.class}`}>
                              {actionLoading === b.id ? '…' : a.label}
                            </button>
                          ))}
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b dark:border-slate-700">
              <h3 className="font-bold dark:text-white">{selected.booking_number}</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Customer</span><span className="font-medium dark:text-white">{selected.customer_name || 'N/A'}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">Phone</span><a href={`tel:${selected.customer_phone}`} className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selected.customer_phone}</a></div>
              {selected.customer_email && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Email</span><span className="font-medium dark:text-gray-300 text-xs">{selected.customer_email}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Service</span><span className="font-medium dark:text-white">{selected.services?.name ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Vehicle</span><span className="dark:text-gray-300 text-xs">{selected.vehicle_info || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="dark:text-gray-300">{selected.scheduled_date} at {selected.scheduled_time}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between font-bold border-t dark:border-slate-700 pt-3"><span className="dark:text-white">Estimated Cost (incl GST)</span><span className="text-red-600 dark:text-red-400">₹{Number(selected.estimated_cost).toLocaleString('en-IN')}</span></div>
              {Number(selected.gst_amount) > 0 && <div className="flex justify-between text-xs text-gray-400"><span>GST ({selected.gst_percentage}%)</span><span>₹{Number(selected.gst_amount).toLocaleString('en-IN')}</span></div>}
              {selected.pickup_required && <div className="flex gap-2 text-xs text-gray-400"><Wrench className="w-3 h-3" /> Pickup: {selected.pickup_address || 'Yes'}</div>}
              {selected.drop_required && <div className="flex gap-2 text-xs text-gray-400"><Wrench className="w-3 h-3" /> Drop: {selected.drop_address || 'Yes'}</div>}
              {selected.special_instructions && <div className="text-xs text-gray-400"><span className="font-medium">Notes:</span> {selected.special_instructions}</div>}
              <div className="flex flex-wrap gap-2 pt-3">
                {(nextActions[selected.status] ?? []).map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.status} disabled={actionLoading === selected.id}
                      onClick={() => updateStatus(selected.id, a.status)}
                      className={`flex-1 min-w-[100px] py-2 text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${a.class}`}>
                      <Icon className="w-4 h-4" /> {a.label}
                    </button>
                  );
                })}
                {selected.status === 'completed' && <p className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1 w-full"><CheckCircle className="w-4 h-4" /> Service completed successfully</p>}
                {selected.status === 'cancelled' && <p className="text-red-500 text-xs flex items-center gap-1 w-full"><XCircle className="w-4 h-4" /> This booking was cancelled</p>}
              </div>

              {selected.customer_phone && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Contact Customer</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`https://wa.me/${selected.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <a href={`tel:${selected.customer_phone}`} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    {selected.customer_email && (
                      <a href={`mailto:${selected.customer_email}`} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    )}
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
