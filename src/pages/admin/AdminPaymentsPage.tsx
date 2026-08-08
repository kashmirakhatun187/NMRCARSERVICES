import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, RotateCcw,
  CheckCircle, Clock, XCircle, Filter, Download, Loader2,
  AlertCircle, BarChart2, Smartphone, Building2, Wallet, Banknote
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Transaction {
  id: string;
  transaction_id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  method: string;
  status: string;
  gateway_ref: string;
  failure_reason: string;
  created_at: string;
  processed_at: string | null;
  profiles?: { full_name: string };
  invoices?: { invoice_number: string };
}

interface Refund {
  id: string;
  refund_number: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string };
  invoices?: { invoice_number: string };
}

const METHOD_ICONS: Record<string, JSX.Element> = {
  upi: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  netbanking: <Building2 className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
  cash: <Banknote className="w-4 h-4" />,
  emi: <BarChart2 className="w-4 h-4" />,
};

const METHOD_COLORS: Record<string, string> = {
  upi: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  card: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  netbanking: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  wallet: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  cash: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  emi: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

type Period = 'today' | 'week' | 'month' | 'year';

function periodStart(p: Period) {
  const d = new Date();
  if (p === 'today') { d.setHours(0, 0, 0, 0); return d.toISOString(); }
  if (p === 'week') { d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (p === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString(); }
  d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

function exportCSV(transactions: Transaction[]) {
  const header = ['Transaction ID', 'Customer', 'Invoice', 'Amount', 'Method', 'Status', 'Gateway Ref', 'Date'];
  const rows = transactions.map(t => [
    t.transaction_id,
    (t.profiles as any)?.full_name || '',
    (t.invoices as any)?.invoice_number || '',
    t.amount,
    t.method,
    t.status,
    t.gateway_ref,
    new Date(t.created_at).toLocaleDateString('en-IN'),
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<'transactions' | 'refunds'>('transactions');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchAll(); }, [period]);

  async function fetchAll() {
    setLoading(true);
    const start = periodStart(period);
    const [txns, refs] = await Promise.all([
      supabase.from('payment_transactions')
        .select('*, profiles!customer_id(full_name), invoices!invoice_id(invoice_number)')
        .gte('created_at', start)
        .order('created_at', { ascending: false }),
      supabase.from('refunds')
        .select('*, profiles!customer_id(full_name), invoices!invoice_id(invoice_number)')
        .order('created_at', { ascending: false }),
    ]);
    setTransactions((txns.data || []) as any[]);
    setRefunds((refs.data || []) as any[]);
    setLoading(false);
  }

  async function updateRefundStatus(id: string, status: string) {
    await supabase.from('refunds').update({ status, processed_by: user?.id, processed_at: new Date().toISOString() }).eq('id', id);
    setRefunds(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  // Stats
  const successTxns = transactions.filter(t => t.status === 'success');
  const totalRevenue = successTxns.reduce((s, t) => s + Number(t.amount), 0);
  const totalFailed = transactions.filter(t => t.status === 'failed').length;
  const successRate = transactions.length > 0 ? Math.round((successTxns.length / transactions.length) * 100) : 0;
  const totalRefunded = refunds.filter(r => r.status === 'processed').reduce((s, r) => s + Number(r.amount), 0);

  // Method breakdown
  const methodBreakdown = successTxns.reduce<Record<string, number>>((acc, t) => {
    acc[t.method] = (acc[t.method] || 0) + Number(t.amount);
    return acc;
  }, {});
  const maxMethod = Math.max(0, ...Object.values(methodBreakdown));

  // Filtered
  const filteredTxns = transactions.filter(t => {
    const mMatch = methodFilter === 'all' || t.method === methodFilter;
    const sMatch = statusFilter === 'all' || t.status === statusFilter;
    return mMatch && sMatch;
  });

  return (
    <DashboardLayout variant="admin" title="Payments & Revenue">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* Period filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  period === p ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>
          <button onClick={() => exportCSV(filteredTxns)} className="btn-secondary gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp className="w-5 h-5" />, color: 'from-green-500 to-emerald-600', sub: `${successTxns.length} successful` },
            { label: 'Total Transactions', value: transactions.length, icon: <CreditCard className="w-5 h-5" />, color: 'from-blue-500 to-blue-600', sub: `${period} period` },
            { label: 'Success Rate', value: `${successRate}%`, icon: <CheckCircle className="w-5 h-5" />, color: successRate >= 80 ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-amber-600', sub: `${totalFailed} failed` },
            { label: 'Refunds Processed', value: `₹${totalRefunded.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <RotateCcw className="w-5 h-5" />, color: 'from-red-500 to-red-600', sub: `${refunds.filter(r => r.status === 'pending').length} pending` },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 overflow-hidden relative">
              <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${card.color} rounded-full opacity-10`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-3`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue by Payment Method</h3>
          {Object.keys(methodBreakdown).length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No data for selected period</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(methodBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amt]) => (
                <div key={method} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 w-32 shrink-0 ${METHOD_COLORS[method] || ''} px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize`}>
                    {METHOD_ICONS[method]} {method}
                  </div>
                  <div className="flex-1 h-7 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-lg transition-all flex items-center justify-end pr-2"
                      style={{ width: `${maxMethod > 0 ? (amt / maxMethod) * 100 : 0}%` }}>
                      <span className="text-white text-xs font-bold whitespace-nowrap">₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right shrink-0">
                    {maxMethod > 0 ? Math.round((amt / totalRevenue) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {(['transactions', 'refunds'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}>
              {tab}
              {tab === 'refunds' && refunds.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {refunds.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'transactions' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="input w-auto">
                <option value="all">All Methods</option>
                {['upi', 'card', 'netbanking', 'wallet', 'cash', 'emi'].map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
                <option value="all">All Status</option>
                {['success', 'failed', 'pending', 'processing', 'refunded'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : filteredTxns.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
                <CreditCard className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No transactions in this period</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                        {['Txn ID', 'Customer', 'Invoice', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxns.map(txn => (
                        <tr key={txn.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{txn.transaction_id.slice(0, 16)}…</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{(txn.profiles as any)?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">{(txn.invoices as any)?.invoice_number || '—'}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${METHOD_COLORS[txn.method] || ''}`}>
                              {METHOD_ICONS[txn.method]} {txn.method}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              txn.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              txn.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {txn.status === 'success' ? <CheckCircle className="w-3 h-3" /> : txn.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'refunds' && (
          <div className="space-y-3">
            {refunds.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
                <RotateCcw className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No refund requests</p>
              </div>
            ) : (
              refunds.map(ref => (
                <div key={ref.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{ref.refund_number}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ref.status === 'processed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          ref.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          ref.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{ref.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{(ref.profiles as any)?.full_name} · {(ref.invoices as any)?.invoice_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{ref.reason}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white">₹{Number(ref.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      {ref.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateRefundStatus(ref.id, 'approved')}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            Approve
                          </button>
                          <button onClick={() => updateRefundStatus(ref.id, 'rejected')}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                      {ref.status === 'approved' && (
                        <button onClick={() => updateRefundStatus(ref.id, 'processed')}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Mark Processed
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
