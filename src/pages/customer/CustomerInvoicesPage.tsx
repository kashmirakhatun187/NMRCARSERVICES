import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CreditCard, CheckCircle, Clock, AlertCircle,
  XCircle, Download, Eye, Loader2, RefreshCw, RotateCcw, Search
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  tax_amount: number;
  subtotal: number;
  discount: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  vehicle_info: string;
  line_items: any[];
}

interface Transaction {
  id: string;
  transaction_id: string;
  invoice_id: string;
  amount: number;
  method: string;
  status: string;
  gateway_ref: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-500',
};

function printInvoice(inv: Invoice) {
  const items = (inv.line_items || []).map((i: any) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f3f4f6">${i.name}</td>
     <td style="padding:8px 4px;border-bottom:1px solid #f3f4f6;text-align:center">${i.qty}</td>
     <td style="padding:8px 4px;border-bottom:1px solid #f3f4f6;text-align:right">₹${Number(i.unit_price).toLocaleString('en-IN')}</td>
     <td style="padding:8px 4px;border-bottom:1px solid #f3f4f6;text-align:right">₹${Number(i.amount || i.unit_price * i.qty).toLocaleString('en-IN')}</td></tr>`
  ).join('');

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title>
  <style>body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#111}
  .hdr{display:flex;justify-content:space-between;margin-bottom:32px}
  .brand{font-size:22px;font-weight:800;color:#dc2626}
  table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f9fafb;padding:10px 4px;text-align:left;font-size:13px}
  .totals td{padding:6px 4px;font-size:14px}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#16a34a}</style>
  </head><body>
  <div class="hdr"><div><div class="brand">NMR Car Services</div><div style="color:#6b7280;font-size:13px">Mumbai, Maharashtra</div></div>
  <div style="text-align:right"><div style="font-size:22px;font-weight:700">INVOICE</div>
  <div style="color:#6b7280;font-size:13px">${inv.invoice_number}</div>
  <div style="color:#6b7280;font-size:13px">${new Date(inv.created_at).toLocaleDateString('en-IN')}</div>
  <span class="badge">${inv.status.toUpperCase()}</span></div></div>
  ${inv.vehicle_info ? `<p style="color:#6b7280;font-size:13px;margin-bottom:16px">Vehicle: ${inv.vehicle_info}</p>` : ''}
  <table><thead><tr><th>Service / Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${items || '<tr><td colspan="4" style="padding:12px;color:#6b7280">Service charges as per booking</td></tr>'}</tbody></table>
  <table class="totals" style="width:260px;margin-left:auto">
  <tr><td>Subtotal</td><td style="text-align:right">₹${Number(inv.subtotal || inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  ${inv.discount > 0 ? `<tr><td style="color:#16a34a">Discount</td><td style="text-align:right;color:#16a34a">-₹${Number(inv.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
  <tr><td>GST (18%)</td><td style="text-align:right">₹${Number(inv.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  <tr style="font-weight:700;border-top:2px solid #111"><td>Total</td><td style="text-align:right">₹${Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  ${inv.amount_paid > 0 ? `<tr style="color:#16a34a"><td>Paid</td><td style="text-align:right">-₹${Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
  <tr style="font-weight:800;font-size:16px;color:#dc2626"><td>Balance Due</td><td style="text-align:right">₹${Number(inv.amount_due ?? inv.total - inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:40px">Thank you for choosing NMR Car Services · support@nmrcarservices.in</p>
  </body></html>`);
  w.document.close();
  w.print();
}

export default function CustomerInvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refundModal, setRefundModal] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) { fetchInvoices(); fetchTransactions(); } }, [user]);

  async function fetchInvoices() {
    setLoading(true);
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    setInvoices((data || []) as Invoice[]);
    setLoading(false);
  }

  async function fetchTransactions() {
    const { data } = await supabase.from('payment_transactions').select('*').order('created_at', { ascending: false });
    setTransactions((data || []) as Transaction[]);
  }

  async function submitRefund() {
    if (!refundModal || !user || !refundReason.trim()) return;
    setSubmitting(true);
    await supabase.from('refunds').insert({
      transaction_id: refundModal.id,
      invoice_id: refundModal.invoice_id,
      customer_id: user.id,
      amount: refundModal.amount,
      reason: refundReason,
      status: 'pending',
    });
    setRefundModal(null);
    setRefundReason('');
    setSubmitting(false);
    alert('Refund request submitted. We will process it within 5-7 business days.');
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.vehicle_info || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalDue = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount_due ?? i.total - i.amount_paid), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <DashboardLayout variant="customer" title="Invoices & Payments">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Invoices', value: invoices.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`, color: 'text-green-600 dark:text-green-400' },
            { label: 'Amount Due', value: `₹${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`, color: 'text-red-600 dark:text-red-400' },
            { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {(['invoices', 'transactions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'invoices' && (
          <>
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
              <button onClick={() => { fetchInvoices(); fetchTransactions(); }} className="btn-secondary gap-1.5">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
                <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map(inv => {
                  const amtDue = inv.amount_due ?? (inv.total - inv.amount_paid);
                  const isPaid = inv.status === 'paid';
                  return (
                    <div key={inv.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[inv.status] || statusStyles.draft}`}>
                              {inv.status}
                            </span>
                          </div>
                          {inv.vehicle_info && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{inv.vehicle_info}</p>}
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {inv.due_date && !isPaid && ` · Due: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ₹{Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          {inv.amount_paid > 0 && !isPaid && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Paid ₹{Number(inv.amount_paid).toLocaleString('en-IN')} · Due ₹{Number(amtDue).toLocaleString('en-IN')}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                            {!isPaid && inv.status !== 'cancelled' && (
                              <button onClick={() => navigate(`/payment/${inv.id}`)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors">
                                <CreditCard className="w-3.5 h-3.5" /> Pay Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {inv.status === 'partial' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                            <span>Payment Progress</span>
                            <span>{Math.round((inv.amount_paid / inv.total) * 100)}% paid</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(inv.amount_paid / inv.total) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
                <CreditCard className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No payment transactions yet</p>
              </div>
            ) : (
              transactions.map(txn => (
                <div key={txn.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    txn.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                    txn.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                  }`}>
                    {txn.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> :
                     txn.status === 'failed' ? <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> :
                     <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{txn.transaction_id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {txn.method} · {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-900 dark:text-white">₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      txn.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      txn.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>{txn.status}</span>
                  </div>
                  {txn.status === 'success' && (
                    <button onClick={() => setRefundModal(txn)} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Request Refund">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-white font-bold">{selectedInvoice.invoice_number}</p>
                <p className="text-red-200 text-xs">{new Date(selectedInvoice.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2 text-sm">
              {selectedInvoice.vehicle_info && <p className="text-gray-500 dark:text-gray-400 mb-3">{selectedInvoice.vehicle_info}</p>}
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>₹{Number(selectedInvoice.subtotal || selectedInvoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              {selectedInvoice.discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-₹{Number(selectedInvoice.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>GST (18%)</span><span>₹{Number(selectedInvoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-2 border-t border-gray-200 dark:border-slate-600"><span>Total</span><span>₹{Number(selectedInvoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              {selectedInvoice.amount_paid > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Paid</span><span>-₹{Number(selectedInvoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between font-bold text-red-600 dark:text-red-400 text-lg"><span>Balance Due</span><span>₹{Number(selectedInvoice.amount_due ?? selectedInvoice.total - selectedInvoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex gap-3">
              <button onClick={() => printInvoice(selectedInvoice)} className="flex-1 btn-secondary gap-2"><Download className="w-4 h-4" /> Download</button>
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                <button onClick={() => { setSelectedInvoice(null); navigate(`/payment/${selectedInvoice.id}`); }} className="flex-1 btn-primary gap-2"><CreditCard className="w-4 h-4" /> Pay Now</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4">Request Refund</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Amount: <strong>₹{Number(refundModal.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </p>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} className="input mb-4 resize-none" rows={3} placeholder="Reason for refund…" />
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={submitRefund} disabled={submitting || !refundReason.trim()} className="flex-1 btn-primary">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
