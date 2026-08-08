import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { UserCheck, UserX, Clock, Calendar, Users } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  phone?: string;
};

type Attendance = {
  id: string;
  mechanic_id: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  check_in?: string;
  check_out?: string;
  notes?: string;
};

const statusConfig = {
  present:  { label: 'Present',  color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  absent:   { label: 'Absent',   color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  half_day: { label: 'Half Day', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  leave:    { label: 'Leave',    color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
};

export default function AttendancePage() {
  const [mechanics, setMechanics] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: att }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, phone').in('role', ['mechanic', 'staff']).order('full_name'),
      supabase.from('attendance').select('*').eq('date', selectedDate),
    ]);
    setMechanics(profiles ?? []);
    setAttendance(att ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  const getAttendanceForMechanic = (mechanicId: string) =>
    attendance.find(a => a.mechanic_id === mechanicId);

  const markAttendance = async (mechanicId: string, status: Attendance['status']) => {
    setSaving(mechanicId);
    const existing = getAttendanceForMechanic(mechanicId);
    const payload = {
      mechanic_id: mechanicId,
      date: selectedDate,
      status,
      check_in: status === 'present' || status === 'half_day' ? existing?.check_in ?? new Date().toTimeString().slice(0, 5) : null,
      check_out: existing?.check_out ?? null,
    };
    if (existing) {
      await supabase.from('attendance').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('attendance').insert(payload);
    }
    await fetchData();
    setSaving(null);
    setSuccess('Attendance updated!');
    setTimeout(() => setSuccess(''), 2500);
  };

  const updateTime = async (attendanceId: string, field: 'check_in' | 'check_out', value: string) => {
    await supabase.from('attendance').update({ [field]: value }).eq('id', attendanceId);
    await fetchData();
  };

  const stats = {
    present:  attendance.filter(a => a.status === 'present').length,
    absent:   attendance.filter(a => a.status === 'absent').length,
    half_day: attendance.filter(a => a.status === 'half_day').length,
    leave:    attendance.filter(a => a.status === 'leave').length,
    unmarked: mechanics.length - attendance.length,
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout title="Mechanic Attendance" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Mechanic Attendance</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isToday ? "Today's attendance" : `Attendance for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Present',  value: stats.present,  icon: UserCheck, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Absent',   value: stats.absent,   icon: UserX,     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Half Day', value: stats.half_day, icon: Clock,     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'On Leave', value: stats.leave,    icon: Calendar,  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            { label: 'Unmarked', value: stats.unmarked, icon: Users,     color: 'text-gray-400',   bg: 'bg-gray-700/50 border-gray-600/30' },
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

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
          </div>
        ) : mechanics.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No mechanics or staff found.</p>
          </div>
        ) : (
          <>
            {/* Mechanic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mechanics.map(m => {
                const att = getAttendanceForMechanic(m.id);
                const isSaving = saving === m.id;
                return (
                  <div key={m.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
                    {/* Name & Role */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                          {m.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm leading-tight">{m.full_name}</p>
                          <p className="text-gray-500 text-xs capitalize">{m.role}</p>
                        </div>
                      </div>
                      {att && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusConfig[att.status].color}`}>
                          {statusConfig[att.status].label}
                        </span>
                      )}
                    </div>

                    {/* Check-in / Check-out */}
                    {att && (att.status === 'present' || att.status === 'half_day') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Check In</label>
                          <input
                            type="time"
                            value={att.check_in ?? ''}
                            onChange={e => updateTime(att.id, 'check_in', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Check Out</label>
                          <input
                            type="time"
                            value={att.check_out ?? ''}
                            onChange={e => updateTime(att.id, 'check_out', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['present', 'absent', 'half_day', 'leave'] as const).map(s => (
                        <button
                          key={s}
                          disabled={isSaving}
                          onClick={() => markAttendance(m.id, s)}
                          className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                            att?.status === s
                              ? statusConfig[s].color + ' font-bold'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {isSaving ? '...' : statusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attendance Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h2 className="text-white font-semibold">Attendance Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-700/50">
                      <th className="text-left text-gray-400 font-medium px-4 py-3">#</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Name</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Role</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Check In</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Check Out</th>
                      <th className="text-left text-gray-400 font-medium px-4 py-3">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {mechanics.map((m, idx) => {
                      const att = getAttendanceForMechanic(m.id);
                      const hours = att?.check_in && att?.check_out
                        ? (() => {
                            const [ih, im] = att.check_in.split(':').map(Number);
                            const [oh, om] = att.check_out.split(':').map(Number);
                            const diff = (oh * 60 + om) - (ih * 60 + im);
                            return diff > 0 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : '-';
                          })()
                        : '-';
                      return (
                        <tr key={m.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">{m.full_name}</td>
                          <td className="px-4 py-3 text-gray-400 capitalize">{m.role}</td>
                          <td className="px-4 py-3">
                            {att ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[att.status].color}`}>
                                {statusConfig[att.status].label}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Unmarked</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{att?.check_in ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-300">{att?.check_out ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-300">{hours}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
