import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, JobCard, Booking } from '../../lib/supabase';
import { ClipboardList, Plus, X, CheckCircle, Clock, Wrench, User, AlertCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<JobCard | null>(null);
  const [form, setForm] = useState({ booking_id: '', diagnosis: '', work_done: '', technician_notes: '', status: 'open' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    const [{ data: jc }, { data: bk }] = await Promise.all([
      supabase.from('job_cards').select('*, bookings(*, vehicles(*), services(*), profiles!customer_id(*))').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, vehicles(*), services(*), profiles!customer_id(*)').in('status', ['confirmed', 'in_progress']),
    ]);
    setJobCards(jc ?? []);
    setBookings(bk ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setSelected(null); setForm({ booking_id: '', diagnosis: '', work_done: '', technician_notes: '', status: 'open' }); setError(''); setShowModal(true); };
  const openEdit = (jc: JobCard) => { setSelected(jc); setForm({ booking_id: jc.booking_id, diagnosis: jc.diagnosis, work_done: jc.work_done, technician_notes: jc.technician_notes, status: jc.status }); setError(''); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let err;
    if (selected) {
      ({ error: err } = await supabase.from('job_cards').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id));
    } else {
      ({ error: err } = await supabase.from('job_cards').insert(form));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setShowModal(false);
    await fetchData();
    setSaving(false);
  };

  return (
    <DashboardLayout title="Job Cards" variant="garage">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Job Cards</h2>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 text-sm shadow-lg shadow-orange-600/20">
            <Plus className="w-4 h-4" /> New Job Card
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : jobCards.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No job cards yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobCards.map(jc => {
              const booking = (jc as any).bookings;
              return (
                <div key={jc.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-900 font-mono text-sm">{jc.job_number}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{booking?.services?.name}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[jc.status]}`}>
                      {jc.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{booking?.profiles?.full_name ?? '-'}</div>
                    <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-gray-400" />{booking?.vehicles?.make} {booking?.vehicles?.model} ({booking?.vehicles?.license_plate})</div>
                    {jc.diagnosis && <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-700">Diagnosis: </span>{jc.diagnosis}</div>}
                    {jc.work_done && <div className="bg-green-50 rounded-lg px-3 py-2"><span className="font-medium text-green-700">Work Done: </span>{jc.work_done}</div>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                    <span>{new Date(jc.created_at).toLocaleDateString('en-IN')}</span>
                    <button onClick={() => openEdit(jc)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-xs">Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{selected ? 'Edit Job Card' : 'New Job Card'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              {!selected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking *</label>
                  <select required value={form.booking_id} onChange={e => setForm(p => ({ ...p, booking_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 bg-white">
                    <option value="">Select booking...</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.booking_number} – {(b as any).profiles?.full_name} – {(b as any).services?.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 bg-white">
                  {['open', 'in_progress', 'on_hold', 'completed', 'closed'].map(s => (
                    <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <textarea rows={2} value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Vehicle diagnosis..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Done</label>
                <textarea rows={2} value={form.work_done} onChange={e => setForm(p => ({ ...p, work_done: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Work performed..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technician Notes</label>
                <textarea rows={2} value={form.technician_notes} onChange={e => setForm(p => ({ ...p, technician_notes: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Internal notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (selected ? 'Update' : 'Create Job Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
