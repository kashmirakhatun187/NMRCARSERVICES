import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase, Booking, Vehicle } from '../../lib/supabase';
import { Car, Calendar, Clock, CheckCircle, AlertCircle, PlusCircle, ArrowRight, Wrench, Bell } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function CustomerDashboard() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const results = await Promise.allSettled([
        supabase.from('bookings').select('*, vehicles(*), services(*)').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('vehicles').select('*').eq('owner_id', user.id),
      ]);
      const bData = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const vData = results[1].status === 'fulfilled' ? results[1].value.data : null;
      setBookings(bData ?? []);
      setVehicles(vData ?? []);
      setLoading(false);
    })();
  }, [user]);

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: <Calendar className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'My Vehicles', value: vehicles.length, icon: <Car className="w-5 h-5" />, color: 'bg-green-500' },
    { label: 'Active Services', value: bookings.filter(b => b.status === 'in_progress').length, icon: <Wrench className="w-5 h-5" />, color: 'bg-orange-500' },
    { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-500' },
  ];

  return (
    <DashboardLayout title="Dashboard" variant="customer">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-1">Good morning, {profile?.full_name?.split(' ')[0] || 'there'}!</h2>
          <p className="text-blue-200 text-sm">Welcome to your NMR Car Services dashboard.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/customer/book" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all text-sm shadow-lg">
              <Calendar className="w-4 h-4" /> Book a Service
            </Link>
            <Link to="/customer/vehicles" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all text-sm border border-white/20">
              <Car className="w-4 h-4" /> Add Vehicle
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Recent Bookings</h3>
              <Link to="/customer/bookings" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-16 mx-5 my-3 bg-gray-100 rounded-lg animate-pulse" />)
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No bookings yet.</p>
                  <Link to="/customer/book" className="mt-3 text-blue-600 text-sm font-medium">Book your first service</Link>
                </div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{(b as any).services?.name ?? 'Service'}</p>
                      <p className="text-xs text-gray-500">{(b as any).vehicles?.make} {(b as any).vehicles?.model} · {b.scheduled_date}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[b.status]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Vehicles */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">My Vehicles</h3>
              <Link to="/customer/vehicles" className="text-blue-600 text-sm font-medium">Manage</Link>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                [...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No vehicles added.</p>
                  <Link to="/customer/vehicles" className="mt-2 block text-blue-600 text-sm font-medium">Add your car</Link>
                </div>
              ) : (
                vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{v.make} {v.model}</p>
                      <p className="text-xs text-gray-500">{v.year} · {v.license_plate}</p>
                    </div>
                  </div>
                ))
              )}
              <Link to="/customer/vehicles"
                className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors">
                <PlusCircle className="w-4 h-4" /> Add Vehicle
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Book Service', icon: <Calendar className="w-5 h-5" />, href: '/customer/book', color: 'bg-blue-50 text-blue-600' },
              { label: 'Add Vehicle', icon: <Car className="w-5 h-5" />, href: '/customer/vehicles', color: 'bg-green-50 text-green-600' },
              { label: 'My Invoices', icon: <AlertCircle className="w-5 h-5" />, href: '/customer/invoices', color: 'bg-orange-50 text-orange-600' },
              { label: 'Notifications', icon: <Bell className="w-5 h-5" />, href: '/customer/notifications', color: 'bg-purple-50 text-purple-600' },
            ].map(a => (
              <Link key={a.label} to={a.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:shadow-md transition-all border border-gray-100 hover:border-gray-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
                <span className="text-xs font-medium text-gray-700 text-center">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
