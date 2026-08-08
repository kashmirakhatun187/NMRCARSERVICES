import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, profile, loading: authLoading, signUp } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && user && profile) {
    return <Navigate to="/customer/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName, form.phone);
    if (error) {
      setError(error.message.includes('already') ? 'An account with this email already exists.' : error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate('/customer/dashboard'), 1500);
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src="https://images.pexels.com/photos/30751895/pexels-photo-30751895.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1" alt="NMR Car Services" className="w-11 h-11 rounded-xl object-cover shadow-lg" />
            <div className="leading-tight text-left">
              <span className="text-white font-bold text-base block">NMR Car Services</span>
              <span className="text-red-400 text-xs">Mumbai</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm">Join thousands of satisfied customers in Mumbai</p>
        </div>

        {/* Card — always light background so text is always readable */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Account Created!</h3>
              <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      required
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className={inputClass}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className={inputClass + ' pr-10'}
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={form.confirm}
                      onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                      className={inputClass}
                      placeholder="Repeat your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center mt-2 shadow-md shadow-red-600/20"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-red-600 font-semibold hover:text-red-700">Sign In</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-gray-500 text-xs hover:text-white transition-colors">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
