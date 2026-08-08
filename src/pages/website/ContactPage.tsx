import { useState } from 'react';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: insertError } = await supabase.from('inquiries').insert(form);
    if (insertError) {
      setError('We could not send your message. Please try again.');
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 opacity-25"
            style={{ backgroundImage: "url('https://images.pexels.com/photos/33814734/pexels-photo-33814734.jpeg?auto=compress&cs=tinysrgb&w=940&h=650&dpr=1')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 bg-gray-900/70" />
          <div className="relative text-center">
            <h1 className="text-4xl font-bold text-white mb-3">Contact Us</h1>
            <p className="text-gray-300 text-lg">We're at your service — visit us or reach out anytime.</p>
            <p className="text-red-400 text-sm mt-2 flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
               Mumbai, Maharashtra
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Get In Touch</h2>
              <div className="space-y-6 mb-8">
                {[
                  {
                    icon: <Phone className="w-5 h-5 text-red-600" />,
                    title: 'Phone',
                    lines: ['629182859', 'Mon–Sat: 8:00 AM – 8:00 PM'],
                  },
                  {
                    icon: <Mail className="w-5 h-5 text-red-600" />,
                    title: 'Email',
                    lines: ['support@nmrcarservices.in', 'bookings@nmrcarservices.in'],
                  },
                  {
                    icon: <MapPin className="w-5 h-5 text-red-600" />,
                    title: 'Address',
                    lines: ['Mumbai, Maharashtra'],
                  },
                  {
                    icon: <Clock className="w-5 h-5 text-red-600" />,
                    title: 'Working Hours',
                    lines: ['Mon – Sat: 8:00 AM – 8:00 PM', 'Sunday: 9:00 AM – 5:00 PM'],
                  },
                ].map(item => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-11 h-11 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      {item.lines.map(line => <p key={line} className="text-gray-500 dark:text-gray-400 text-sm">{line}</p>)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Map preview */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-md mb-6 h-48">
                <iframe
                  title="NMR Car Services Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.1244!2d72.8777!3d19.0760!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMumbai%2C+Maharashtra!5e0!3m2!1sen!2sin!4v1600000000000"
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="bg-gray-900 dark:bg-slate-950 rounded-2xl p-6 text-white">
                <h3 className="font-bold mb-2">Emergency Breakdown?</h3>
                <p className="text-gray-300 text-sm mb-4">Available for roadside assistance. Call us immediately and we'll send help.</p>
                <a href="tel:629182859"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm">
                  <Phone className="w-4 h-4" /> Emergency: 629182859
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 shadow-sm">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
                  <p className="text-gray-500 dark:text-gray-400">We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                    className="mt-6 px-5 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Send a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                          placeholder="Your name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                          placeholder="+91 98765 43210" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                      <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white dark:bg-slate-700">
                        <option value="">Select subject</option>
                        <option>Booking Inquiry</option>
                        <option>Service Quote</option>
                        <option>Complaint</option>
                        <option>Partnership</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                      <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
                        placeholder="How can we help you?" />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                      {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
