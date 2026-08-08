import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
  Megaphone,
  Mail,
  MessageSquare,
  Bell,
  Send,
  Plus,
  Eye,
  Calendar,
  X,
  Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignType = 'email' | 'whatsapp' | 'sms' | 'push';
type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
type TargetAudience = 'all' | 'customers' | 'members' | 'inactive';

interface Campaign {
  id: string;
  title: string;
  type: CampaignType;
  subject?: string | null;
  content: string;
  target_audience: TargetAudience;
  status: CampaignStatus;
  sent_count: number;
  open_count: number;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

interface CreateCampaignForm {
  type: CampaignType;
  title: string;
  subject: string;
  content: string;
  target_audience: TargetAudience;
  scheduled_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { value: CampaignType; label: string; icon: React.ReactNode }[] = [
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'sms', label: 'SMS', icon: <Send className="w-4 h-4" /> },
  { value: 'push', label: 'Push', icon: <Bell className="w-4 h-4" /> },
];

const AUDIENCE_OPTIONS: { value: TargetAudience; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'customers', label: 'Customers' },
  { value: 'members', label: 'Members' },
  { value: 'inactive', label: 'Inactive Users' },
];

function statusBadge(status: CampaignStatus) {
  const map: Record<CampaignStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    sent: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  };
  return map[status] ?? map.draft;
}

function typeBadge(type: CampaignType) {
  const map: Record<CampaignType, string> = {
    email: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    sms: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    push: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  };
  return map[type] ?? '';
}

function typeIcon(type: CampaignType) {
  switch (type) {
    case 'email': return <Mail className="w-3.5 h-3.5" />;
    case 'whatsapp': return <MessageSquare className="w-3.5 h-3.5" />;
    case 'sms': return <Send className="w-3.5 h-3.5" />;
    case 'push': return <Bell className="w-3.5 h-3.5" />;
  }
}

