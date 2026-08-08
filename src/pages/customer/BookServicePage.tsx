import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase, Vehicle, Service } from '../../lib/supabase';
import { Calendar, Clock, Car, Wrench, MapPin, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function BookServicePage() {
  const { user } = useAuth();
  const location = useLocation();
  const preselectedService = (location.state as any)?.serviceId;

  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    vehicle_id: '',
    service_id: preselectedService ?? '',
    scheduled_date: '',
    scheduled_time: '',
    pickup_required: false,
    pickup_address: '',
    drop_required: false,
    drop_address: '',
    special_instructions: '',
    coupon_code: '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: v }, { data: s }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('owner_id', user.id),
        supabase.from('services').select('*').eq('is_active', true).order('category'),
      ]);
      setVehicles(v ?? []);
      setServices(s ?? []);
      setLoading(false);
    })();
  }, [user]);

  const selectedService = services.find(s => s.id === form.service_id);
  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    const { error } = await supabase.from('bookings').insert({
      customer_id: user!.id,
      vehicle_id: form.vehicle_id,
      service_id: form.service_id,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      pickup_required: form.pickup_required,
      pickup_address: form.pickup_address,
      drop_required: form.drop_required,
      drop_address: form.drop_address,
      special_instructions: form.special_instructions,
      estimated_cost: (selectedService?.base_price ?? 0) + (form.pickup_required ? 299 : 0) + (form.drop_required ? 299 : 0),
      status: 'pending',
    });
    if (error) { setError(error.message); setSubmitting(false); return; }
    setSuccess('Booking confirmed! We will call you shortly to confirm.');
    setStep(5);
    setSubmitting(false);
  };

  const steps = ['Select Vehicle', 'Choose Service', 'Pick Date & Time', 'Extras & Review'];

  return (
    <DashboardLayout title="Book a Service" variant="customer">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">

        {/* Progress */}
        {step <= 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i + 1 < step ? 'bg-blue-600 text-white' : i + 1 === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < steps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${i + 1 < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="hidden sm:flex justify-between text-xs text-gray-500 mt-1">
              {steps.map(s => <span key={s} className="text-center flex-1">{s}</span>)}
            </div>
            <p className="text-sm text-gray-500 text-center mt-2 sm:hidden">Step {step}: {steps[step - 1]}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Car className="w-5 h-5 text-blue-600" /> Select Your Vehicle</h2>
            {loading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">No vehicles added. Please add a vehicle first.</p>
                <a href="/customer/vehicles" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Add Vehicle</a>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map(v => (
                  <button key={v.id} onClick={() => setForm(p => ({ ...p, vehicle_id: v.id }))}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      form.vehicle_id === v.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.vehicle_id === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{v.make} {v.model} ({v.year})</p>
                      <p className="text-sm text-gray-500">{v.license_plate} · {v.fuel_type} · {v.transmission}</p>
                    </div>
                    {form.vehicle_id === v.id && <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
            <button disabled={!form.vehicle_id} onClick={() => setStep(2)}
              className="w-full mt-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Service */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600" /> Choose a Service</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {services.map(s => (
                <button key={s.id} onClick={() => setForm(p => ({ ...p, service_id: s.id }))}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    form.service_id === s.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <span className="font-bold text-blue-600">₹{s.base_price.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{s.category}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>
                    </div>
                  </div>
                  {form.service_id === s.id && <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Back</button>
              <button disabled={!form.service_id} onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Pick Date & Time</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Date *</label>
                <input type="date" required min={minDateStr} value={form.scheduled_date}
                  onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot *</label>
                <div className="grid grid-cols-5 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, scheduled_time: t }))}
                      className={`py-2.5 text-sm rounded-lg border-2 font-medium transition-all ${
                        form.scheduled_time === t ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Back</button>
              <button disabled={!form.scheduled_date || !form.scheduled_time} onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Pickup/Drop */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /> Pickup & Drop Service</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.pickup_required}
                      onChange={e => setForm(p => ({ ...p, pickup_required: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">I need pickup service (+ ₹299)</span>
                  </label>
                  {form.pickup_required && (
                    <input value={form.pickup_address} onChange={e => setForm(p => ({ ...p, pickup_address: e.target.value }))}
                      className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder="Enter pickup address" />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.drop_required}
                      onChange={e => setForm(p => ({ ...p, drop_required: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">I need drop service (+ ₹299)</span>
                  </label>
                  {form.drop_required && (
                    <input value={form.drop_address} onChange={e => setForm(p => ({ ...p, drop_address: e.target.value }))}
                      className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder="Enter drop address" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea rows={3} value={form.special_instructions}
                    onChange={e => setForm(p => ({ ...p, special_instructions: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                    placeholder="Any specific concerns or instructions..." />
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Vehicle', `${selectedVehicle?.make} ${selectedVehicle?.model} (${selectedVehicle?.license_plate})`],
                  ['Service', selectedService?.name ?? ''],
                  ['Date', form.scheduled_date],
                  ['Time', form.scheduled_time],
                  ['Pickup', form.pickup_required ? `Yes - ${form.pickup_address || 'Address required'}` : 'No'],
                  ['Drop', form.drop_required ? `Yes - ${form.drop_address || 'Address required'}` : 'No'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Estimated Total</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ₹{((selectedService?.base_price ?? 0) + (form.pickup_required ? 299 : 0) + (form.drop_required ? 299 : 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Back</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center">
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Confirmed!</h2>
            <p className="text-gray-500 mb-6">{success}</p>
            <div className="flex gap-3 justify-center">
              <a href="/customer/bookings" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                View My Bookings
              </a>
              <button onClick={() => { setStep(1); setForm({ ...defaultForm, vehicle_id: '', service_id: '', scheduled_date: '', scheduled_time: '' } as any); }}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
                Book Another
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const defaultForm = { vehicle_id: '', service_id: '', scheduled_date: '', scheduled_time: '', pickup_required: false, pickup_address: '', drop_required: false, drop_address: '', special_instructions: '', coupon_code: '' };
