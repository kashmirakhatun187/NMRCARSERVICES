import { useState, useEffect } from 'react';
import {
  FileText, Plus, Send, CheckCircle, Clock, XCircle, Download,
  Eye, Search, Filter, Loader2, Trash2, PlusCircle, MinusCircle,
  ChevronDown, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Customer { id: string; full_name: string; phone: string; }
interface Booking { id: string; booking_number: string; actual_cost: number | null; vehicles?: { make: string; model: string; license_plate: string; }; }
interface LineItem { name: string; qty: number; unit_price: number; tax_rate: number; }
interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  customer_id: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  due_date: string | null;
  created_at: string;
  vehicle_info: string;
  line_items: LineItem[];
  profiles?: { full_name: string; phone: string; };
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-500',
};

function printInvoice(inv: Invoice) {
  const itemsHtml = (inv.line_items || []).map((i: LineItem) => {
    const amt = i.qty * i.unit_price;
    const gst = amt * (i.tax_rate / 100);
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6">${i.name}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:center">${i.qty}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">₹${i.unit_price.toLocaleString('en-IN')}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${i.tax_rate}%</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">₹${(amt + gst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('');

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${inv.invoice_number}</title>
  <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1f2937;font-size:14px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #dc2626}
  .brand{font-size:26px;font-weight:900;color:#dc2626;letter-spacing:-0.5px}
  .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-weight:700;font-size:12px;text-transform:uppercase}
  .paid{background:#dcfce7;color:#16a34a}.sent{background:#fef9c3;color:#92400e}.draft{background:#f3f4f6;color:#6b7280}
  .overdue{background:#fee2e2;color:#dc2626}.partial{background:#dbeafe;color:#1d4ed8}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th{background:#f9fafb;padding:10px 6px;font-size:12px;color:#6b7280;text-align:left;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
  .totals{width:300px;margin-left:auto}
  .totals td{padding:5px 6px}.total-row{font-weight:700;font-size:16px;border-top:2px solid #1f2937}
  .footer{text-align:center;color:#9ca3af;font-size:11px;margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="brand">NMR Car Services</div>
      <div style="color:#6b7280;margin-top:4px">Mumbai, Maharashtra</div>
      <div style="color:#6b7280;margin-top:4px">Tel: 629182859<br>support@nmrcarservices.in</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:900;color:#1f2937;letter-spacing:-1px">TAX INVOICE</div>
      <div style="margin-top:8px;color:#6b7280">Invoice No: <strong>${inv.invoice_number}</strong></div>
      <div style="color:#6b7280">Date: ${new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      ${inv.due_date ? `<div style="color:#6b7280">Due: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>` : ''}
      <div style="margin-top:8px"><span class="badge ${inv.status}">${inv.status}</span></div>
    </div>
  </div>
  ${inv.vehicle_info ? `<p style="background:#f9fafb;padding:10px 14px;border-radius:8px;color:#374151;margin-bottom:16px"><strong>Vehicle:</strong> ${inv.vehicle_info}</p>` : ''}
  <table>
    <thead><tr>
      <th>Description</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">GST</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemsHtml || '<tr><td colspan="5" style="padding:16px;color:#9ca3af;text-align:center">Service charges as per booking</td></tr>'}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">₹${Number(inv.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    ${inv.discount > 0 ? `<tr><td style="color:#16a34a">Discount</td><td style="text-align:right;color:#16a34a">-₹${Number(inv.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
    <tr><td>CGST (${inv.tax_rate / 2}%)</td><td style="text-align:right">₹${(Number(inv.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    <tr><td>SGST (${inv.tax_rate / 2}%)</td><td style="text-align:right">₹${(Number(inv.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    <tr class="total-row"><td>Total</td><td style="text-align:right">₹${Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    ${inv.amount_paid > 0 ? `<tr style="color:#16a34a"><td>Amount Paid</td><td style="text-align:right">-₹${Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
    <tr style="font-weight:800;font-size:18px;color:#dc2626"><td>Balance Due</td><td style="text-align:right">₹${Number(inv.amount_due ?? inv.total - inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <p style="font-size:12px;color:#6b7280;margin-top:16px">Payment Terms: Due on receipt. Late payment attracts 2% monthly interest after due date.</p>
  <div class="footer">Thank you for choosing NMR Car Services! · support@nmrcarservices.in · Mumbai, Maharashtra<br>This is a computer-generated invoice and does not require a physical signature.</div>
  </body></html>`);
  w.document.close();
  w.print();
}

const defaultItem = (): LineItem => ({ name: '', qty: 1, unit_price: 0, tax_rate: 18 });

export default function GarageInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    customer_id: '',
    booking_id: '',
    due_date: '',
    tax_rate: 18,
    discount: 0,
    notes: '',
    vehicle_info: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([defaultItem()]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [inv, cust, book] = await Promise.all([
      supabase.from('invoices').select('*, profiles!customer_id(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, phone').eq('role', 'customer').order('full_name'),
      supabase.from('bookings').select('id, booking_number, actual_cost, vehicles(make, model, license_plate)').in('status', ['completed', 'in_progress']).order('created_at', { ascending: false }).limit(100),
    ]);
    setInvoices((inv.data || []) as Invoice[]);
    setCustomers((cust.data || []) as Customer[]);
    setBookings((book.data || []) as any[]);
    setLoading(false);
  }

  function calcTotals() {
    const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const discounted = subtotal - (form.discount || 0);
    const tax = discounted * (form.tax_rate / 100);
    return { subtotal, taxAmount: tax, total: discounted + tax };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.customer_id) return;
    setSaving(true);
    const { subtotal, taxAmount, total } = calcTotals();
    const booking = form.booking_id ? bookings.find(b => b.id === form.booking_id) : null;
    const vehicleInfo = form.vehicle_info || (booking?.vehicles
      ? `${(booking.vehicles as any).make} ${(booking.vehicles as any).model} · ${(booking.vehicles as any).license_plate}`
      : '');

    const { error } = await supabase.from('invoices').insert({
      customer_id: form.customer_id,
      booking_id: form.booking_id || null,
      created_by: user.id,
      line_items: lineItems.filter(i => i.name.trim()),
      subtotal,
      discount: form.discount || 0,
      tax_rate: form.tax_rate,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      status: 'draft',
      due_date: form.due_date || null,
      notes: form.notes,
      vehicle_info: vehicleInfo,
    });

    if (!error) {
      setShowModal(false);
      resetForm();
      fetchAll();
    }
    setSaving(false);
  }

  function resetForm() {
    setForm({ customer_id: '', booking_id: '', due_date: '', tax_rate: 18, discount: 0, notes: '', vehicle_info: '' });
    setLineItems([defaultItem()]);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    await supabase.from('invoices').delete().eq('id', id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }

  const { subtotal, taxAmount, total } = calcTotals();

  const filtered = invoices.filter(inv => {
    const name = (inv.profiles as any)?.full_name || '';
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.vehicle_info || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalPending = invoices.filter(i => ['sent', 'partial'].includes(i.status)).reduce((s, i) => s + Number(i.amount_due ?? i.total - i.amount_paid), 0);

  return (
    <DashboardLayout variant="garage" title="Invoices & Billing">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Invoices', value: invoices.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Revenue Collected', value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-green-600 dark:text-green-400' },
            { label: 'Pending Amount', value: `₹${totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: 'text-red-600 dark:text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search invoices…" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">All Status</option>
            {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
            <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">Create First Invoice</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                    {['Invoice #', 'Customer', 'Vehicle', 'Amount', 'Due', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const amtDue = inv.amount_due ?? (inv.total - inv.amount_paid);
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white font-semibold">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{(inv.profiles as any)?.full_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{inv.vehicle_info || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900 dark:text-white">₹{Number(inv.total).toLocaleString('en-IN')}</div>
                          {amtDue > 0 && inv.status !== 'paid' && (
                            <div className="text-xs text-red-500">Due: ₹{Number(amtDue).toLocaleString('en-IN')}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_STYLES[inv.status] || ''}`}>
                            {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => printInvoice(inv)} title="Download PDF"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                            {inv.status === 'draft' && (
                              <button onClick={() => updateStatus(inv.id, 'sent')} title="Send Invoice"
                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => deleteInvoice(inv.id)} title="Delete"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Create GST Invoice</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Customer & Booking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Customer *</label>
                  <select required value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} className="input">
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `· ${c.phone}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Link Booking (optional)</label>
                  <select value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))} className="input">
                    <option value="">None</option>
                    {bookings.map(b => <option key={b.id} value={b.id}>{b.booking_number} {b.vehicles ? `· ${(b.vehicles as any).make} ${(b.vehicles as any).model}` : ''}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Vehicle Info</label>
                <input value={form.vehicle_info} onChange={e => setForm(f => ({ ...f, vehicle_info: e.target.value }))} className="input" placeholder="e.g. Maruti Swift VDI · DL 01 AB 1234" />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Line Items</label>
                  <button type="button" onClick={() => setLineItems(prev => [...prev, defaultItem()])}
                    className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline">
                    <PlusCircle className="w-3.5 h-3.5" /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.name} onChange={e => { const n = [...lineItems]; n[i].name = e.target.value; setLineItems(n); }}
                        className="input col-span-5" placeholder="Description" />
                      <input type="number" min="1" value={item.qty} onChange={e => { const n = [...lineItems]; n[i].qty = parseInt(e.target.value) || 1; setLineItems(n); }}
                        className="input col-span-2 text-center" placeholder="Qty" />
                      <input type="number" min="0" value={item.unit_price} onChange={e => { const n = [...lineItems]; n[i].unit_price = parseFloat(e.target.value) || 0; setLineItems(n); }}
                        className="input col-span-3" placeholder="Rate ₹" />
                      <div className="col-span-1 text-xs text-gray-500 text-right">
                        ₹{(item.qty * item.unit_price).toLocaleString('en-IN')}
                      </div>
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
                          className="col-span-1 text-red-400 hover:text-red-600">
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount, Tax, Due Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Discount (₹)</label>
                  <input type="number" min="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">GST Rate (%)</label>
                  <select value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="input">
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                {form.discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-₹{form.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>GST ({form.tax_rate}%)</span><span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-2 border-t border-gray-200 dark:border-slate-600">
                  <span>Total</span><span className="text-red-600 dark:text-red-400">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Payment terms, additional notes…" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex gap-3 shrink-0">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.customer_id} className="flex-1 btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