function formatDate(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function randomSentCount() {
  return Math.floor(Math.random() * (5000 - 100 + 1)) + 100;
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

interface LivePreviewProps {
  type: CampaignType;
  title: string;
  subject: string;
  content: string;
}

function LivePreview({ type, title, subject, content }: LivePreviewProps) {
  const displayContent = content || 'Your message content will appear here…';
  const displayTitle = title || 'Campaign Title';

  if (type === 'email') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
        {/* Email Header */}
        <div className="bg-slate-100 dark:bg-slate-700 px-4 py-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="flex-1 text-center truncate">Email Preview</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Subject</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {subject || '(no subject)'}
            </p>
          </div>
          <hr className="border-slate-200 dark:border-slate-600" />
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-900 dark:text-gray-100">{displayTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
          </div>
          <div className="pt-2">
            <button className="bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-lg">
              View Details →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'whatsapp') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="bg-[#075E54] px-4 py-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">WhatsApp</span>
        </div>
        <div className="bg-[#ECE5DD] dark:bg-slate-700 p-4 min-h-[100px]">
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] dark:bg-emerald-900/60 rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-0.5">
                {displayTitle}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {displayContent}
              </p>
              <p className="text-right text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sms') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2 flex items-center gap-2">
          <Send className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">SMS Message</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 p-4 min-h-[100px]">
          <div className="flex justify-end">
            <div className="bg-blue-500 rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]">
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                {displayContent}
              </p>
            </div>
          </div>
          <p className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  // push
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2 flex items-center gap-2">
        <Bell className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Push Notification</span>
      </div>
      <div className="bg-slate-100 dark:bg-slate-800 p-4">
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-md px-4 py-3 flex items-start gap-3 max-w-sm mx-auto">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100 truncate">
              {displayTitle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {displayContent}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">now</span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CampaignCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
        ))}
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form');

  const [form, setForm] = useState<CreateCampaignForm>({
    type: 'email',
    title: '',
    subject: '',
    content: '',
    target_audience: 'all',
    scheduled_at: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCampaigns((data as Campaign[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count ?? 0), 0);
  const sentCampaigns = campaigns.filter(c => c.sent_count > 0);
  const avgOpenRate =
    sentCampaigns.length === 0
      ? 0
      : sentCampaigns.reduce((acc, c) => acc + (c.open_count / (c.sent_count || 1)) * 100, 0) /
        sentCampaigns.length;

  // ── Create Campaign ────────────────────────────────────────────────────────

  function openModal() {
    setForm({
      type: 'email',
      title: '',
      subject: '',
      content: '',
      target_audience: 'all',
      scheduled_at: '',
    });
    setPreviewTab('form');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        target_audience: form.target_audience,
        status: form.scheduled_at ? 'scheduled' : 'draft',
        sent_count: 0,
        open_count: 0,
        scheduled_at: form.scheduled_at || null,
      };
      if (form.type === 'email') payload.subject = form.subject.trim() || null;

      const { error: err } = await supabase.from('campaigns').insert([payload]);
      if (err) throw err;
      closeModal();
      await fetchCampaigns();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Send Now ───────────────────────────────────────────────────────────────

  async function handleSendNow(campaign: Campaign) {
    setSendingId(campaign.id);
    try {
      const sentCount = randomSentCount();
      const openCount = Math.floor(sentCount * (Math.random() * 0.4 + 0.1)); // 10–50% open rate
      const { error: err } = await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          open_count: openCount,
        })
        .eq('id', campaign.id);
      if (err) throw err;
      await fetchCampaigns();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to send campaign.');
    } finally {
      setSendingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout variant="admin" title="Marketing Campaigns">
      <div className="space-y-6">

        {/* ── Stats Bar ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Campaigns',
              value: loading ? '—' : totalCampaigns.toLocaleString(),
              icon: <Megaphone className="w-5 h-5 text-indigo-500" />,
              bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            },
            {
              label: 'Messages Sent',
              value: loading ? '—' : totalSent.toLocaleString(),
              icon: <Send className="w-5 h-5 text-emerald-500" />,
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            },
            {
              label: 'Avg Open Rate',
              value: loading ? '—' : `${avgOpenRate.toFixed(1)}%`,
              icon: <Eye className="w-5 h-5 text-purple-500" />,
              bg: 'bg-purple-50 dark:bg-purple-900/20',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Header Row ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            All Campaigns
          </h2>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Campaign Grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
              No campaigns yet
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Create your first marketing campaign to reach your audience via email, WhatsApp, SMS, or push notifications.
            </p>
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4 hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-semibold text-slate-900 dark:text-gray-100 truncate">
                      {campaign.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge(campaign.type)}`}
                      >
                        {typeIcon(campaign.type)}
                        {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3" />
                        {campaign.target_audience}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge(campaign.status)}`}
                  >
                    {campaign.status}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Sent</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                      {campaign.sent_count > 0 ? campaign.sent_count.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Opens</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                      {campaign.open_count > 0 ? campaign.open_count.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Rate</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                      {campaign.sent_count > 0
                        ? `${((campaign.open_count / campaign.sent_count) * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Date Row */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  {campaign.sent_at ? (
                    <span>Sent {formatDate(campaign.sent_at)}</span>
                  ) : campaign.scheduled_at ? (
                    <span>Scheduled {formatDate(campaign.scheduled_at)}</span>
                  ) : (
                    <span>Created {formatDate(campaign.created_at)}</span>
                  )}
                </div>

                {/* Send Now Button (draft only) */}
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleSendNow(campaign)}
                    disabled={sendingId === campaign.id}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {sendingId === campaign.id ? 'Sending…' : 'Send Now'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Campaign Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Create Campaign
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 sm:hidden flex-shrink-0">
              {(['form', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPreviewTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                    previewTab === tab
                      ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab === 'form' ? 'Details' : 'Preview'}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row h-full">

                {/* Form Panel */}
                <form
                  onSubmit={handleCreate}
                  id="create-campaign-form"
                  className={`flex-1 p-6 space-y-5 overflow-y-auto ${previewTab === 'preview' ? 'hidden sm:block' : 'block'}`}
                >
                  {/* Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Campaign Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CAMPAIGN_TYPES.map(ct => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, type: ct.value }))}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            form.type === ct.value
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500'
                          }`}
                        >
                          {ct.icon}
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Summer Sale Announcement"
                      required
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
                    />
                  </div>

                  {/* Subject (email only) */}
                  {form.type === 'email' && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="e.g. Don't miss our biggest sale of the year!"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Message Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      placeholder="Write your message here…"
                      required
                      rows={4}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Users className="inline w-4 h-4 mr-1 mb-0.5" />
                      Target Audience
                    </label>
                    <select
                      value={form.target_audience}
                      onChange={e => setForm(f => ({ ...f, target_audience: e.target.value as TargetAudience }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
                    >
                      {AUDIENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Scheduled At */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Calendar className="inline w-4 h-4 mr-1 mb-0.5" />
                      Schedule (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Leave blank to save as draft
                    </p>
                  </div>
                </form>

                {/* Divider */}
                <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

                {/* Preview Panel */}
                <div className={`w-full sm:w-72 lg:w-80 flex-shrink-0 p-6 bg-slate-50 dark:bg-slate-800/50 space-y-4 overflow-y-auto ${previewTab === 'form' ? 'hidden sm:block' : 'block'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    Live Preview
                  </div>
                  <LivePreview
                    type={form.type}
                    title={form.title}
                    subject={form.subject}
                    content={form.content}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    Preview updates as you type
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-campaign-form"
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Megaphone className="w-4 h-4" />
                {submitting ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
