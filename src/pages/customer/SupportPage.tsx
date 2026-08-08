import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Headphones,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Send,
  ChevronLeft,
} from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'booking' | 'payment' | 'vehicle' | 'complaint' | 'feedback' | 'other';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_type: 'customer' | 'agent';
  created_at: string;
}

const STATUS_CONFIG: Record<TicketStatus, { color: string; label: string; icon: React.ReactNode }> = {
  open: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Open', icon: <Clock className="w-3 h-3" /> },
  in_progress: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', label: 'In Progress', icon: <AlertCircle className="w-3 h-3" /> },
  resolved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Resolved', icon: <CheckCircle className="w-3 h-3" /> },
  closed: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: 'Closed', icon: <CheckCircle className="w-3 h-3" /> },
};

const PRIORITY_CONFIG: Record<TicketPriority, { color: string; label: string }> = {
  low: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Urgent' },
};

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'booking', label: 'Booking Issue' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'vehicle', label: 'Vehicle Issue' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
];

const defaultForm = {
  category: 'other' as TicketCategory,
  subject: '',
  description: '',
  priority: 'medium' as TicketPriority,
};

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  // Ticket detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        ticket_number: ticketNumber,
        subject: form.subject,
        category: form.category,
        priority: form.priority,
        description: form.description,
        status: 'open',
      });
      if (error) throw error;
      setShowModal(false);
      setForm(defaultForm);
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    setSendingReply(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: reply.trim(),
          sender_type: 'customer',
          user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => [...prev, data]);
      setReply('');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Ticket Detail View
  if (selectedTicket) {
    const statusCfg = STATUS_CONFIG[selectedTicket.status];
    const priorityCfg = PRIORITY_CONFIG[selectedTicket.priority];
    return (
      <DashboardLayout variant="customer" title="Support Tickets">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => setSelectedTicket(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tickets
          </button>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{selectedTicket.subject}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">#{selectedTicket.ticket_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${priorityCfg.color}`}>
                    {priorityCfg.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                {selectedTicket.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Created: {new Date(selectedTicket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Messages */}
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Conversation
              </h3>
              {loadingMessages ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="animate-pulse h-12 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No messages yet.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs sm:max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
                          msg.sender_type === 'customer'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender_type === 'customer' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {msg.sender_type === 'agent' && ' · Support Agent'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !reply.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Tickets List View
  return (
    <DashboardLayout variant="customer" title="Support Tickets">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Support Tickets</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get help with your queries and issues</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-24" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Headphones className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No tickets yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Need help? Create a support ticket and we'll get back to you.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              const priorityCfg = PRIORITY_CONFIG[ticket.priority];
              return (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">#{ticket.ticket_number}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityCfg.color}`}>
                        {priorityCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Support Ticket</h2>
              <button onClick={() => { setShowModal(false); setForm(defaultForm); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category <span className="text-red-500">*</span></label>
                <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="Brief description of the issue" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea required rows={4} placeholder="Describe your issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${form.priority === p ? PRIORITY_CONFIG[p].color + ' border-current' : 'border-slate-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-slate-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(defaultForm); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? 'Creating...' : 'Create Ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
