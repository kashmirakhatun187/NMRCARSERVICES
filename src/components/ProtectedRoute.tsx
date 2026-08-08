import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../lib/auth';
import { UserRole } from '../lib/supabase';

interface Props {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: Props) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );

  // Not logged in → send to correct login page
  if (!user) {
    const loginPage = redirectTo ?? (() => {
      // Determine which login page based on the route being protected
      return '/login';
    })();
    return <Navigate to={loginPage} replace />;
  }

  // Wrong role → redirect to their own home portal, not always customer dashboard
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleHomePath(profile.role)} replace />;
  }

  // Profile still loading but user exists — wait for profile before enforcing role
  if (allowedRoles && !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <>{children}</>;
}
