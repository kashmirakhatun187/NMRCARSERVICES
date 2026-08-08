import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../lib/auth';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (!authLoading && user && profile) {
    return <Navigate to={roleHomePath(profile.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error, profile: freshProfile } = await signIn(email, password);
    if (error) {
      setError(error.message.includes('Invalid') ? 'Invalid email or password.' : error.message);
      setLoading(false);
      return;
    }
    navigate(roleHomePath(freshProfile?.role), { replace: true });
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
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
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your customer account</p>
        </div>

        {/* Card — always white so text is always readable */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass + ' pr-10'}
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New customer?{' '}
            <Link to="/register" className="text-red-600 font-semibold hover:text-red-700">Create Account</Link>
          </p>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-500 text-xs">
            <Link to="/" className="hover:text-white transition-colors">← Back to website</Link>
          </p>
          <p className="text-gray-600 text-xs">
            Staff?{' '}
            <Link to="/garage/login" className="text-gray-400 hover:text-white transition-colors underline">Garage login</Link>
            {' · '}
            <Link to="/admin/login" className="text-gray-400 hover:text-white transition-colors underline">Admin login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
