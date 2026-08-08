import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase, Invoice, Booking } from '../../lib/supabase';
import {
  FileText, Plus, Search, X, Save, AlertCircle, Download, Printer,
  IndianRupee, Calendar, User, Phone, Car, CheckCircle
} from 'lucide-react';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState({
    booking_id: '',
    customer_name: '', customer_phone: '', customer_email: '', customer_address: '',
    subtotal: 0, discount: 0, tax_rate: 18, notes: '',
    line_items: [] as { description: string; quantity: number; rate: number; amount: number }[],
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').in('status', ['completed', 'in_progress']).order('created_at', { ascending: false });
    setBookings(data ?? []);
  };

  const openNew = () => {
    loadBookings();
    setForm({ booking_id: '', customer_name: '', customer_phone: '', customer_email: '', customer_address: '', subtotal: 0, discount: 0, tax_rate: 18, notes: '', line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }] });
    setShowModal(true);
  };

  const selectBooking = (b: Booking) => {
    setForm(p => ({
      ...p,
      booking_id: b.id,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      customer_email: b.customer_email,
      customer_address: b.customer_address,
      line_items: [{ description: b.services?.name ?? 'Service', quantity: 1, rate: Number(b.estimated_cost) - Number(b.gst_amount), amount: Number(b.estimated_cost) - Number(b.gst_amount) }],
    }));
  };

  const updateLineItem = (i: number, field: string, value: string | number) => {
    setForm(p => {
      const items = [...p.line_items];
      items[i] = { ...items[i], [field]: value };
      items[i].amount = items[i].quantity * items[i].rate;
      return { ...p, line_items: items };
    });
  };

  const addLineItem = () => setForm(p => ({ ...p, line_items: [...p.line_items, { description: '', quantity: 1, rate: 0, amount: 0 }] }));
  const removeLineItem = (i: number) => setForm(p => ({ ...p, line_items: p.line_items.filter((_, idx) => idx !== i) }));

  const subtotal = form.line_items.reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = subtotal - form.discount;
  const taxAmount = Math.round(taxableAmount * (form.tax_rate / 100) * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleSave = async () => {
    setError('');
    if (!form.customer_name || !form.customer_phone) { setError('Customer name and phone are required.'); return; }
    if (form.line_items.length === 0 || form.line_items.every(i => !i.description)) { setError('Add at least one line item.'); return; }
    setSaving(true);
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const { error } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      booking_id: form.booking_id || null,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      customer_address: form.customer_address,
      subtotal: subtotal,
      discount: form.discount,
      tax_rate: form.tax_rate,
      tax_amount: taxAmount,
      total: total,
      payment_status: 'unpaid',
      line_items: form.line_items,
      notes: form.notes,
      status: 'issued',
    });
    if (error) setError(error.message);
    else { setShowModal(false); load(); }
    setSaving(false);
  };

  const markPaid = async (inv: Invoice) => {
    await supabase.from('invoices').update({ payment_status: 'paid', paid_at: new Date().toISOString(), amount_paid: inv.total }).eq('id', inv.id);
    load();
  };

  const filtered = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (i.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.customer_phone ?? '').includes(search)
  );

  const statusColors: Record<string, string> = {
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <DashboardLayout title="Invoices & GST Billing" variant="admin">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoices & GST Billing</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create GST-compliant invoices with automatic tax calculation.</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by invoice number, customer name, or phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-red-500" />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No invoices yet. Create your first invoice.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Invoice #</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Total</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtered.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inv.invoice_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{inv.customer_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{inv.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">₹{Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.payment_status] ?? statusColors.unpaid}`}>{inv.payment_status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View"><FileText className="w-4 h-4" /></button>
                          {inv.payment_status !== 'paid' && (
                            <button onClick={() => markPaid(inv)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Mark Paid"><CheckCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="font-bold text-gray-900 dark:text-white">Create GST Invoice</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl px-4 py-2.5 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

              {bookings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link to Booking (optional)</label>
                  <select value={form.booking_id} onChange={e => { const b = bookings.find(x => x.id === e.target.value); if (b) selectBooking(b); else setForm(p => ({ ...p, booking_id: '' })); }}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500">
                    <option value="">— Select a booking —</option>
                    {bookings.map(b => <option key={b.id} value={b.id}>{b.booking_number} - {b.customer_name} ({b.customer_phone})</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                  <input type="text" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <input type="tel" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <input type="text" value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                  <button onClick={addLineItem} className="text-xs text-red-600 font-medium hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {form.line_items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" placeholder="Description" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500" />
                      <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))}
                        className="w-16 px-2 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500 text-center" />
                      <input type="number" min="0" placeholder="Rate" value={item.rate} onChange={e => updateLineItem(i, 'rate', Number(e.target.value))}
                        className="w-24 px-2 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500 text-right" />
                      <span className="w-24 text-right text-sm font-medium text-gray-700 dark:text-gray-300">₹{item.amount.toLocaleString('en-IN')}</span>
                      <button onClick={() => removeLineItem(i)} className="p-1 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Total */}
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Subtotal</span><span className="font-medium text-gray-900 dark:text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Discount</span>
                  <input type="number" min="0" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))}
                    className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm text-right focus:outline-none focus:border-red-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">GST Rate (%)</span>
                  <input type="number" min="0" max="28" value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: Number(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm text-right focus:outline-none focus:border-red-500" />
                </div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">GST Amount</span><span className="font-medium text-gray-900 dark:text-white">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="border-t border-gray-200 dark:border-slate-600 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Total (incl. GST)</span>
                  <span className="font-bold text-red-600 dark:text-red-400 text-lg">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none" placeholder="Payment terms, etc." />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Create Invoice</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewInvoice(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Invoice {viewInvoice.invoice_number}</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Printer className="w-5 h-5" /></button>
                <button onClick={() => setViewInvoice(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6">
              {/* Invoice content */}
              <div className="text-center mb-6">
                <img src="https://images.pexels.com/photos/30751895/pexels-photo-30751895.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1" alt="NMR Car Services" className="w-14 h-14 rounded-xl object-cover mx-auto mb-2" />
                <h2 className="font-bold text-gray-900">NMR Car Services</h2>
                <p className="text-xs text-gray-500">Mumbai, Maharashtra</p>
                <p className="text-xs text-gray-500">Phone: 629182859 | GSTIN: 19AABCX1234M1Z5</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Bill To:</p>
                  <p className="font-semibold text-gray-900">{viewInvoice.customer_name}</p>
                  <p className="text-gray-600">{viewInvoice.customer_phone}</p>
                  {viewInvoice.customer_email && <p className="text-gray-600">{viewInvoice.customer_email}</p>}
                  {viewInvoice.customer_address && <p className="text-gray-600">{viewInvoice.customer_address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Invoice Date:</p>
                  <p className="text-gray-900">{new Date(viewInvoice.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400 mt-2 mb-1">Status:</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewInvoice.payment_status]}`}>{viewInvoice.payment_status}</span>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Description</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Rate</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewInvoice.line_items as any[])?.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{item.description}</td>
                      <td className="text-center px-3 py-2 text-gray-600">{item.quantity}</td>
                      <td className="text-right px-3 py-2 text-gray-600">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                      <td className="text-right px-3 py-2 font-medium text-gray-900">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="text-gray-900">₹{Number(viewInvoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                {Number(viewInvoice.discount) > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-gray-900">-₹{Number(viewInvoice.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between"><span className="text-gray-600">GST ({viewInvoice.tax_rate}%)</span><span className="text-gray-900">₹{Number(viewInvoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold"><span className="text-gray-900">Total</span><span className="text-red-600">₹{Number(viewInvoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </div>
              {viewInvoice.notes && <p className="text-xs text-gray-500 mt-4">Notes: {viewInvoice.notes}</p>}
              <p className="text-center text-xs text-gray-400 mt-6">This is a computer-generated invoice and does not require a signature.</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
