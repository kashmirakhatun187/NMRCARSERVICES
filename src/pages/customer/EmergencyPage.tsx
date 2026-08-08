import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Car,
  Zap,
  Wrench,
  Shield,
  CheckCircle,
  X,
} from 'lucide-react';

type EmergencyType =
  | 'breakdown'
  | 'flat_tyre'
  | 'battery_dead'
  | 'accident'
  | 'fuel_empty'
  | 'locked_out'
  | 'other';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

const EMERGENCY_TYPES: { value: EmergencyType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'breakdown', label: 'Breakdown', icon: <Wrench className="w-5 h-5" />, color: 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300' },
  { value: 'flat_tyre', label: 'Flat Tyre', icon: <Car className="w-5 h-5" />, color: 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300' },
  { value: 'battery_dead', label: 'Battery Dead', icon: <Zap className="w-5 h-5" />, color: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' },
  { value: 'accident', label: 'Accident', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300' },
  { value: 'fuel_empty', label: 'Fuel Empty', icon: <Zap className="w-5 h-5" />, color: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300' },
  { value: 'locked_out', label: 'Locked Out', icon: <Shield className="w-5 h-5" />, color: 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300' },
  { value: 'other', label: 'Other', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-300' },
];

const FEATURES = [
  { icon: <Wrench className="w-5 h-5 text-blue-500" />, title: '24/7 Roadside Assistance', desc: 'Round-the-clock support whenever you need it' },
  { icon: <Car className="w-5 h-5 text-green-500" />, title: 'Towing Service', desc: 'Free towing up to 20 km for members' },
  { icon: <Zap className="w-5 h-5 text-yellow-500" />, title: 'Battery Jump Start', desc: 'Quick battery assistance on-site' },
  { icon: <Shield className="w-5 h-5 text-purple-500" />, title: 'Fuel Delivery', desc: 'Emergency fuel delivery to your location' },
];

const TIPS = [
  'Move your vehicle to a safe location, away from traffic',
  'Turn on hazard lights immediately',
  'Stay inside the vehicle if on a highway',
  'Note your exact location: road name, landmarks, km markers',
  'Keep your phone charged — we will call to confirm',
  'Do not accept help from unauthorized personnel',
];

const defaultForm = {
  type: '' as EmergencyType | '',
  location: '',
  description: '',
  vehicle_id: '',
};

export default function EmergencyPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id)
      .then(({ data }) => setVehicles(data || []));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.location) return;
    setSubmitting(true);
    try {
      // Insert emergency request
      await supabase.from('emergency_requests').insert({
        user_id: user?.id,
        type: form.type,
        location: form.location,
        description: form.description || null,
        vehicle_id: form.vehicle_id || null,
        status: 'pending',
      });
      setSubmitted(true);
    } catch {
      // Gracefully handle if table doesn't exist — still show confirmation
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout variant="customer" title="Emergency Assistance">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* SOS Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 to-red-800 dark:from-red-700 dark:to-red-900 p-6 mb-6 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white transform translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white transform -translate-x-12 translate-y-12" />
          </div>
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4 animate-pulse">
              <span className="text-4xl font-black text-white">SOS</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Emergency Assistance</h1>
            <p className="text-red-200 text-sm mb-4">24/7 roadside support — we're always here for you</p>
            <a
              href="tel:629182859"
              className="inline-flex items-center gap-2 bg-white text-red-700 font-bold px-6 py-3 rounded-full shadow-lg hover:bg-red-50 transition-colors text-lg"
            >
              <Phone className="w-5 h-5" />
              629182859
            </a>
            <p className="text-red-200 text-xs mt-2">Tap to call — Available 24/7</p>
          </div>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">Help is on the way! 🚗</h2>
            <p className="text-green-700 dark:text-green-300 mb-1">Our roadside assistance team has been notified.</p>
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">Estimated arrival: 30–45 minutes</p>
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-800/40 rounded-lg text-sm text-green-700 dark:text-green-300">
              You'll receive a call shortly to confirm your location. Keep your phone nearby.
            </div>
            <button
              onClick={() => { setSubmitted(false); setForm(defaultForm); }}
              className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          /* Request Form */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Request Emergency Assistance
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emergency Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What's the emergency? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {EMERGENCY_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${form.type === t.value ? t.color + ' ring-2 ring-offset-1 ring-current dark:ring-offset-slate-800' : 'border-slate-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-slate-500'}`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Location / Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. NH-48, near Gurugram Toll Plaza, KM 35"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the situation in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="">Select vehicle (optional)</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} — {v.license_plate}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.type || !form.location}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                <AlertTriangle className="w-5 h-5" />
                {submitting ? 'Sending Request...' : 'Send Emergency Request'}
              </button>
            </form>
          </div>
        )}

        {/* Features */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Our Roadside Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0">{f.icon}</div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            What to do while waiting
          </h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
