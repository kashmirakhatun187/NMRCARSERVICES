import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
  Headphones, MessageSquare, AlertCircle, CheckCircle, Clock,
  User, X, Send, Filter,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  customer_id: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface StaffProfile {
  id: string;
  full_name: string | null;
  role: string;
}

// ─── Badge helpers ───────────────────────────────────────────────────────────

const priorityBadge: Record<Ticket['priority'], string> = {
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusBadge: Record<Ticket['status'], string> = {
  open:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  resolved:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  closed:      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const statusLabel: Record<Ticket['status'], string> = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  closed:      'Closed',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  // List state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Side-panel state
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [panelAssigned, setPanelAssigned] = useState<string>('');
  const [panelStatus, setPanelStatus] = useState<Ticket['status']>('open');

  // ── Fetch tickets ─────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles!customer_id(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data as Ticket[]) ?? []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch staff for assignment dropdown ───────────────────────────────────
  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['staff', 'admin'])
        .order('full_name');
      if (error) throw error;
      setStaffList((data as StaffProfile[]) ?? []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStaff();
  }, []);

  // ── Open side-panel ───────────────────────────────────────────────────────
  const openPanel = async (ticket: Ticket) => {
    setSelected(ticket);
    setPanelStatus(ticket.status);
    setPanelAssigned(ticket.assigned_to ?? '');
    setReplyText('');
    setIsInternal(false);
    await fetchMessages(ticket.id);
  };

  const closePanel = () => {
    setSelected(null);
    setMessages([]);
  };

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = async (ticketId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*, profiles(full_name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as TicketMessage[]) ?? []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // ── Update ticket ─────────────────────────────────────────────────────────
  const saveTicketChanges = async () => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: panelStatus,
          assigned_to: panelAssigned || null,
        })
        .eq('id', selected.id);
      if (error) throw error;
      await fetchTickets();
      setSelected(prev => prev ? { ...prev, status: panelStatus, assigned_to: panelAssigned || null } : null);
    } catch (err) {
      console.error('Error updating ticket:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Send reply ────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selected.id,
        sender_id: user?.id,
        message: replyText.trim(),
        is_internal: isInternal,
      });
      if (error) throw error;
      setReplyText('');
      await fetchMessages(selected.id);
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const matchStatus   = statusFilter   === 'all' || t.status   === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const stats = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    urgent:      tickets.filter(t => t.priority === 'urgent').length,
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Support Tickets (CRM)" variant="admin">
      <div className="p-4 sm:p-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {/* Open */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Open</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.open}</p>
          </div>
          {/* In Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">In Progress</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.in_progress}</p>
          </div>
          {/* Resolved */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Resolved</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.resolved}</p>
          </div>
          {/* Urgent */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Urgent</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.urgent}</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter pills */}
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {s === 'all' ? 'All Status' : statusLabel[s as Ticket['status']]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            Priority
          </button>
        </div>

        {/* Priority filter – collapsible */}
        {showFilters && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['all', 'low', 'medium', 'high', 'urgent'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  priorityFilter === p
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {p === 'all' ? 'All Priority' : p}
              </button>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 py-20 text-center">
            <Headphones className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No tickets found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'All support tickets will appear here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
                  <tr>
                    {['Ticket #', 'Customer', 'Category', 'Subject', 'Priority', 'Status', 'Created', 'Assigned To', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {filtered.map(ticket => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                      onClick={() => openPanel(ticket)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <span className="text-red-600 dark:text-red-400 text-xs font-bold">
                              {ticket.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-xs leading-tight">
                              {ticket.profiles?.full_name ?? 'Unknown'}
                            </p>
                            {ticket.profiles?.phone && (
                              <p className="text-gray-400 dark:text-gray-500 text-xs">{ticket.profiles.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize text-xs">
                        {ticket.category ?? '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-gray-800 dark:text-gray-200 truncate text-xs" title={ticket.subject}>
                          {ticket.subject}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityBadge[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[ticket.status]}`}>
                          {statusLabel[ticket.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap text-xs">
                        {new Date(ticket.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {ticket.assigned_to
                          ? staffList.find(s => s.id === ticket.assigned_to)?.full_name ?? ticket.assigned_to
                          : <span className="text-gray-300 dark:text-slate-600">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openPanel(ticket)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                        >
                          <MessageSquare className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Side Panel / Modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={closePanel}>
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                    {selected.ticket_number}
                  </h3>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Support Ticket</p>
                </div>
              </div>
              <button
                onClick={closePanel}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Ticket Details ── */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Ticket Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selected.profiles?.full_name ?? 'Unknown Customer'}
                      </p>
                      {selected.profiles?.phone && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{selected.profiles.phone}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{selected.subject}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityBadge[selected.priority]}`}>
                      {selected.priority} priority
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[selected.status]}`}>
                      {statusLabel[selected.status]}
                    </span>
                    {selected.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 capitalize">
                        {selected.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Created {fmt(selected.created_at)}
                  </p>
                </div>
              </div>

              {/* ── Update Controls ── */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Update Ticket
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <select
                      value={panelStatus}
                      onChange={e => setPanelStatus(e.target.value as Ticket['status'])}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  {/* Assigned To */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assign To</label>
                    <select
                      value={panelAssigned}
                      onChange={e => setPanelAssigned(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name ?? s.id} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={saveTicketChanges}
                  disabled={updatingStatus}
                  className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* ── Messages ── */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Conversation
                </h4>
                {messagesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 mx-auto text-gray-200 dark:text-slate-700 mb-2" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No messages yet.</p>
                    <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">
                      Replies from staff and customers will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-3 text-sm ${
                          msg.is_internal
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40'
                            : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {msg.profiles?.full_name ?? 'Unknown'}
                            {msg.is_internal && (
                              <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-normal">(internal note)</span>
                            )}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Reply Form ── */}
              <div className="px-5 py-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Reply
                </h4>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Type your reply…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 resize-none transition-colors mb-2"
                />
                <div className="flex items-center justify-between">
                  {/* Internal toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setIsInternal(p => !p)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        isInternal ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isInternal ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Internal note
                    </span>
                  </label>

                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
