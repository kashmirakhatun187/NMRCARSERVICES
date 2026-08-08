import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Gift, Users, Copy, CheckCircle, Share2, Zap } from 'lucide-react';

type ReferralStatus = 'pending' | 'signed_up' | 'completed' | 'rewarded';

interface Referral {
  id: string;
  referred_user_id: string | null;
  status: ReferralStatus;
  points_earned: number | null;
  created_at: string;
  referred_email?: string | null;
}

const STATUS_CONFIG: Record<ReferralStatus, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', label: 'Pending' },
  signed_up: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Signed Up' },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Completed' },
  rewarded: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Rewarded' },
};

const HOW_IT_WORKS = [
  { step: 1, icon: <Share2 className="w-6 h-6 text-blue-500" />, title: 'Share Your Code', desc: 'Send your unique referral code or link to friends and family' },
  { step: 2, icon: <Users className="w-6 h-6 text-green-500" />, title: 'They Sign Up', desc: 'Your friend signs up and books their first service' },
  { step: 3, icon: <Zap className="w-6 h-6 text-amber-500" />, title: 'Both Earn Rewards', desc: 'You earn 200 pts, they get ₹100 off their first booking' },
];

export default function ReferPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const referralCode = useMemo(() => {
    if (!user) return '';
    return 'AUTO' + user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  }, [user]);

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });
        setReferrals(data || []);
      } catch {
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const stats = useMemo(() => {
    const total = referrals.length;
    const completed = referrals.filter((r) => r.status === 'completed' || r.status === 'rewarded').length;
    const pending = referrals.filter((r) => r.status === 'pending' || r.status === 'signed_up').length;
    const totalPoints = referrals.reduce((s, r) => s + (r.points_earned || 0), 0);
    return { total, completed, pending, totalPoints };
  }, [referrals]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `🚗 Hey! Use my referral code *${referralCode}* to sign up on AutoCare and get ₹100 off your first service! ${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <DashboardLayout variant="customer" title="Refer & Earn">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Refer & Earn</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invite friends, earn 200 points per successful referral
          </p>
        </div>

        {/* Referral Code Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">Your unique referral code</p>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
            <span className="flex-1 text-center text-3xl font-black text-blue-600 dark:text-blue-400 tracking-widest font-mono">
              {referralCode}
            </span>
            <button
              onClick={copyCode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${linkCopied ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Referred', value: stats.total, icon: <Users className="w-4 h-4 text-blue-500" />, color: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Pending', value: stats.pending, icon: <Gift className="w-4 h-4 text-yellow-500" />, color: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Points Earned', value: `${stats.totalPoints} pts`, icon: <Zap className="w-4 h-4 text-purple-500" />, color: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className={`inline-flex p-1.5 rounded-lg ${s.color} mb-2`}>{s.icon}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* How it Works */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-2">
                  {step.icon}
                </div>
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">
                  {step.step}
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{step.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Your Referrals</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-12 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No referrals yet. Share your code to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {referrals.map((r) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {r.referred_email || `Referral #${r.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.points_earned ? (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">+{r.points_earned} pts</span>
                      ) : null}
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
