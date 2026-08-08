import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Bell,
  Plus,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Car,
  Clock,
  X,
} from 'lucide-react';

type ReminderType =
  | 'oil_change'
  | 'insurance'
  | 'puc'
  | 'tyre_rotation'
  | 'general_service'
  | 'battery'
  | 'brake'
  | 'custom';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

interface Reminder {
  id: string;
  vehicle_id: string;
  type: ReminderType;
  title: string;
  due_date: string | null;
  due_mileage: number | null;
  notes: string | null;
  is_completed: boolean;
  vehicles: Vehicle;
}

const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  oil_change: 'Oil Change',
  insurance: 'Insurance Renewal',
  puc: 'PUC Certificate',
  tyre_rotation: 'Tyre Rotation',
  general_service: 'General Service',
  battery: 'Battery Check',
  brake: 'Brake Service',
  custom: 'Custom',
};

const getUrgency = (dueDate: string | null, isCompleted: boolean) => {
  if (isCompleted) return 'completed';
  if (!dueDate) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'soon';
  return 'ok';
};

const urgencyConfig = {
  overdue: {
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    label: 'Overdue',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  soon: {
    border: 'border-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    label: 'Due Soon',
    icon: <Clock className="w-4 h-4" />,
  },
  ok: {
    border: 'border-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    label: 'On Track',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  completed: {
    border: 'border-slate-300 dark:border-slate-600',
    badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    label: 'Completed',
    icon: <CheckCircle className="w-4 h-4" />,
  },
};

const defaultForm = {
  vehicle_id: '',
  type: 'oil_change' as ReminderType,
  title: '',
  due_date: '',
  due_mileage: '',
  notes: '',
};

export default function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [remindersRes, vehiclesRes] = await Promise.all([
        supabase
          .from('service_reminders')
          .select('*, vehicles(id, make, model, license_plate)')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .eq('user_id', user.id),
      ]);
      if (remindersRes.error) throw remindersRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      setReminders(remindersRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        vehicle_id: form.vehicle_id || null,
        type: form.type,
        title: form.title,
        due_date: form.due_date || null,
        due_mileage: form.due_mileage ? parseInt(form.due_mileage) : null,
        notes: form.notes || null,
        is_completed: false,
      };
      const { error } = await supabase.from('service_reminders').insert(payload);
      if (error) throw error;
      setShowModal(false);
      setForm(defaultForm);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_reminders')
        .update({ is_completed: true })
        .eq('id', id);
      if (error) throw error;
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_completed: true } : r))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reminder?')) return;
    try {
      const { error } = await supabase.from('service_reminders').delete().eq('id', id);
      if (error) throw error;
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete reminder');
    }
  };

  const active = reminders.filter((r) => !r.is_completed);
  const completed = reminders.filter((r) => r.is_completed);

  return (
    <DashboardLayout variant="customer" title="Service Reminders">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Service Reminders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Stay on top of your vehicle maintenance schedule
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Reminder
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-28"
              />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
              No reminders yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Add your first reminder to stay on top of vehicle maintenance.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </button>
          </div>
        ) : (
          <>
            {/* Active Reminders */}
            {active.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Active ({active.length})
                </h2>
                <div className="space-y-3">
                  {active.map((reminder) => {
                    const urgency = getUrgency(reminder.due_date, reminder.is_completed);
                    const cfg = urgencyConfig[urgency];
                    return (
                      <div
                        key={reminder.id}
                        className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 ${cfg.border} border-t border-r border-b border-slate-200 dark:border-slate-700 p-5 flex items-start justify-between gap-4 shadow-sm`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {reminder.title}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </span>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                              {REMINDER_TYPE_LABELS[reminder.type]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {reminder.vehicles && (
                              <span className="flex items-center gap-1">
                                <Car className="w-3.5 h-3.5" />
                                {reminder.vehicles.make} {reminder.vehicles.model} •{' '}
                                {reminder.vehicles.license_plate}
                              </span>
                            )}
                            {reminder.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Due:{' '}
                                {new Date(reminder.due_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                            {reminder.due_mileage && (
                              <span>At {reminder.due_mileage.toLocaleString()} km</span>
                            )}
                          </div>
                          {reminder.notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                              {reminder.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleMarkComplete(reminder.id)}
                            title="Mark as complete"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            title="Delete"
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed Reminders */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Completed ({completed.length})
                </h2>
                <div className="space-y-3">
                  {completed.map((reminder) => {
                    const cfg = urgencyConfig.completed;
                    return (
                      <div
                        key={reminder.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-start justify-between gap-4 opacity-60"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300 line-through">
                              {reminder.title}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
                            >
                              {cfg.icon}
                              Completed
                            </span>
                          </div>
                          {reminder.vehicles && (
                            <span className="flex items-center gap-1 text-sm text-gray-400">
                              <Car className="w-3.5 h-3.5" />
                              {reminder.vehicles.make} {reminder.vehicles.model}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          title="Delete"
                          className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add Reminder
              </h2>
              <button
                onClick={() => { setShowModal(false); setForm(defaultForm); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddReminder} className="p-6 space-y-4">
              {/* Vehicle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle
                </label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} — {v.license_plate}
                    </option>
                  ))}
                </select>
              </div>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ReminderType })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(REMINDER_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oil change due"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {/* Due Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Mileage (km)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={form.due_mileage}
                  onChange={(e) => setForm({ ...form, due_mileage: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(defaultForm); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
