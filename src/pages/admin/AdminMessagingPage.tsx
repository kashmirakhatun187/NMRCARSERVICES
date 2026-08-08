import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Customer, CustomerMessage, Booking } from '../../lib/supabase';
import {
  MessageSquare, Send, Search, X, AlertCircle, CheckCircle,
  MessageCircle, Smartphone, Mail, Clock, User
} from 'lucide-react';

const templates = [
  { id: 'service_completed', title: 'Service Completed', body: 'Dear {name}, your car service has been completed. Please collect your vehicle. Total amount: {amount}. Thank you for choosing NMR Car Services!' },
  { id: 'booking_confirmed', title: 'Booking Confirmed', body: 'Dear {name}, your booking ({booking}) has been confirmed for {date} at {time}. Thank you for choosing NMR Car Services!' },
  { id: 'ready_pickup', title: 'Ready for Pickup', body: 'Dear {name}, your vehicle is ready for pickup at our workshop. Please collect it at your convenience. Thank you!' },
  { id: 'payment_reminder', title: 'Payment Reminder', body: 'Dear {name}, this is a reminder that your payment of {amount} is pending. Please complete the payment at your earliest convenience. Thank you!' },
  { id: 'custom', title: 'Custom Message', body: '' },
];

export default function AdminMessagingPage() {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    channel: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
    template_id: 'service_completed',
    subject: '',
    body: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: msgs }, { data: custs }, { data: bks }] = await Promise.all([
      supabase.from('customer_messages').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('customers').select('*').order('full_name'),
      supabase.from('bookings').select('*, services(*)').order('created_at', { ascending: false }).limit(20),
    ]);
    setMessages(msgs ?? []);
    setCustomers(custs ?? []);
    setBookings(bks ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredMsgs = messages.filter(m =>
    m.body.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const selectedBooking = bookings.find(b => b.customer_phone === selectedCustomer?.phone);

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    let body = tpl.body;
    const name = selectedCustomer?.full_name ?? 'Customer';
    const amount = selectedBooking ? `₹${Number(selectedBooking.estimated_cost).toLocaleString('en-IN')}` : '';
    const booking = selectedBooking?.booking_number ?? '';
    const date = selectedBooking?.scheduled_date ?? '';
    const time = selectedBooking?.scheduled_time ?? '';
    body = body.replace('{name}', name).replace('{amount}', amount).replace('{booking}', booking).replace('{date}', date).replace('{time}', time);
    setForm(p => ({ ...p, template_id: templateId, body }));
  };

  const openNew = () => {
    setForm({ customer_id: '', channel: 'whatsapp', template_id: 'service_completed', subject: '', body: '' });
    setShowModal(true);
  };

  const handleSend = async () => {
    setError('');
    if (!form.customer_id || !form.body) { setError('Select a customer and write a message.'); return; }
    setSending(true);

    let messageBody = form.body;

    // Generate links for WhatsApp/SMS
    if (form.channel === 'whatsapp') {
      const phone = selectedCustomer?.phone.replace(/[^0-9]/g, '');
      const text = encodeURIComponent(messageBody);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else if (form.channel === 'sms') {
      const phone = selectedCustomer?.phone.replace(/[^0-9]/g, '');
      window.open(`sms:${phone}?body=${encodeURIComponent(messageBody)}`, '_blank');
    } else if (form.channel === 'email' && selectedCustomer?.email) {
      const subject = form.subject || 'NMR Car Services';
      window.open(`mailto:${selectedCustomer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`, '_blank');
    }

    // Save message record
    const { error } = await supabase.from('customer_messages').insert({
      customer_id: form.customer_id,
      channel: form.channel,
      subject: form.subject,
      body: messageBody,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    if (error) { setError(error.message); setSending(false); return; }
    setSending(false);
    setShowModal(false);
    load();
  };

  const channelIcons: Record<string, React.ReactNode> = {
    whatsapp: <MessageCircle className="w-4 h-4 text-green-600" />,
    sms: <Smartphone className="w-4 h-4 text-blue-600" />,
    email: <Mail className="w-4 h-4 text-orange-600" />,
  };

  return (
    <DashboardLayout title="Customer Messaging" variant="admin">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Messaging</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Send messages to customers via WhatsApp, SMS, or Email.</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            <Send className="w-4 h-4" /> New Message
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search messages..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1"><MessageCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</span></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{messages.filter(m => m.channel === 'whatsapp').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Smartphone className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500 dark:text-gray-400">SMS</span></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{messages.filter(m => m.channel === 'sms').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-orange-600" /><span className="text-xs text-gray-500 dark:text-gray-400">Email</span></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{messages.filter(m => m.channel === 'email').length}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : filteredMsgs.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No messages sent yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMsgs.map(m => {
              const customer = customers.find(c => c.id === m.customer_id);
              return (
                <div key={m.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    {channelIcons[m.channel]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{customer?.full_name ?? 'Unknown'}</p>
                      <span className="text-xs text-gray-400">{m.channel.toUpperCase()}</span>
                      {m.status === 'sent' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                    {m.subject && <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{m.subject}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{m.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send Message Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="font-bold text-gray-900 dark:text-white">Send Message</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl px-4 py-2.5 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Customer *</label>
                <select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500">
                  <option value="">— Choose customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                </select>
              </div>

              {selectedCustomer && (
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 text-sm">
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><User className="w-4 h-4" /> {selectedCustomer.full_name}</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.email}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Channel *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['whatsapp', 'sms', 'email'] as const).map(ch => (
                    <button key={ch} type="button" onClick={() => setForm(p => ({ ...p, channel: ch }))}
                      className={`py-2.5 rounded-lg border-2 text-sm font-medium capitalize flex items-center justify-center gap-1.5 transition-all ${
                        form.channel === ch ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'
                      }`}>
                      {channelIcons[ch]} {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Template</label>
                <select value={form.template_id} onChange={e => applyTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500">
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              {form.channel === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" placeholder="Email subject" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                <textarea rows={5} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none" placeholder="Type your message..." />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>The message will open in your {form.channel === 'whatsapp' ? 'WhatsApp' : form.channel === 'sms' ? 'SMS' : 'email'} app with the content pre-filled. Just hit send.</span>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleSend} disabled={sending} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Open & Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
