import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
  DollarSign, Plus, TrendingDown, PieChart, Download,
  Trash2, Calendar, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  branch_id: string | null;
  category: string;
  title: string;
  amount: number;
  date: string;
  paid_to: string | null;
  notes: string | null;
  created_at: string | null;
  branches?: { name: string } | null;
}

type Period = 'week' | 'month' | 'year';

const CATEGORIES = [
  'salary', 'parts', 'utilities', 'rent',
  'marketing', 'maintenance', 'equipment', 'other',
] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  salary:      'bg-blue-500',
  parts:       'bg-orange-500',
  utilities:   'bg-yellow-500',
  rent:        'bg-purple-500',
  marketing:   'bg-pink-500',
  maintenance: 'bg-teal-500',
  equipment:   'bg-indigo-500',
  other:       'bg-gray-500',
};

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  salary:      'text-blue-400',
  parts:       'text-orange-400',
  utilities:   'text-yellow-400',
  rent:        'text-purple-400',
  marketing:   'text-pink-400',
  maintenance: 'text-teal-400',
  equipment:   'text-indigo-400',
  other:       'text-gray-400',
};

interface ExpenseForm {
  branch_id: string;
  category: Category;
  title: string;
  amount: string;
  date: string;
  paid_to: string;
  notes: string;
}

const DEFAULT_FORM: ExpenseForm = {
  branch_id: '',
  category: 'other',
  title: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paid_to: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodStart(period: Period): string {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }
  // year
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function getMonthRange(offset: number): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset; // 0 = this month, -1 = last month
  const start = new Date(y, m, 1).toISOString().slice(0, 10);
  const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function fmt(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCSV(expenses: Expense[]) {
  const headers = ['Date', 'Category', 'Title', 'Amount', 'Paid To', 'Branch', 'Notes'];
  const rows = expenses.map(e => [
    e.date,
    e.category,
    `"${e.title.replace(/"/g, '""')}"`,
    e.amount,
    e.paid_to ?? '',
    e.branches?.name ?? '',
    `"${(e.notes ?? '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl mb-3" />
      <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-4 w-16 bg-gray-100 dark:bg-slate-700 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, branches(name)')
        .order('date', { ascending: false });
      if (error) throw error;
      setExpenses(data ?? []);
    } catch (err: any) {
      setFetchError(err.message ?? 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
    setBranches(data ?? []);
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchBranches();
  }, [fetchExpenses, fetchBranches]);

  // ── Filtered expenses for period ───────────────────────────────────────────

  const periodStart = getPeriodStart(period);
  const periodExpenses = expenses.filter(e => e.date >= periodStart);

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(-1);
  const thisMonthExpenses = expenses.filter(e => e.date >= thisMonth.start && e.date <= thisMonth.end);
  const lastMonthExpenses = expenses.filter(e => e.date >= lastMonth.start && e.date <= lastMonth.end);

  const totalPeriod = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalLastMonth = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Category breakdown ─────────────────────────────────────────────────────

  const categoryBreakdown = CATEGORIES.map(cat => {
    const catExpenses = periodExpenses.filter(e => e.category === cat);
    const total = catExpenses.reduce((s, e) => s + Number(e.amount), 0);
    return { category: cat, total, count: catExpenses.length };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const maxCatTotal = categoryBreakdown.length > 0 ? categoryBreakdown[0].total : 1;

  // ── Totals for table bottom ────────────────────────────────────────────────

  const tableTotal = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Add Expense ────────────────────────────────────────────────────────────

  async function handleAddExpense() {
    setFormError('');
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError('Please enter a valid amount.'); return;
    }
    if (!form.date) { setFormError('Date is required.'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        category: form.category,
        title: form.title.trim(),
        amount: Number(form.amount),
        date: form.date,
        paid_to: form.paid_to.trim() || null,
        notes: form.notes.trim() || null,
        branch_id: form.branch_id || null,
      };
      const { error } = await supabase.from('expenses').insert([payload]);
      if (error) throw error;
      setShowModal(false);
      setForm(DEFAULT_FORM);
      await fetchExpenses();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete Expense ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleteId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch {
      // silently fail; user can retry
    } finally {
      setDeleteId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Expense Tracking" variant="admin">
      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Header Row ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Expense Tracking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitor and manage all operational expenses.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV(periodExpenses)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={() => { setForm(DEFAULT_FORM); setFormError(''); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        </div>

        {/* ── Period Filter ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Period:
          </span>
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                period === p
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              This {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        {/* ── Fetch Error ──────────────────────────────────────────────────── */}
        {fetchError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
            {fetchError}
          </div>
        )}

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {/* Total Period */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalPeriod)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                  Total Expenses ({period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'})
                </p>
              </div>

              {/* Category Count */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
                  <PieChart className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categoryBreakdown.length}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Active Categories</p>
              </div>

              {/* This Month */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalThisMonth)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">This Month</p>
              </div>

              {/* Last Month */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalLastMonth)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Last Month</p>
              </div>
            </>
          )}
        </div>

        {/* ── Category Chart + Table ────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Category Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm lg:col-span-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" /> Category Breakdown
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              % spend per category · {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'}
            </p>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-12 bg-gray-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <PieChart className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No expense data for this period.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map(({ category, total, count }) => {
                  const pct = totalPeriod > 0 ? Math.round((total / totalPeriod) * 100) : 0;
                  const barPct = maxCatTotal > 0 ? Math.round((total / maxCatTotal) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs font-semibold capitalize ${CATEGORY_TEXT_COLORS[category] ?? 'text-gray-400'}`}>
                          {category}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {pct}% · {count} {count === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-400'} transition-all duration-500`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-right">{fmt(total)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expenses Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm lg:col-span-2 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Expense Ledger
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {periodExpenses.length} record{periodExpenses.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/50 text-left">
                    {['Date', 'Category', 'Title', 'Amount', 'Paid To', 'Branch', 'Notes', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : periodExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <DollarSign className="w-10 h-10 text-gray-300 dark:text-slate-600" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No expenses recorded</p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            Click "Add Expense" to log your first entry for this period.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    periodExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${CATEGORY_COLORS[e.category] ?? 'bg-gray-500'} bg-opacity-15 ${CATEGORY_TEXT_COLORS[e.category] ?? 'text-gray-400'}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium max-w-[140px] truncate">
                          {e.title}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">
                          {fmt(Number(e.amount))}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[100px] truncate">
                          {e.paid_to ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {e.branches?.name ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                          {e.notes ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deleteId === e.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!loading && periodExpenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-slate-900/60 border-t-2 border-gray-200 dark:border-slate-600">
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                        Running Total
                      </td>
                      <td className="px-4 py-3 text-sm font-extrabold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {fmt(tableTotal)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Expense Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                Add Expense
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                  {formError}
                </div>
              )}

              {/* Branch (optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Branch <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                >
                  <option value="">— No specific branch —</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition capitalize"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly electricity bill"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                />
              </div>

              {/* Amount + Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              {/* Paid To */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Paid To <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BESCOM / Vendor name"
                  value={form.paid_to}
                  onChange={e => setForm(f => ({ ...f, paid_to: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional details…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Expense
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
