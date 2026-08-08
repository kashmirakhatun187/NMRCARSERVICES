import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Plus, ClipboardList, CheckCircle, X } from 'lucide-react';

type ChecklistItem = {
  name: string;
  condition: string;
  notes: string;
};

type ChecklistCategory = {
  label: string;
  items: ChecklistItem[];
};

type Inspection = {
  id: string;
  booking_id: string;
  overall_condition: string;
  status: string;
  created_at: string;
  bookings?: {
    booking_number: string;
    vehicles?: { make: string; model: string; registration_number: string };
    services?: { name: string };
    profiles?: { full_name: string };
  };
};

const CHECKLIST_TEMPLATE: { category: string; items: string[] }[] = [
  { category: 'Engine',     items: ['Oil Level', 'Coolant', 'Air Filter', 'Spark Plugs', 'Belts'] },
  { category: 'Brakes',     items: ['Front Pads', 'Rear Pads', 'Brake Fluid', 'ABS'] },
  { category: 'Tyres',      items: ['Front Left', 'Front Right', 'Rear Left', 'Rear Right', 'Spare'] },
  { category: 'Electrical', items: ['Battery', 'Alternator', 'Lights', 'Horn', 'Wipers'] },
  { category: 'Body',       items: ['Exterior Damage', 'Windscreen', 'Mirrors'] },
  { category: 'Fluids',     items: ['Power Steering', 'Transmission', 'Washer Fluid'] },
];

const conditionConfig: Record<string, { label: string; color: string }> = {
  ok:               { label: 'OK',              color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  needs_attention:  { label: 'Needs Attention', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  critical:         { label: 'Critical',        color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  na:               { label: 'N/A',             color: 'bg-gray-700 text-gray-400' },
};

const overallConfig: Record<string, string> = {
  good:     'bg-green-500/20 text-green-400 border border-green-500/30',
  fair:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  poor:     'bg-red-500/20 text-red-400 border border-red-500/30',
  critical: 'bg-red-600/30 text-red-300 border border-red-600/40',
};

const statusConfig: Record<string, string> = {
  pending:   'bg-gray-700 text-gray-400',
  completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  reviewed:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function buildChecklist(): ChecklistCategory[] {
  return CHECKLIST_TEMPLATE.map(c => ({
    label: c.category,
    items: c.items.map(name => ({ name, condition: '', notes: '' })),
  }));
}

export default function InspectionPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(buildChecklist());
  const [overallCondition, setOverallCondition] = useState('good');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    const [{ data: insp }, { data: bkgs }] = await Promise.all([
      supabase.from('vehicle_inspections')
        .select('*, bookings(booking_number, vehicles(*), services(*), profiles!customer_id(full_name))')
        .order('created_at', { ascending: false }),
      supabase.from('bookings')
        .select('id, booking_number, status, scheduled_date, vehicles(*), services(*), profiles!customer_id(full_name)')
        .in('status', ['confirmed', 'in_progress'])
        .order('scheduled_date'),
    ]);
    setInspections(insp ?? []);
    setBookings(bkgs ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = () => {
    setSelectedBookingId(bookings[0]?.id ?? '');
    setChecklist(buildChecklist());
    setOverallCondition('good');
    setInspectorNotes('');
    setError('');
    setShowModal(true);
  };

  const updateItem = (catIdx: number, itemIdx: number, field: keyof ChecklistItem, value: string) => {
    setChecklist(prev => prev.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        items: cat.items.map((item, ii) =>
          ii !== itemIdx ? item : { ...item, [field]: value }
        ),
      }
    ));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) { setError('Please select a booking.'); return; }
    setSaving(true);
    const checklistData = checklist.map(cat => ({
      category: cat.label,
      items: cat.items.map(i => ({ name: i.name, condition: i.condition || 'na', notes: i.notes })),
    }));
    const { error: err } = await supabase.from('vehicle_inspections').insert({
      booking_id: selectedBookingId,
      checklist: checklistData,
      overall_condition: overallCondition,
      inspector_notes: inspectorNotes,
      status: 'completed',
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess('Inspection saved!');
    setShowModal(false);
    await fetchData();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const criticalCount = (cat: ChecklistCategory) => cat.items.filter(i => i.condition === 'critical').length;
  const attentionCount = (cat: ChecklistCategory) => cat.items.filter(i => i.condition === 'needs_attention').length;

  return (
    <DashboardLayout title="Vehicle Inspections" variant="garage">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-400" /> Vehicle Inspections
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button onClick={openModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Inspection
          </button>
        </div>

        {success && <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm">{success}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No inspections recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inspections.map(insp => {
              const b = insp.bookings;
              return (
                <div key={insp.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-blue-400 font-mono text-sm font-medium">{b?.booking_number ?? '-'}</p>
                      <p className="text-white font-medium">{b?.profiles?.full_name ?? 'Unknown'}</p>
                      <p className="text-gray-400 text-xs">{b?.vehicles ? `${b.vehicles.make} ${b.vehicles.model} · ${b.vehicles.registration_number}` : '-'}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[insp.status] ?? 'bg-gray-700 text-gray-400'}`}>{insp.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${overallConfig[insp.overall_condition] ?? 'bg-gray-700 text-gray-300'}`}>{insp.overall_condition}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{b?.services?.name ?? 'Service'}</span>
                    <span>·</span>
                    <span>{new Date(insp.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-400" /> Vehicle Inspection</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-6">
                {error && <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>}
                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1 block">Select Booking *</label>
                  <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Choose booking...</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.booking_number} — {b.profiles?.full_name} — {b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : 'Vehicle'} ({b.status})
                      </option>
                    ))}
                  </select>
                  {bookings.length === 0 && <p className="text-yellow-400 text-xs mt-1">No confirmed/in-progress bookings available.</p>}
                </div>

                <div className="space-y-5">
                  {checklist.map((cat, ci) => (
                    <div key={cat.label} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-700/50 flex items-center justify-between">
                        <h3 className="text-white font-medium text-sm">{cat.label}</h3>
                        <div className="flex gap-2">
                          {criticalCount(cat) > 0 && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">{criticalCount(cat)} Critical</span>
                          )}
                          {attentionCount(cat) > 0 && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">{attentionCount(cat)} Attention</span>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-700">
                        {cat.items.map((item, ii) => (
                          <div key={item.name} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <span className="sm:col-span-3 text-gray-300 text-sm">{item.name}</span>
                            <div className="sm:col-span-5 flex gap-1.5 flex-wrap">
                              {(['ok', 'needs_attention', 'critical', 'na'] as const).map(cond => (
                                <button
                                  key={cond}
                                  type="button"
                                  onClick={() => updateItem(ci, ii, 'condition', cond)}
                                  className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${item.condition === cond ? conditionConfig[cond].color : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                >
                                  {conditionConfig[cond].label}
                                </button>
                              ))}
                            </div>
                            <input
                              value={item.notes}
                              onChange={e => updateItem(ci, ii, 'notes', e.target.value)}
                              placeholder="Notes..."
                              className="sm:col-span-4 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-2 block">Overall Condition *</label>
                    <div className="flex gap-2 flex-wrap">
                      {['good', 'fair', 'poor', 'critical'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setOverallCondition(c)}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${overallCondition === c ? overallConfig[c] : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Inspector Notes</label>
                    <textarea value={inspectorNotes} onChange={e => setInspectorNotes(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-700">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                    {saving ? 'Saving...' : 'Save Inspection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
