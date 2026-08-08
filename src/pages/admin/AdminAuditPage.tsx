import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'login'
  | 'logout'
  | string;

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  profiles: {
    full_name: string | null;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ACTIONS = ['all', 'created', 'updated', 'deleted', 'login', 'logout'];

const ACTION_STYLES: Record<string, string> = {
  created:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  login:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  logout:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const defaultActionStyle =
  'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300';

function actionBadge(action: string) {
  return ACTION_STYLES[action] ?? defaultActionStyle;
}

function truncateId(id: string | null): string {
  if (!id) return '—';
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Diff Summary ─────────────────────────────────────────────────────────────

function DiffSummary({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
}) {
  const allKeys = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)])
  );
  const changed = allKeys.filter(
    (k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
  );

  if (changed.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        No differences detected.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
      {changed.map((key) => (
        <li key={key} className="py-2 grid grid-cols-[auto_1fr_1fr] gap-2 items-start">
          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 mt-0.5">
            {key}
          </span>
          <span className="text-red-500 dark:text-red-400 break-all">
            {JSON.stringify(oldData[key])}
          </span>
          <span className="text-green-600 dark:text-green-400 break-all">
            {JSON.stringify(newData[key])}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── JSON Block ───────────────────────────────────────────────────────────────

function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">null</p>
    );
  }
  return (
    <pre className="overflow-auto rounded-lg bg-slate-900 dark:bg-black/40 text-green-300 text-xs p-3 max-h-48 leading-relaxed">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[140, 100, 80, 90, 80, 90, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 rounded bg-slate-200 dark:bg-slate-700"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  const hasBoth = log.old_data !== null && log.new_data !== null;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Audit Log Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Meta grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Timestamp</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{formatTs(log.created_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">User</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                {log.profiles?.full_name ?? log.user_id ?? 'System'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Action</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${actionBadge(log.action)}`}
                >
                  {log.action}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">IP Address</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100 font-mono text-xs">
                {log.ip_address ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Entity Type</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{log.entity_type ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Entity ID</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100 font-mono text-xs break-all">
                {log.entity_id ?? '—'}
              </dd>
            </div>
          </dl>

          {/* Old Data */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Previous Data (old_data)
            </h3>
            <JsonBlock data={log.old_data} />
          </div>

          {/* New Data */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Updated Data (new_data)
            </h3>
            <JsonBlock data={log.new_data} />
          </div>

          {/* Diff */}
          {hasBoth && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Diff Summary
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 grid grid-cols-[auto_1fr_1fr] gap-2 px-0">
                <span />
                <span className="text-red-500 dark:text-red-400 font-medium">Before</span>
                <span className="text-green-600 dark:text-green-400 font-medium">After</span>
              </div>
              <DiffSummary
                oldData={log.old_data as Record<string, unknown>}
                newData={log.new_data as Record<string, unknown>}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*, profiles!user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;
      setLogs((data as AuditLog[]) ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch audit logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Auto-refresh ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
      }, 30_000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  // ── Filtered Logs ──────────────────────────────────────────────────────────

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;

    if (dateFrom) {
      if (new Date(log.created_at) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1); // inclusive
      if (new Date(log.created_at) >= to) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (log.profiles?.full_name ?? '').toLowerCase().includes(q) ||
        (log.action ?? '').toLowerCase().includes(q) ||
        (log.entity_type ?? '').toLowerCase().includes(q) ||
        (log.entity_id ?? '').toLowerCase().includes(q) ||
        (log.ip_address ?? '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  // ── Export CSV ─────────────────────────────────────────────────────────────

  const exportCsv = () => {
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
    ];
    const rows = filteredLogs.map((log) => [
      formatTs(log.created_at),
      log.profiles?.full_name ?? log.user_id ?? 'System',
      log.action,
      log.entity_type ?? '',
      log.entity_id ?? '',
      log.ip_address ?? '',
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout variant="admin" title="Audit Logs">
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
              <ClipboardCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Audit Logs
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track all system events and user activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <RefreshCw
                className={`w-4 h-4 ${autoRefresh ? 'text-indigo-500 animate-spin' : 'text-gray-400'}`}
                style={{ animationDuration: '3s' }}
              />
              <span>Auto-refresh</span>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-indigo-600"
              />
            </label>

            {/* Manual refresh */}
            <button
              onClick={() => { setLoading(true); fetchLogs(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
              title="Refresh now"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Export CSV */}
            <button
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="mb-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-4">
          {/* Search + Date Range */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by user, action, entity, IP…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date from */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Date to */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Clear dates */}
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 whitespace-nowrap"
              >
                Clear dates
              </button>
            )}
          </div>

          {/* Action pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {ALL_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                  actionFilter === action
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                    : action === 'all'
                    ? 'border-slate-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    : `${actionBadge(action)} border-transparent`
                }`}
              >
                {action === 'all' ? 'All Actions' : action}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Result count */}
          {!loading && (
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
              Showing{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {filteredLogs.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {logs.length}
              </span>{' '}
              records
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                  {[
                    'Timestamp',
                    'User',
                    'Action',
                    'Entity Type',
                    'Entity ID',
                    'IP Address',
                    '',
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                        <ClipboardCheck className="w-10 h-10 opacity-40" />
                        <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                          No audit logs found
                        </p>
                        <p className="text-sm max-w-xs">
                          {search || actionFilter !== 'all' || dateFrom || dateTo
                            ? 'Try adjusting your filters or search query.'
                            : 'System events will appear here once activity is recorded.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-default"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {formatTs(log.created_at)}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {log.profiles?.full_name ?? (
                          <span className="text-gray-400 italic text-xs">
                            {log.user_id ? 'Unknown' : 'System'}
                          </span>
                        )}
                      </td>

                      {/* Action badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${actionBadge(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entity Type */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {log.entity_type ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Entity ID (truncated) */}
                      <td
                        className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400"
                        title={log.entity_id ?? undefined}
                      >
                        {truncateId(log.entity_id)}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                        {log.ip_address ?? <span className="text-gray-400">—</span>}
                      </td>

                      {/* View Details */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination hint */}
        {!loading && logs.length >= 200 && (
          <p className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500">
            Showing the latest 200 records. Use filters to narrow results.
          </p>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </DashboardLayout>
  );
}
