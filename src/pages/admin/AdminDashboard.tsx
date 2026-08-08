import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, CreditCard, Package, TrendingUp, ArrowRight, Wrench, BarChart2, Clock, CheckCircle, Send, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalCustomers: 0, totalBookings: 0, totalRevenue: 0, totalParts: 0, pendingBookings: 0, completedToday: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const results = await Promise.allSettled([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('spare_parts').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('scheduled_date', today),
        supabase.from('invoices').select('total').eq('payment_status', 'paid'),
        supabase.from('bookings').select('*, services(*)').order('created_at', { ascending: false }).limit(8),
      ]);
      const r0 = results[0].status === 'fulfilled' ? results[0].value : { count: 0 };
      const r1 = results[1].status === 'fulfilled' ? results[1].value : { count: 0 };
      const r2 = results[2].status === 'fulfilled' ? results[2].value : { count: 0 };
      const r3 = results[3].status === 'fulfilled' ? results[3].value : { count: 0 };
      const r4 = results[4].status === 'fulfilled' ? results[4].value : { count: 0 };
      const r5 = results[5].status === 'fulfilled' ? results[5].value : { data: [] };
      const r6 = results[6].status === 'fulfilled' ? results[6].value : { data: [] };
      const totalRevenue = (r5.data ?? []).reduce((sum: number, item: any) => sum + (item.total ?? 0), 0);
      setStats({ totalCustomers: r0.count ?? 0, totalBookings: r1.count ?? 0, totalRevenue, totalParts: r2.count ?? 0, pendingBookings: r3.count ?? 0, completedToday: r4.count ?? 0 });
      setRecentBookings(r6.data ?? []);
      setLoading(false);
    })();
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <DashboardLayout title="Admin Dashboard" variant="admin">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-1">Admin Overview</h2>
          <p className="text-red-200 text-sm">Complete control of your NMR Car Services platform.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/admin/bookings" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-700 font-semibold rounded-xl hover:bg-red-50 text-sm">
              <Calendar className="w-4 h-4" /> All Bookings
            </Link>
            <Link to="/admin/customers" className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 text-white font-medium rounded-xl hover:bg-white/25 text-sm border border-white/20">
              <Users className="w-4 h-4" /> Customers
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Customers', value: stats.totalCustomers, icon: <Users className="w-5 h-5" />, color: 'bg-blue-500', href: '/admin/customers' },
            { label: 'Total Bookings', value: stats.totalBookings, icon: <Calendar className="w-5 h-5" />, color: 'bg-red-500', href: '/admin/bookings' },
            { label: 'Revenue (Paid)', value: `₹${Math.round(stats.totalRevenue / 1000)}K`, icon: <CreditCard className="w-5 h-5" />, color: 'bg-green-500', href: '/admin/reports' },
            { label: 'Parts in Stock', value: stats.totalParts, icon: <Package className="w-5 h-5" />, color: 'bg-orange-500', href: '/admin/parts' },
            { label: 'Pending', value: stats.pendingBookings, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-500', href: '/admin/bookings' },
            { label: "Done Today", value: stats.completedToday, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-500', href: '/admin/bookings' },
          ].map(s => (
            <Link key={s.label} to={s.href} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all group">
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>{s.icon}</div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Customers', icon: <Users className="w-5 h-5" />, href: '/admin/customers', color: 'bg-blue-50 text-blue-600' },
            { label: 'Invoices', icon: <FileText className="w-5 h-5" />, href: '/admin/invoices', color: 'bg-red-50 text-red-600' },
            { label: 'Messaging', icon: <Send className="w-5 h-5" />, href: '/admin/messaging', color: 'bg-green-50 text-green-600' },
            { label: 'Reports', icon: <BarChart2 className="w-5 h-5" />, href: '/admin/reports', color: 'bg-orange-50 text-orange-600' },
          ].map(a => (
            <Link key={a.href} to={a.href} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
              <span className="font-medium text-gray-700 text-sm">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Recent Bookings</h3>
            <Link to="/admin/bookings" className="text-red-600 text-sm font-medium flex items-center gap-1">All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Booking #', 'Customer', 'Vehicle', 'Service', 'Date', 'Status', 'Cost'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : recentBookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No bookings yet.</td></tr>
                ) : recentBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.booking_number}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{b.customer_name ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">{b.vehicle_info ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-700">{b.services?.name}</td>
                    <td className="px-5 py-3 text-gray-500">{b.scheduled_date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>{b.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">₹{b.estimated_cost?.toLocaleString('en-IN')}</td>
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
