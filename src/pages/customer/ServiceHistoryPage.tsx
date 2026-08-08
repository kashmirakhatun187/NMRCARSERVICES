import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Wrench, Car, Calendar, DollarSign, CheckCircle } from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface JobCard {
  id: string;
  mechanic_notes: string | null;
}

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<string>('all');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          scheduled_date,
          total_amount,
          status,
          vehicle_id,
          vehicles(id, make, model, license_plate),
          services(id, name, price),
          job_cards(id, mechanic_notes)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load service history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const vehicles = useMemo(() => {
    const map = new Map<string, Vehicle>();
    bookings.forEach((b) => {
      if (b.vehicles && !map.has(b.vehicle_id)) {
        map.set(b.vehicle_id, b.vehicles);
      }
    });
    return Array.from(map.values());
  }, [bookings]);

  const filtered = useMemo(
    () => (activeVehicle === 'all' ? bookings : bookings.filter((b) => b.vehicle_id === activeVehicle)),
    [bookings, activeVehicle]
  );

  const totalPerVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      map[b.vehicle_id] = (map[b.vehicle_id] || 0) + (b.total_amount || 0);
    });
    return map;
  }, [bookings]);

  const overallTotal = useMemo(
    () => filtered.reduce((s, b) => s + (b.total_amount || 0), 0),
    [filtered]
  );

  return (
    <DashboardLayout variant="customer" title="Digital Service History">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Digital Service History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete record of all your completed services</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        {/* Vehicle Tabs */}
        {!loading && vehicles.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveVehicle('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeVehicle === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              All Vehicles
            </button>
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVehicle(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeVehicle === v.id ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                <Car className="w-3.5 h-3.5" />
                {v.make} {v.model}
              </button>
            ))}
          </div>
        )}

        {/* Total spend summary */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {activeVehicle === 'all' ? 'Total Spend' : 'Vehicle Total'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{overallTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Services Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filtered.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Cost</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{filtered.length > 0 ? Math.round(overallTotal / filtered.length).toLocaleString('en-IN') : '0'}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-28" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Wrench className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No service history</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Completed services will appear here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="space-y-4">
              {filtered.map((booking) => {
                const notes = booking.job_cards?.[0]?.mechanic_notes;
                return (
                  <div key={booking.id} className="relative sm:pl-16">
                    {/* Timeline dot */}
                    <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 hidden sm:block z-10" />
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {booking.services?.name || 'Service'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              {booking.vehicles?.make} {booking.vehicles?.model} — {booking.vehicles?.license_plate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(booking.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="font-mono">#{booking.booking_number}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            ₹{(booking.total_amount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      {notes && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Mechanic Notes
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
