import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Layers, Clock, Users, Wrench, RefreshCw, CheckCircle, Play } from 'lucide-react';

const AVG_DURATION_MIN = 30;

function formatTime(t?: string) {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function waitEstimate(position: number, avgMin: number) {
  const total = (position - 1) * avgMin;
  if (total <= 0) return 'Next';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `~${h}h ${m}m wait` : `~${m}m wait`;
}

export default function QueuePage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'upcoming'>('today');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchQueue = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_number, status, scheduled_date, scheduled_time, vehicles(*), services(name, duration_minutes), profiles!customer_id(full_name)')
      .in('status', ['confirmed', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: false });
    setBookings(data ?? []);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, []);

  const todayQueue = bookings.filter(b => b.scheduled_date === todayStr);
  const upcomingQueue = bookings.filter(b => b.scheduled_date > todayStr);
  const displayQueue = viewMode === 'today' ? todayQueue : upcomingQueue;

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchQueue(true);
    setUpdatingId(null);
    setSuccess(`Booking ${newStatus === 'in_progress' ? 'started' : 'completed'}!`);
    setTimeout(() => setSuccess(''), 2500);
  };

  const assignToday = async (id: string) => {
    setUpdatingId(id);
    await supabase.from('bookings').update({ scheduled_date: todayStr, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchQueue(true);
    setUpdatingId(null);
    setSuccess('Assigned to today!');
    setTimeout(() => setSuccess(''), 2500);
  };

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const inProgressCount = bookings.filter(b => b.status === 'in_progress').length;
  const todayCount = todayQueue.length;

  return (
    <DashboardLayout title="Workshop Queue" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-400" /> Workshop Queue
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {bookings.length} active job{bookings.length !== 1 ? 's' : ''} in queue
            </p>
          </div>
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {success && <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Active',  value: bookings.length,  icon: Layers,  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: "Today's Jobs",  value: todayCount,       icon: Clock,   color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'In Progress',   value: inProgressCount,  icon: Wrench,  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Confirmed',     value: confirmedCount,   icon: Users,   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs font-medium">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
          {(['today', 'upcoming'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {mode === 'today' ? `Today (${todayQueue.length})` : `Upcoming (${upcomingQueue.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>
        ) : displayQueue.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{viewMode === 'today' ? 'No jobs scheduled for today.' : 'No upcoming jobs in queue.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                IN PROGRESS ({displayQueue.filter(b => b.status === 'in_progress').length})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                CONFIRMED ({displayQueue.filter(b => b.status === 'confirmed').length})
              </div>
            </div>

            {[...displayQueue].sort((a, b) => {
              if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
              if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
              return 0;
            }).map((booking, idx) => {
              const isInProgress = booking.status === 'in_progress';
              const isUpdating = updatingId === booking.id;
              const position = idx + 1;
              const avgMin = booking.services?.duration_minutes ?? AVG_DURATION_MIN;

              return (
                <div
                  key={booking.id}
                  className={`bg-gray-800 border rounded-xl p-4 transition-all ${isInProgress ? 'border-orange-500/40 bg-orange-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${isInProgress ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      #{position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-blue-400 font-mono text-xs">{booking.booking_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isInProgress ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                              {isInProgress ? 'In Progress' : 'Confirmed'}
                            </span>
                          </div>
                          <p className="text-white font-semibold">{booking.profiles?.full_name ?? 'Unknown'}</p>
                          {booking.vehicles && (
                            <p className="text-gray-400 text-sm">{booking.vehicles.make} {booking.vehicles.model} · <span className="font-mono">{booking.vehicles.registration_number}</span></p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {booking.scheduled_time && (
                            <p className="text-white text-sm font-medium">{formatTime(booking.scheduled_time)}</p>
                          )}
                          {booking.scheduled_date !== todayStr && (
                            <p className="text-gray-500 text-xs">{new Date(booking.scheduled_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {booking.services?.name && (
                            <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />{booking.services.name}</span>
                          )}
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{waitEstimate(position, avgMin)}</span>
                        </div>
                        <div className="flex gap-2">
                          {booking.status === 'confirmed' && (
                            <>
                              {booking.scheduled_date !== todayStr && (
                                <button
                                  onClick={() => assignToday(booking.id)}
                                  disabled={isUpdating}
                                  className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Clock className="w-3.5 h-3.5" /> Assign Today
                                </button>
                              )}
                              <button
                                onClick={() => updateStatus(booking.id, 'in_progress')}
                                disabled={isUpdating}
                                className="flex items-center gap-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Play className="w-3.5 h-3.5" /> {isUpdating ? 'Starting...' : 'Start'}
                              </button>
                            </>
                          )}
                          {booking.status === 'in_progress' && (
                            <button
                              onClick={() => updateStatus(booking.id, 'completed')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> {isUpdating ? 'Completing...' : 'Complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
