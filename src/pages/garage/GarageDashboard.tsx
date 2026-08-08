import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Booking } from '../../lib/supabase';
import { Calendar, Clock, CheckCircle, Wrench, Car, AlertCircle, ArrowRight, Users, Package } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function GarageDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bookings')
        .select('*, vehicles(*), services(*), profiles!customer_id(*)')
        .order('scheduled_date', { ascending: true })
        .limit(20);
      setBookings(data ?? []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.scheduled_date === today);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const inProgressCount = bookings.filter(b => b.status === 'in_progress').length;
  const completedToday = bookings.filter(b => b.scheduled_date === today && b.status === 'completed').length;

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as any } : b));
  };

  return (
    <DashboardLayout title="Garage Dashboard" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Bookings", value: todayBookings.length, icon: <Calendar className="w-5 h-5" />, color: 'bg-blue-500' },
            { label: 'Pending', value: pendingCount, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-500' },
            { label: 'In Progress', value: inProgressCount, icon: <Wrench className="w-5 h-5" />, color: 'bg-orange-500' },
            { label: 'Completed Today', value: completedToday, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>{s.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'All Bookings', icon: <Calendar className="w-5 h-5" />, href: '/garage/bookings', color: 'bg-blue-50 text-blue-600' },
            { label: 'Job Cards', icon: <Wrench className="w-5 h-5" />, href: '/garage/job-cards', color: 'bg-orange-50 text-orange-600' },
            { label: 'Customers', icon: <Users className="w-5 h-5" />, href: '/garage/customers', color: 'bg-purple-50 text-purple-600' },
            { label: 'Spare Parts', icon: <Package className="w-5 h-5" />, href: '/garage/parts', color: 'bg-green-50 text-green-600' },
          ].map(a => (
            <Link key={a.href} to={a.href} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
              <span className="font-medium text-gray-700 text-sm">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Today's Schedule</h3>
            <Link to="/garage/bookings" className="text-orange-600 text-sm font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-16 mx-5 my-3 bg-gray-100 rounded-lg animate-pulse" />)
            ) : todayBookings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Calendar className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No bookings scheduled for today.</p>
              </div>
            ) : (
              todayBookings.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-5 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{(b as any).services?.name}</p>
                    <p className="text-xs text-gray-500">
                      {(b as any).vehicles?.make} {(b as any).vehicles?.model} ·
                      {(b as any).profiles?.full_name} · {b.scheduled_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                    {b.status === 'pending' && (
                      <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">Confirm</button>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => updateStatus(b.id, 'in_progress')} className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors">Start</button>
                    )}
                    {b.status === 'in_progress' && (
                      <button onClick={() => updateStatus(b.id, 'completed')} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">Complete</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Bookings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Recent Bookings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Booking #', 'Customer', 'Vehicle', 'Service', 'Date', 'Time', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : bookings.slice(0, 10).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.booking_number}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{(b as any).profiles?.full_name ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{(b as any).vehicles?.make} {(b as any).vehicles?.model}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{(b as any).services?.name}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{b.scheduled_date}</td>
                    <td className="px-5 py-3 text-gray-500">{b.scheduled_time}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {b.status === 'pending' && <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Confirm</button>}
                      {b.status === 'confirmed' && <button onClick={() => updateStatus(b.id, 'in_progress')} className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700">Start</button>}
                      {b.status === 'in_progress' && <button onClick={() => updateStatus(b.id, 'completed')} className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Complete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
