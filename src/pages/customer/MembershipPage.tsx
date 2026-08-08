import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Crown, Star, Shield, CheckCircle, Zap, Gift, X } from 'lucide-react';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
  is_active: boolean;
}

interface UserMembership {
  id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  status: string;
  membership_plans: MembershipPlan;
}

const PLAN_THEMES: Record<string, { gradient: string; badge: string; icon: React.ReactNode; border: string; textAccent: string }> = {
  silver: {
    gradient: 'from-slate-400 to-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    icon: <Shield className="w-6 h-6 text-slate-400" />,
    border: 'border-slate-300 dark:border-slate-600',
    textAccent: 'text-slate-600 dark:text-slate-400',
  },
  gold: {
    gradient: 'from-amber-400 to-amber-600',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <Star className="w-6 h-6 text-amber-400" />,
    border: 'border-amber-300 dark:border-amber-700',
    textAccent: 'text-amber-600 dark:text-amber-400',
  },
  platinum: {
    gradient: 'from-purple-500 to-purple-700',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    icon: <Crown className="w-6 h-6 text-purple-400" />,
    border: 'border-purple-300 dark:border-purple-700',
    textAccent: 'text-purple-600 dark:text-purple-400',
  },
};

const FALLBACK_PLANS: MembershipPlan[] = [
  {
    id: 'silver',
    name: 'Silver',
    slug: 'silver',
    monthly_price: 199,
    yearly_price: 1999,
    is_active: true,
    features: [
      '5% discount on services',
      'Priority booking',
      'Free vehicle health check (1/year)',
      'Email support',
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    slug: 'gold',
    monthly_price: 499,
    yearly_price: 4999,
    is_active: true,
    features: [
      '10% discount on all services',
      'Priority & express booking',
      'Free vehicle health check (2/year)',
      'Free oil change (1/year)',
      'Roadside assistance (5 calls/year)',
      'Priority phone support',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    slug: 'platinum',
    monthly_price: 999,
    yearly_price: 9999,
    is_active: true,
    features: [
      '20% discount on all services',
      'Unlimited priority booking',
      'Free vehicle health checks',
      'Free oil changes (4/year)',
      'Unlimited roadside assistance',
      'Free pickup & drop',
      'Dedicated account manager',
      '24/7 phone support',
    ],
  },
];

export default function MembershipPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>(FALLBACK_PLANS);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const [plansRes, membershipRes] = await Promise.all([
          supabase.from('membership_plans').select('*').eq('is_active', true).order('monthly_price'),
          supabase
            .from('user_memberships')
            .select('*, membership_plans(*)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
        ]);
        if (plansRes.data && plansRes.data.length > 0) setPlans(plansRes.data);
        if (membershipRes.data) setUserMembership(membershipRes.data);
      } catch {
        // Use fallback plans
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const handleSubscribe = async (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const confirmSubscribe = async () => {
    if (!user || !selectedPlan) return;
    setSubscribing(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      const { data, error } = await supabase.from('user_memberships').insert({
        user_id: user.id,
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
      }).select('*, membership_plans(*)').single();
      if (error) throw error;
      setUserMembership(data);
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const isCurrentPlan = (plan: MembershipPlan) =>
    userMembership?.plan_id === plan.id && userMembership?.status === 'active';

  return (
    <DashboardLayout variant="customer" title="Membership Plans">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Membership Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Unlock premium benefits and save more on every service</p>
        </div>

        {/* Active Membership Banner */}
        {!loading && userMembership && (
          <div className={`rounded-2xl p-5 mb-6 bg-gradient-to-r ${PLAN_THEMES[userMembership.membership_plans.slug]?.gradient || 'from-blue-500 to-blue-700'} text-white shadow-lg`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5" />
                  <span className="font-bold text-lg">Active: {userMembership.membership_plans.name} Plan</span>
                </div>
                <p className="text-white/80 text-sm">
                  Valid until {new Date(userMembership.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-white/70 text-xs mt-0.5 capitalize">{userMembership.billing_cycle} billing</p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-xs">Days remaining</p>
                <p className="text-3xl font-black">
                  {Math.max(0, Math.ceil((new Date(userMembership.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            Yearly
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs rounded-full font-bold">Save 20%</span>
          </span>
        </div>

        {/* Plan Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-2xl h-80" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const theme = PLAN_THEMES[plan.slug] || PLAN_THEMES.silver;
              const price = billingCycle === 'monthly' ? plan.monthly_price : Math.round(plan.yearly_price / 12);
              const isCurrent = isCurrentPlan(plan);
              const isPopular = plan.slug === 'gold';
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 ${isCurrent ? theme.border : 'border-slate-200 dark:border-slate-700'} shadow-sm flex flex-col overflow-hidden transition-shadow hover:shadow-md`}
                >
                  {isPopular && (
                    <div className="absolute top-0 inset-x-0 text-center py-1 bg-amber-400 text-xs font-bold text-white uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 inset-x-0 text-center py-1 bg-green-500 text-xs font-bold text-white uppercase tracking-wider">
                      Current Plan
                    </div>
                  )}
                  <div className={`bg-gradient-to-r ${theme.gradient} p-5 text-white ${isPopular || isCurrent ? 'pt-8' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {theme.icon}
                      <span className="font-bold text-lg">{plan.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">₹{price.toLocaleString()}</span>
                      <span className="text-white/70 text-sm">/mo</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-white/70 text-xs mt-0.5">₹{plan.yearly_price.toLocaleString()}/year</p>
                    )}
                  </div>
                  <div className="p-5 flex-1">
                    <ul className="space-y-2.5">
                      {(plan.features || []).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-5 pb-5">
                    {isCurrent ? (
                      <button disabled className="w-full py-2.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold text-sm cursor-default">
                        ✓ Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors bg-gradient-to-r ${theme.gradient} text-white hover:opacity-90`}
                      >
                        {userMembership ? 'Switch Plan' : 'Subscribe Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Subscription</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{selectedPlan.name} Plan</p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${billingCycle === 'monthly' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-400'}`}
                  >
                    Monthly<br />
                    <span className="font-bold">₹{selectedPlan.monthly_price}</span>
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${billingCycle === 'yearly' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-400'}`}
                  >
                    Yearly<br />
                    <span className="font-bold">₹{selectedPlan.yearly_price}</span>
                    <span className="text-xs text-green-600 dark:text-green-400 block">Save 20%</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your membership will be activated immediately and valid for {billingCycle === 'monthly' ? '1 month' : '1 year'} from today.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors">Cancel</button>
                <button type="button" onClick={confirmSubscribe} disabled={subscribing} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">{subscribing ? 'Processing...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
