import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Star, Gift, TrendingUp, Award, Zap } from 'lucide-react';

type TransactionType = 'earn' | 'redeem' | 'bonus' | 'referral';

interface LoyaltyTransaction {
  id: string;
  type: TransactionType;
  points: number;
  description: string;
  created_at: string;
}

const TYPE_CONFIG: Record<TransactionType, { color: string; label: string; icon: React.ReactNode }> = {
  earn: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    label: 'Earned',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  redeem: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    label: 'Redeemed',
    icon: <Gift className="w-3.5 h-3.5" />,
  },
  bonus: {
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    label: 'Bonus',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  referral: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    label: 'Referral',
    icon: <Award className="w-3.5 h-3.5" />,
  },
};

const TIERS = [
  { name: 'Silver', min: 0, max: 999, color: 'from-slate-400 to-slate-500', textColor: 'text-slate-600 dark:text-slate-300' },
  { name: 'Gold', min: 1000, max: 4999, color: 'from-amber-400 to-amber-500', textColor: 'text-amber-600 dark:text-amber-300' },
  { name: 'Platinum', min: 5000, max: Infinity, color: 'from-purple-400 to-purple-600', textColor: 'text-purple-600 dark:text-purple-300' },
];

const HOW_TO_EARN = [
  { icon: <Star className="w-5 h-5 text-amber-500" />, title: 'Service Booking', desc: 'Earn 10 points for every ₹100 spent', points: '+10 pts/₹100' },
  { icon: <Gift className="w-5 h-5 text-blue-500" />, title: 'Refer a Friend', desc: 'Earn 200 points when your referral books', points: '+200 pts' },
  { icon: <Zap className="w-5 h-5 text-purple-500" />, title: 'Bonus Events', desc: 'Double points on special occasions', points: '2x pts' },
];

const REWARDS = [
  { points: 500, value: '₹50 off', desc: 'Discount on any service' },
  { points: 1000, value: '₹100 off', desc: 'Discount on any service' },
  { points: 2500, value: '₹300 off', desc: 'Discount on any service' },
  { points: 5000, value: 'Free Service', desc: 'Up to ₹500 value' },
];

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load loyalty data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const totalPoints = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.points || 0), 0),
    [transactions]
  );

  const currentTier = useMemo(
    () => TIERS.find((t) => totalPoints >= t.min && totalPoints <= t.max) || TIERS[0],
    [totalPoints]
  );

  const nextTier = useMemo(() => {
    const idx = TIERS.findIndex((t) => t.name === currentTier.name);
    return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  }, [currentTier]);

  const tierProgress = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.min - currentTier.min;
    const progress = totalPoints - currentTier.min;
    return Math.min(100, Math.round((progress / range) * 100));
  }, [totalPoints, currentTier, nextTier]);

  return (
    <DashboardLayout variant="customer" title="Loyalty Points & Rewards">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Loyalty Points & Rewards</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Earn points on every service and redeem for rewards</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        {/* Points Balance Card */}
        {loading ? (
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-2xl h-48 mb-6" />
        ) : (
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${currentTier.color} p-6 mb-6 shadow-lg text-white`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white transform translate-x-12 -translate-y-12" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white transform -translate-x-8 translate-y-8" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm font-medium uppercase tracking-widest">{currentTier.name} Member</span>
                <Award className="w-7 h-7 text-white/60" />
              </div>
              <p className="text-5xl font-black text-white mb-1">{totalPoints.toLocaleString()}</p>
              <p className="text-white/80 text-sm mb-4">Total Points</p>

              {/* Tier Progress */}
              {nextTier && (
                <div>
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>{currentTier.name}</span>
                    <span>{nextTier.name} at {nextTier.min.toLocaleString()} pts</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-500"
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                  <p className="text-white/70 text-xs mt-1">
                    {(nextTier.min - totalPoints).toLocaleString()} more points to {nextTier.name}
                  </p>
                </div>
              )}
              {!nextTier && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-sm">You've reached the top tier! 🎉</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tiers Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-3 text-center border-2 transition-all ${currentTier.name === tier.name ? 'border-current shadow-md ' + tier.textColor : 'border-slate-200 dark:border-slate-700'}`}
            >
              <p className={`font-bold text-base ${currentTier.name === tier.name ? tier.textColor : 'text-gray-500 dark:text-gray-400'}`}>{tier.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {tier.max === Infinity ? `${tier.min.toLocaleString()}+` : `${tier.min}–${tier.max.toLocaleString()}`} pts
              </p>
              {currentTier.name === tier.name && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-current text-white text-xs rounded-full opacity-80">Current</span>
              )}
            </div>
          ))}
        </div>

        {/* How to Earn */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            How to Earn Points
          </h2>
          <div className="space-y-3">
            {HOW_TO_EARN.map((item) => (
              <div key={item.title} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{item.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Gift className="w-4 h-4 text-blue-500" />
            Redeem Points
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {REWARDS.map((r) => (
              <div key={r.points} className={`rounded-xl border p-3 ${totalPoints >= r.points ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{r.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.desc}</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{r.points.toLocaleString()} pts</p>
                {totalPoints >= r.points && (
                  <button className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg font-medium transition-colors">
                    Redeem
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Transaction History</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-12 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center">
              <Star className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet. Start earning!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.map((t) => {
                const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.earn;
                const isPositive = t.points > 0;
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{t.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {isPositive ? '+' : ''}{t.points.toLocaleString()} pts
                    </span>
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
