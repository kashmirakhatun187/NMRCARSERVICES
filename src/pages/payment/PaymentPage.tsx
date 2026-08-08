import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Smartphone, CreditCard, Building2, Wallet, Banknote, Layers,
  CheckCircle, XCircle, ArrowLeft, Shield, Lock, Clock,
  ChevronRight, Loader2, AlertCircle, Info, Copy, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash' | 'emi';
type TxnStatus = 'idle' | 'processing' | 'success' | 'failed';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  line_items: LineItem[];
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  discount: number;
  vehicle_info: string;
  booking_id: string | null;
}

interface LineItem { name: string; qty: number; unit_price: number; amount: number; }

const UPI_APPS = [
  { name: 'Google Pay', id: 'gpay', color: 'from-blue-500 to-blue-600', icon: '🅖' },
  { name: 'PhonePe', id: 'phonepe', color: 'from-purple-500 to-purple-700', icon: '₱' },
  { name: 'Paytm', id: 'paytm', color: 'from-sky-400 to-sky-600', icon: '⓹' },
  { name: 'BHIM UPI', id: 'bhim', color: 'from-orange-500 to-orange-600', icon: 'B' },
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Yes Bank', 'PNB', 'Bank of Baroda'];
const WALLETS = ['Paytm Wallet', 'Amazon Pay', 'Mobikwik', 'Freecharge', 'Ola Money'];
const EMI_OPTIONS = [
  { months: 3, rate: 0, label: '3 months – No cost EMI' },
  { months: 6, rate: 1.5, label: '6 months – 1.5% interest' },
  { months: 9, rate: 2, label: '9 months – 2% interest' },
  { months: 12, rate: 2.5, label: '12 months – 2.5% interest' },
];

// ── Simulate payment processing ───────────────────────────────────────────────
async function simulatePayment(method: PayMethod): Promise<{ success: boolean; ref: string }> {
  await new Promise(r => setTimeout(r, 2200 + Math.random() * 1200));
  // 90% success rate simulation
  const success = Math.random() > 0.1;
  const ref = 'REF' + Date.now().toString(36).toUpperCase();
  return { success, ref };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PayMethod>('upi');
  const [upiApp, setUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [emiMonths, setEmiMonths] = useState(3);
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmt, setPartialAmt] = useState('');
  const [txnStatus, setTxnStatus] = useState<TxnStatus>('idle');
  const [txnRef, setTxnRef] = useState('');
  const [txnError, setTxnError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (invoiceId) fetchInvoice(); }, [invoiceId]);

  async function fetchInvoice() {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!error && data) {
      setInvoice(data as Invoice);
      setPartialAmt(String(data.amount_due ?? data.total));
    }
    setLoading(false);
  }

  const payableAmount = isPartial
    ? Math.max(0, Math.min(parseFloat(partialAmt) || 0, invoice?.amount_due ?? 0))
    : (invoice?.amount_due ?? 0);

  const emiMonthlyAmt = () => {
    const opt = EMI_OPTIONS.find(e => e.months === emiMonths)!;
    const total = payableAmount * (1 + opt.rate / 100);
    return (total / emiMonths).toFixed(2);
  };

  async function handlePay() {
    if (!invoice || !user) return;
    if (payableAmount <= 0) { setTxnError('Amount must be greater than ₹0.'); return; }
    if (method === 'upi' && !upiId.trim() && upiApp === 'custom') {
      setTxnError('Please enter a valid UPI ID.'); return;
    }
    if (method === 'card') {
      if (card.number.replace(/\s/g, '').length < 16) { setTxnError('Enter a valid 16-digit card number.'); return; }
      if (!card.expiry || !card.cvv || !card.name) { setTxnError('Please fill all card details.'); return; }
    }

    setTxnStatus('processing');
    setTxnError('');

    const { success, ref } = await simulatePayment(method);

    if (success) {
      const newAmtPaid = (invoice.amount_paid || 0) + payableAmount;
      const newStatus = newAmtPaid >= (invoice.total || 0) ? 'paid' : 'partial';

      // Record transaction
      await supabase.from('payment_transactions').insert({
        invoice_id: invoice.id,
        customer_id: user.id,
        amount: payableAmount,
        method,
        status: 'success',
        upi_id: method === 'upi' ? (upiId || upiApp) : '',
        card_last4: method === 'card' ? card.number.slice(-4) : '',
        card_brand: method === 'card' ? detectCardBrand(card.number) : '',
        bank_name: method === 'netbanking' ? bank : '',
        wallet_name: method === 'wallet' ? wallet : '',
        emi_months: method === 'emi' ? emiMonths : null,
        gateway_ref: ref,
        processed_at: new Date().toISOString(),
      });

      // Update invoice
      await supabase.from('invoices')
        .update({ amount_paid: newAmtPaid, status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null })
        .eq('id', invoice.id);

      // Create EMI plan rows
      if (method === 'emi') {
        const monthly = parseFloat(emiMonthlyAmt());
        const rows = Array.from({ length: emiMonths }, (_, i) => {
          const due = new Date();
          due.setMonth(due.getMonth() + i + 1);
          return { transaction_id: ref, customer_id: user.id, instalment_number: i + 1, due_date: due.toISOString().split('T')[0], amount: monthly, status: 'pending' };
        });
        // Use the real txn id from the DB
        const { data: txnRow } = await supabase.from('payment_transactions').select('id').eq('gateway_ref', ref).maybeSingle();
        if (txnRow) {
          await supabase.from('emi_plans').insert(rows.map(r => ({ ...r, transaction_id: txnRow.id })));
        }
      }

      setTxnRef(ref);
      setTxnStatus('success');
    } else {
      await supabase.from('payment_transactions').insert({
        invoice_id: invoice.id,
        customer_id: user.id,
        amount: payableAmount,
        method,
        status: 'failed',
        failure_reason: 'Payment declined by bank',
        processed_at: new Date().toISOString(),
      });
      setTxnStatus('failed');
      setTxnError('Payment declined. Please try a different method or contact your bank.');
    }
  }

  function detectCardBrand(num: string) {
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    if (num.startsWith('6')) return 'RuPay';
    if (num.startsWith('37')) return 'Amex';
    return 'Card';
  }

  function formatCard(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(val: string) {
    return val.replace(/\D/g, '').slice(0, 4).replace(/(.{2})/, '$1/');
  }

  function copyRef() {
    navigator.clipboard.writeText(txnRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">Invoice not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn-primary">Go Back</button>
      </div>
    </div>
  );

  // ── Success Screen ────────────────────────────────────────────────────────
  if (txnStatus === 'success') return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} paid via{' '}
          <span className="font-semibold capitalize">{method}</span>
        </p>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-6">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">Transaction Reference</p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-mono text-lg font-bold text-green-700 dark:text-green-300">{txnRef}</p>
            <button onClick={copyRef} className="text-green-500 hover:text-green-600">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {method === 'emi' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">EMI Plan Activated</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              ₹{emiMonthlyAmt()} / month for {emiMonths} months
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/customer/invoices')} className="flex-1 btn-primary">
            View Invoice
          </button>
          <button onClick={() => navigate('/customer/dashboard')} className="flex-1 btn-secondary">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main Checkout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">Secure Checkout</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Invoice {invoice.invoice_number}</p>
          </div>
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> SSL Secured
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Payment Methods */}
        <div className="lg:col-span-3 space-y-4">

          {/* Amount selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Payment Amount</h3>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setIsPartial(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${!isPartial ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                Full Amount — ₹{(invoice.amount_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </button>
              <button
                onClick={() => setIsPartial(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${isPartial ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                Partial Payment
              </button>
            </div>
            {isPartial && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Enter amount (max ₹{invoice.amount_due})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                  <input type="number" value={partialAmt} onChange={e => setPartialAmt(e.target.value)}
                    max={invoice.amount_due} min={1}
                    className="input pl-8" placeholder="0.00" />
                </div>
              </div>
            )}
          </div>

          {/* Method tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-gray-200 dark:border-slate-700">
              {([
                { id: 'upi', icon: <Smartphone className="w-4 h-4" />, label: 'UPI' },
                { id: 'card', icon: <CreditCard className="w-4 h-4" />, label: 'Card' },
                { id: 'netbanking', icon: <Building2 className="w-4 h-4" />, label: 'NetBank' },
                { id: 'wallet', icon: <Wallet className="w-4 h-4" />, label: 'Wallet' },
                { id: 'cash', icon: <Banknote className="w-4 h-4" />, label: 'Cash' },
                { id: 'emi', icon: <Layers className="w-4 h-4" />, label: 'EMI' },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setMethod(m.id as PayMethod)}
                  className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all ${
                    method === m.id
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-500'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>

            <div className="p-5">

              {/* UPI */}
              {method === 'upi' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select UPI App</p>
                  <div className="grid grid-cols-2 gap-3">
                    {UPI_APPS.map(app => (
                      <button key={app.id} onClick={() => setUpiApp(app.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          upiApp === app.id
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800'
                        }`}>
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                          {app.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{app.name}</span>
                        {upiApp === app.id && <CheckCircle className="w-4 h-4 text-red-500 ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Or enter UPI ID manually</label>
                    <input value={upiId} onChange={e => setUpiId(e.target.value)}
                      className="input" placeholder="yourname@upi" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    UPI payments are secured by NPCI. No charges.
                  </div>
                </div>
              )}

              {/* Card */}
              {method === 'card' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Credit / Debit Card</p>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Card Number</label>
                    <input value={card.number} onChange={e => setCard(c => ({ ...c, number: formatCard(e.target.value) }))}
                      className="input font-mono tracking-widest" placeholder="0000 0000 0000 0000" maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Expiry</label>
                      <input value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                        className="input" placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">CVV</label>
                      <input value={card.cvv} onChange={e => setCard(c => ({ ...c, cvv: e.target.value.slice(0, 4) }))}
                        type="password" className="input" placeholder="•••" maxLength={4} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Cardholder Name</label>
                    <input value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
                      className="input uppercase" placeholder="NAME ON CARD" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    256-bit SSL encrypted. We never store card data.
                  </div>
                </div>
              )}

              {/* Net Banking */}
              {method === 'netbanking' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select Bank</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BANKS.map(b => (
                      <button key={b} onClick={() => setBank(b)}
                        className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          bank === b
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-red-200 dark:hover:border-red-800'
                        }`}>
                        {bank === b && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5 text-red-500" />}
                        {b}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    You will be redirected to {bank}'s secure portal.
                  </div>
                </div>
              )}

              {/* Wallet */}
              {method === 'wallet' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select Wallet</p>
                  <div className="space-y-2">
                    {WALLETS.map(w => (
                      <button key={w} onClick={() => setWallet(w)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          wallet === w
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-red-200 dark:hover:border-red-800'
                        }`}>
                        <Wallet className="w-4 h-4 shrink-0" />
                        {w}
                        {wallet === w && <CheckCircle className="w-4 h-4 ml-auto text-red-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash */}
              {method === 'cash' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-6 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <Banknote className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cash on Service</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      Pay ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in cash when the service is completed at the garage.
                    </p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Please keep exact change ready. Our staff will issue a physical receipt.
                    </p>
                  </div>
                </div>
              )}

              {/* EMI */}
              {method === 'emi' && (
                <div className="space-y-4">
                  {payableAmount < 3000 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        EMI is available for amounts above ₹3,000. Current amount: ₹{payableAmount.toLocaleString('en-IN')}.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select EMI Tenure</p>
                      <div className="space-y-2">
                        {EMI_OPTIONS.map(opt => (
                          <button key={opt.months} onClick={() => setEmiMonths(opt.months)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                              emiMonths === opt.months
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                : 'border-gray-200 dark:border-slate-600 hover:border-red-200'
                            }`}>
                            <span className={`font-medium ${emiMonths === opt.months ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {opt.label}
                            </span>
                            <span className="text-gray-900 dark:text-white font-bold">
                              ₹{((payableAmount * (1 + opt.rate / 100)) / opt.months).toFixed(2)}/mo
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Total payable: ₹{(payableAmount * (1 + (EMI_OPTIONS.find(e => e.months === emiMonths)?.rate ?? 0) / 100)).toFixed(2)}
                          {' '}over {emiMonths} months
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {txnError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mt-3">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {txnError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Order Summary</h3>
            {invoice.vehicle_info && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{invoice.vehicle_info}</p>
            )}

            <div className="space-y-2 mb-4">
              {(invoice.line_items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.name} {item.qty > 1 ? `×${item.qty}` : ''}</span>
                  <span className="text-gray-900 dark:text-white font-medium">₹{Number(item.amount || item.unit_price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
              {(!invoice.line_items || invoice.line_items.length === 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Service Charges</span>
                  <span className="text-gray-900 dark:text-white font-medium">₹{Number(invoice.subtotal || invoice.total).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span><span>₹{Number(invoice.subtotal || invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount</span><span>-₹{Number(invoice.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>GST ({invoice.tax_rate || 18}%)</span>
                <span>₹{Number(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Already Paid</span><span>-₹{Number(invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-slate-700">
                <span>{isPartial ? 'Paying Now' : 'Total Due'}</span>
                <span className="text-red-600 dark:text-red-400">
                  ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Shield className="w-4 h-4 text-green-500" />, label: '100% Secure' },
              { icon: <Lock className="w-4 h-4 text-blue-500" />, label: 'SSL Encrypted' },
              { icon: <Clock className="w-4 h-4 text-orange-500" />, label: 'Instant Confirm' },
            ].map(b => (
              <div key={b.label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2 flex flex-col items-center gap-1">
                {b.icon}
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={txnStatus === 'processing' || (method === 'emi' && payableAmount < 3000)}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-2xl
                       shadow-lg shadow-red-600/30 hover:from-red-700 hover:to-red-800 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base">
            {txnStatus === 'processing' ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
            ) : (
              <>Pay ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <ChevronRight className="w-5 h-5" /></>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            By paying you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
