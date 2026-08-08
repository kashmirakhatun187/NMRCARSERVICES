import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  ShieldCheck, Eye, EyeOff, Mail, Lock, AlertCircle, LayoutDashboard
} from 'lucide-react';

export default function AdminLoginPage() {
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Already-logged-in admin goes straight to dashboard; others sent away
  if (!authLoading && user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to={roleHomePath(profile.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error, profile: freshProfile } = await signIn(email, password);
    if (error) {
      setError('Invalid credentials. Admin access only.');
      setLoading(false);
      return;
    }
    if (freshProfile?.role !== 'admin') {
      setError('Access denied. This login is for administrators only.');
      // Sign out the non-admin user silently
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 text-xs font-semibold tracking-wider uppercase">Admin Portal · NMR Car Services</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-xl shadow-red-600/30">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Administrator Access</h1>
          <p className="text-slate-400 text-sm">Restricted to authorised personnel only</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 text-gray-900 placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  placeholder="admin@nmrcarservices.in" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 text-gray-900 placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  placeholder="Admin password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><ShieldCheck className="w-4 h-4" /> Access Admin Panel</>}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-slate-600 text-xs">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors underline">Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
