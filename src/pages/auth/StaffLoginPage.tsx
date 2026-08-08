import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Wrench, Eye, EyeOff, Mail, Lock, AlertCircle, HardHat } from 'lucide-react';

export default function StaffLoginPage() {
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Already logged-in staff/mechanic go to garage dashboard; others bounce
  if (!authLoading && user && profile) {
    if (profile.role === 'staff' || profile.role === 'mechanic') return <Navigate to="/garage/dashboard" replace />;
    return <Navigate to={roleHomePath(profile.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error, profile: freshProfile } = await signIn(email, password);
    if (error) {
      setError('Invalid credentials. Please try again.');
      setLoading(false);
      return;
    }
    if (freshProfile?.role !== 'staff' && freshProfile?.role !== 'mechanic') {
      setError('Access denied. This login is for garage staff only.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    navigate('/garage/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-900/15 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-6">
            <HardHat className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-400 text-xs font-semibold tracking-wider uppercase">Garage Staff Portal · NMR Car Services</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-600/30">
              <Wrench className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Staff Sign In</h1>
          <p className="text-gray-400 text-sm">For mechanics and service staff only</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 text-gray-900 placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  placeholder="staff@nmrcarservices.in" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 text-gray-900 placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  placeholder="Staff password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><HardHat className="w-4 h-4" /> Sign In to Workshop</>}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-zinc-600 text-xs">
            Not a staff member?{' '}
            <Link to="/login" className="text-zinc-400 hover:text-white transition-colors underline">Customer login</Link>
            {' · '}
            <Link to="/admin/login" className="text-zinc-400 hover:text-white transition-colors underline">Admin login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
