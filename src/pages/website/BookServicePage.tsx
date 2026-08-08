import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { supabase, Service } from '../../lib/supabase';
import {
  Calendar, Clock, Wrench, CheckCircle, ChevronRight, AlertCircle,
  User, Phone, Mail, MapPin, Car, ArrowLeft, Zap
} from 'lucide-react';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function BookServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_number: '',
    service_id: '',
    scheduled_date: '',
    scheduled_time: '',
    pickup_required: false,
    pickup_address: '',
    special_instructions: '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('services').select('*').eq('is_active', true).order('category');
      setServices(data ?? []);
      setLoading(false);
    })();
  }, []);

  const selectedService = services.find(s => s.id === form.service_id);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name || !form.customer_phone || !form.service_id || !form.scheduled_date || !form.scheduled_time) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    const vehicleInfo = `${form.vehicle_make} ${form.vehicle_model} (${form.vehicle_number})`.trim();
    const basePrice = selectedService?.base_price ?? 0;
    const pickupCost = form.pickup_required ? 299 : 0;
    const subtotal = basePrice + pickupCost;
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;

    const { data, error: insertError } = await supabase.from('bookings').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      customer_address: form.customer_address,
      vehicle_info: vehicleInfo,
      service_id: form.service_id,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      pickup_required: form.pickup_required,
      pickup_address: form.pickup_address,
      special_instructions: form.special_instructions,
      estimated_cost: subtotal + gstAmount,
      gst_percentage: 18.0,
      gst_amount: gstAmount,
      status: 'pending',
    }).select().single();

    if (insertError) {
      setError('Something went wrong. Please try again or call us.');
      setSubmitting(false);
      return;
    }

    setBookingRef(data.booking_number);
    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50 dark:from-slate-950 dark:to-slate-900 px-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Request Received!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Your booking reference number is:</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-6">{bookingRef}</p>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 text-left text-sm space-y-2">
              <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">Name:</strong> {form.customer_name}</p>
              <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">Phone:</strong> {form.customer_phone}</p>
              <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">Service:</strong> {selectedService?.name}</p>
              <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">Date:</strong> {form.scheduled_date} at {form.scheduled_time}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Our team will contact you shortly to confirm your booking. Save your reference number for future updates.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/" className="px-6 py-3 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">
                Back to Home
              </Link>
              <button onClick={() => { setSuccess(false); setForm({ customer_name: '', customer_phone: '', customer_email: '', customer_address: '', vehicle_make: '', vehicle_model: '', vehicle_number: '', service_id: '', scheduled_date: '', scheduled_time: '', pickup_required: false, pickup_address: '', special_instructions: '' }); }}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold text-sm">
                Book Another
              </button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 rounded-full px-4 py-1.5 mb-3">
              <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-400 text-sm font-medium">Book Your Service</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Book a Service</h1>
            <p className="text-gray-500 dark:text-gray-400">Fill in your details and we'll get back to you to confirm. No account needed.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-red-600 dark:text-red-400" /> Your Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                  <input type="text" required value={form.customer_name}
                    onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                  <input type="tel" required value={form.customer_phone}
                    onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="629182859" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email (optional)</label>
                  <input type="email" value={form.customer_email}
                    onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                  <input type="text" value={form.customer_address}
                    onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="Your address" />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-red-600 dark:text-red-400" /> Vehicle Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Make</label>
                  <input type="text" value={form.vehicle_make}
                    onChange={e => setForm(p => ({ ...p, vehicle_make: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="Maruti" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Model</label>
                  <input type="text" value={form.vehicle_model}
                    onChange={e => setForm(p => ({ ...p, vehicle_model: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="Swift" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reg. Number</label>
                  <input type="text" value={form.vehicle_number}
                    onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                    placeholder="WB01 AB 1234" />
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600 dark:text-red-400" /> Choose a Service *
              </h2>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}</div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {services.map(s => (
                    <button key={s.id} type="button" onClick={() => setForm(p => ({ ...p, service_id: s.id }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        form.service_id === s.id ? 'border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                          <span className="font-bold text-red-600 dark:text-red-400">₹{s.base_price.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <span className="capitalize bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">{s.category}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>
                        </div>
                      </div>
                      {form.service_id === s.id && <CheckCircle className="w-5 h-5 text-red-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" /> Preferred Date & Time *
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Date *</label>
                  <input type="date" required min={minDateStr} value={form.scheduled_date}
                    onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Slot *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {timeSlots.map(t => (
                      <button key={t} type="button" onClick={() => setForm(p => ({ ...p, scheduled_time: t }))}
                        className={`py-2.5 text-sm rounded-lg border-2 font-medium transition-all ${
                          form.scheduled_time === t ? 'border-red-600 bg-red-600 text-white' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-red-300'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup & Instructions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" /> Pickup & Special Instructions
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.pickup_required}
                      onChange={e => setForm(p => ({ ...p, pickup_required: e.target.checked }))}
                      className="w-4 h-4 rounded text-red-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">I need pickup service (+ ₹299)</span>
                  </label>
                  {form.pickup_required && (
                    <input type="text" value={form.pickup_address}
                      onChange={e => setForm(p => ({ ...p, pickup_address: e.target.value }))}
                      className="mt-2 w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500"
                      placeholder="Enter pickup address" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions</label>
                  <textarea rows={3} value={form.special_instructions}
                    onChange={e => setForm(p => ({ ...p, special_instructions: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none"
                    placeholder="Any specific concerns or instructions..." />
                </div>
              </div>
            </div>

            {/* Summary */}
            {selectedService && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Service</span><span className="font-medium text-gray-900 dark:text-white">{selectedService.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Base Price</span><span className="font-medium text-gray-900 dark:text-white">₹{selectedService.base_price.toLocaleString('en-IN')}</span></div>
                  {form.pickup_required && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Pickup</span><span className="font-medium text-gray-900 dark:text-white">₹299</span></div>}
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">GST (18%)</span><span className="font-medium text-gray-900 dark:text-white">₹{Math.round(((selectedService.base_price + (form.pickup_required ? 299 : 0)) * 0.18) * 100) / 100}</span></div>
                  <div className="border-t border-red-200 dark:border-red-800 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Estimated Total</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-lg">
                      ₹{Math.round((selectedService.base_price + (form.pickup_required ? 299 : 0)) * 1.18 * 100) / 100}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Final price may vary based on actual work. GST invoice will be provided.</p>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30">
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Submit Booking Request</>}
            </button>
          </form>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
