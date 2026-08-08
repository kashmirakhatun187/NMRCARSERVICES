import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
  BarChart2, TrendingUp, TrendingDown, DollarSign,
  Download, Calendar, X, CheckCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year';

interface KPIs {
  totalBookings: number;
  revenue: number;
  avgTicket: number;
  completed: number;
  cancelled: number;
  conversionRate: number;
}

interface ProfitLoss {
  revenue: number;
  expenses: number;
  grossProfit: number;
  profitMargin: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  color: string;
}

interface TopService {
  name: string;
  revenue: number;
  bookings: number;
}

interface MonthlyRevenue {
  month: string;       // e.g. "Jan 2025"
  revenue: number;
}

interface InvoicePaymentBreakdown {
  unpaid: number;
  partial: number;
  paid: number;
  refunded: number;
}

interface BookingRow {
  id: string;
  booking_number: string | null;
  scheduled_date: string | null;
  status: string | null;
  actual_cost: number | null;
  estimated_cost: number | null;
  services?: { name: string } | null;
  profiles?: { full_name: string; phone: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-500',
  confirmed:  'bg-blue-500',
  in_progress:'bg-indigo-500',
  completed:  'bg-green-500',
  cancelled:  'bg-red-500',
  no_show:    'bg-gray-500',
};

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const periodStart = (period: Period): string => {
  const d = new Date();
  if (period === 'week')  d.setDate(d.getDate() - 7);
  if (period === 'month') d.setMonth(d.getMonth() - 1);
  if (period === 'year')  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getLast6Months(): { label: string; year: number; month: number }[] {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [kpis, setKpis]         = useState<KPIs | null>(null);
  const [pl, setPl]             = useState<ProfitLoss | null>(null);
  const [statuses, setStatuses] = useState<StatusBreakdown[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [monthlyRev, setMonthlyRev]   = useState<MonthlyRevenue[]>([]);
  const [invoicePay, setInvoicePay]   = useState<InvoicePaymentBreakdown | null>(null);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = periodStart(period);

      // ── 1. Bookings in period ────────────────────────────────────────────
      const { data: bookingsRaw, error: bErr } = await supabase
        .from('bookings')
        .select('id, booking_number, scheduled_date, status, actual_cost, estimated_cost, service_id, services(name), profiles!bookings_customer_id_fkey(full_name, phone)')
        .gte('created_at', from)
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;
      const bookings: BookingRow[] = (bookingsRaw ?? []) as unknown as BookingRow[];
      setAllBookings(bookings);

      // ── 2. Paid invoices in period ───────────────────────────────────────
      const { data: paidInvoices, error: iErr } = await supabase
        .from('invoices')
        .select('id, total, payment_status, booking_id, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', from);

      if (iErr) throw iErr;
      const paidTotal = (paidInvoices ?? []).reduce((s, r) => s + (r.total ?? 0), 0);

      // ── 3. All invoices for breakdown ────────────────────────────────────
      const { data: allInvoices, error: aiErr } = await supabase
        .from('invoices')
        .select('payment_status')
        .gte('created_at', from);

      if (aiErr) throw aiErr;
      const invBreakdown: InvoicePaymentBreakdown = { unpaid: 0, partial: 0, paid: 0, refunded: 0 };
      (allInvoices ?? []).forEach(inv => {
        const s = inv.payment_status as keyof InvoicePaymentBreakdown;
        if (s in invBreakdown) invBreakdown[s]++;
      });
      setInvoicePay(invBreakdown);

      // ── 4. Expenses in period ────────────────────────────────────────────
      const { data: expData, error: eErr } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', new Date(from).toISOString().slice(0, 10));

      if (eErr) throw eErr;
      const expTotal = (expData ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

      // ── 5. KPIs ──────────────────────────────────────────────────────────
      const total     = bookings.length;
      const completed = bookings.filter(b => b.status === 'completed').length;
      const cancelled = bookings.filter(b => b.status === 'cancelled').length;
      const avgTicket = paidTotal / (paidInvoices?.length || 1);
      const conversion = total > 0 ? (completed / total) * 100 : 0;

      setKpis({
        totalBookings: total,
        revenue: paidTotal,
        avgTicket,
        completed,
        cancelled,
        conversionRate: conversion,
      });

      // ── 6. P&L ───────────────────────────────────────────────────────────
      const gross  = paidTotal - expTotal;
      const margin = paidTotal > 0 ? (gross / paidTotal) * 100 : 0;
      setPl({ revenue: paidTotal, expenses: expTotal, grossProfit: gross, profitMargin: margin });

      // ── 7. Status breakdown ───────────────────────────────────────────────
      const statusMap: Record<string, number> = {};
      bookings.forEach(b => {
        if (b.status) statusMap[b.status] = (statusMap[b.status] ?? 0) + 1;
      });
      setStatuses(
        Object.entries(statusMap)
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => ({
            status,
            count,
            color: STATUS_COLORS[status] ?? 'bg-gray-400',
          }))
      );

      // ── 8. Top services ───────────────────────────────────────────────────
      // paid invoices joined via booking_id → bookings.service_id → services.name
      const { data: topRaw, error: tsErr } = await supabase
        .from('invoices')
        .select('total, booking_id, bookings(service_id, services(name))')
        .eq('payment_status', 'paid')
        .gte('created_at', from);

      if (tsErr) throw tsErr;

      const svcMap: Record<string, { revenue: number; count: number }> = {};
      (topRaw ?? []).forEach((inv: any) => {
        const svcName: string = inv.bookings?.services?.name ?? 'Unknown Service';
        if (!svcMap[svcName]) svcMap[svcName] = { revenue: 0, count: 0 };
        svcMap[svcName].revenue += inv.total ?? 0;
        svcMap[svcName].count++;
      });

      setTopServices(
        Object.entries(svcMap)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(([name, d]) => ({ name, revenue: d.revenue, bookings: d.count }))
      );

      // ── 9. Monthly revenue (last 6 months) ────────────────────────────────
      const months = getLast6Months();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: monthlyRaw, error: mrErr } = await supabase
        .from('invoices')
        .select('total, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', sixMonthsAgo.toISOString());

      if (mrErr) throw mrErr;

      const monthMap: Record<string, number> = {};
      months.forEach(m => { monthMap[m.label] = 0; });
      (monthlyRaw ?? []).forEach((inv: any) => {
        const d = new Date(inv.created_at);
        const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
        if (label in monthMap) monthMap[label] += inv.total ?? 0;
      });

      setMonthlyRev(months.map(m => ({ month: m.label, revenue: monthMap[m.label] })));

    } catch (err: any) {
      console.error('AdminReportsPage fetch error:', err);
      setError(err?.message ?? 'Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Export helpers ─────────────────────────────────────────────────────────

  const exportBookingsCSV = () => {
    const headers = ['Booking #', 'Date', 'Status', 'Service', 'Customer', 'Phone', 'Actual Cost'];
    const rows = allBookings.map(b => [
      b.booking_number ?? '',
      b.scheduled_date ?? '',
      b.status ?? '',
      (b.services as any)?.name ?? '',
      (b.profiles as any)?.full_name ?? '',
      (b.profiles as any)?.phone ?? '',
      b.actual_cost ?? b.estimated_cost ?? '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bookings_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRevenuePDF = () => { window.print(); };

  // ─── Bar utils ──────────────────────────────────────────────────────────────

  const maxStatusCount = statuses.length > 0 ? Math.max(...statuses.map(s => s.count)) : 1;
  const maxMonthlyRev  = monthlyRev.length > 0 ? Math.max(...monthlyRev.map(m => m.revenue), 1) : 1;
  const maxSvcRev      = topServices.length > 0 ? Math.max(...topServices.map(s => s.revenue), 1) : 1;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout variant="admin" title="Reports & Analytics">
      <div className="space-y-8 pb-10">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-500" />
              Reports &amp; Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Business performance overview
            </p>
          </div>

          {/* Period filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            {(['week', 'month', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${period === p
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
              >
                {p === 'week' ? 'Last Week' : p === 'month' ? 'Last Month' : 'Last Year'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Global error ─────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
            <X className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* ── KPI row ──────────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))
              : [
                  {
                    label: 'Total Bookings',
                    value: kpis?.totalBookings ?? 0,
                    display: String(kpis?.totalBookings ?? 0),
                    icon: <Calendar className="w-5 h-5 text-blue-500" />,
                    sub: 'All statuses',
                    color: 'text-blue-600 dark:text-blue-400',
                  },
                  {
                    label: 'Revenue',
                    value: kpis?.revenue ?? 0,
                    display: fmt(kpis?.revenue ?? 0),
                    icon: <DollarSign className="w-5 h-5 text-green-500" />,
                    sub: 'Paid invoices',
                    color: 'text-green-600 dark:text-green-400',
                  },
                  {
                    label: 'Avg Ticket',
                    value: kpis?.avgTicket ?? 0,
                    display: fmt(kpis?.avgTicket ?? 0),
                    icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
                    sub: 'Per paid invoice',
                    color: 'text-indigo-600 dark:text-indigo-400',
                  },
                  {
                    label: 'Completed',
                    value: kpis?.completed ?? 0,
                    display: String(kpis?.completed ?? 0),
                    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
                    sub: 'Bookings done',
                    color: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'Cancelled',
                    value: kpis?.cancelled ?? 0,
                    display: String(kpis?.cancelled ?? 0),
                    icon: <X className="w-5 h-5 text-red-500" />,
                    sub: 'Bookings lost',
                    color: 'text-red-600 dark:text-red-400',
                  },
                  {
                    label: 'Conversion',
                    value: kpis?.conversionRate ?? 0,
                    display: `${(kpis?.conversionRate ?? 0).toFixed(1)}%`,
                    icon: <BarChart2 className="w-5 h-5 text-purple-500" />,
                    sub: 'Completed / total',
                    color: 'text-purple-600 dark:text-purple-400',
                  },
                ].map(card => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {card.label}
                      </span>
                      {card.icon}
                    </div>
                    <div className={`text-2xl font-bold ${card.color}`}>{card.display}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</div>
                  </div>
                ))}
          </div>
        </section>

        {/* ── Two-column: P&L + Invoice status ─────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* P&L card */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              {pl && pl.grossProfit >= 0
                ? <TrendingUp className="w-5 h-5 text-green-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />}
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Profit &amp; Loss
              </h2>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : pl ? (
              <div className="p-6 space-y-0">
                {[
                  { label: 'Revenue', amount: pl.revenue, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Expenses', amount: pl.expenses, color: 'text-red-600 dark:text-red-400' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{fmt(row.amount)}</span>
                  </div>
                ))}

                {/* Divider + gross profit */}
                <div className={`mt-4 rounded-xl p-4 ${pl.grossProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${pl.grossProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      Gross Profit
                    </span>
                    <span className={`text-lg font-bold ${pl.grossProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {fmt(pl.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Profit Margin</span>
                    <span className={`text-sm font-medium ${pl.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pl.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No P&amp;L data available for this period.
              </div>
            )}
          </div>

          {/* Invoice payment status */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <DollarSign className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Invoice Payment Status
              </h2>
            </div>

            {loading ? (
              <div className="p-6 grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : invoicePay ? (
              <div className="p-6 grid grid-cols-2 gap-4">
                {[
                  { key: 'unpaid',   label: 'Unpaid',   color: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700',    text: 'text-red-700 dark:text-red-400',    dot: 'bg-red-500' },
                  { key: 'partial',  label: 'Partial',  color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
                  { key: 'paid',     label: 'Paid',     color: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500' },
                  { key: 'refunded', label: 'Refunded', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-400',   dot: 'bg-blue-500' },
                ].map(item => (
                  <div key={item.key} className={`rounded-xl border p-4 ${item.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className={`text-xs font-medium uppercase tracking-wide ${item.text}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className={`text-3xl font-bold ${item.text}`}>
                      {invoicePay[item.key as keyof InvoicePaymentBreakdown]}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">invoices</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No invoice data available.
              </div>
            )}
          </div>
        </section>

        {/* ── Status breakdown bar chart ────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Booking Status Breakdown
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))
              : statuses.length === 0
                ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    No booking status data for this period.
                  </p>
                )
                : statuses.map(s => {
                    const pct = maxStatusCount > 0 ? (s.count / maxStatusCount) * 100 : 0;
                    return (
                      <div key={s.status} className="flex items-center gap-4">
                        <span className="w-28 text-sm capitalize text-gray-600 dark:text-gray-300 flex-shrink-0 truncate">
                          {s.status.replace('_', ' ')}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {s.count}
                        </span>
                      </div>
                    );
                  })}
          </div>
        </section>

        {/* ── Monthly revenue trend ─────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Monthly Revenue Trend <span className="text-xs font-normal text-gray-400">(Last 6 Months)</span>
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              : monthlyRev.every(m => m.revenue === 0)
                ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    No paid revenue data for the past 6 months.
                  </p>
                )
                : monthlyRev.map(m => {
                    const pct = maxMonthlyRev > 0 ? (m.revenue / maxMonthlyRev) * 100 : 0;
                    return (
                      <div key={m.month} className="flex items-center gap-4">
                        <span className="w-20 text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
                          {m.month}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                            style={{ width: `${Math.max(pct, m.revenue > 0 ? 1 : 0)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {fmt(m.revenue)}
                        </span>
                      </div>
                    );
                  })}
          </div>
        </section>

        {/* ── Top 5 services ───────────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Top 5 Services by Revenue
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              : topServices.length === 0
                ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    No service revenue data for this period.
                  </p>
                )
                : topServices.map((svc, idx) => {
                    const pct = maxSvcRev > 0 ? (svc.revenue / maxSvcRev) * 100 : 0;
                    return (
                      <div key={svc.name} className="flex items-center gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="w-36 text-sm text-gray-700 dark:text-gray-200 truncate flex-shrink-0">
                          {svc.name}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {fmt(svc.revenue)}
                        </span>
                        <span className="w-20 text-right text-xs text-gray-400 dark:text-gray-500">
                          {svc.bookings} booking{svc.bookings !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
          </div>
        </section>

        {/* ── Export buttons ────────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row items-center gap-4 justify-end">
          <button
            onClick={exportBookingsCSV}
            disabled={loading || allBookings.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Bookings CSV
          </button>
          <button
            onClick={exportRevenuePDF}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Revenue PDF
          </button>
        </section>

      </div>
    </DashboardLayout>
  );
}
