import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Car, Home, Calendar, Wrench, Settings, Bell, LogOut, Menu, X,
  ChevronRight, User, FileText, CreditCard, Package,
  BarChart2, Users, Gauge, ClipboardList, Sun, Moon,
  Building, Megaphone, DollarSign, ClipboardCheck, MapPin,
  MessageSquare, Send, Star
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
}

interface SidebarGroup {
  group: string;
  items: SidebarItem[];
}

type Props = { children: ReactNode; title: string; variant?: 'admin'; };

const adminNav: SidebarGroup[] = [
  { group: 'Overview', items: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <Gauge className="w-4 h-4" /> },
    { label: 'Bookings', href: '/admin/bookings', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Customers', href: '/admin/customers', icon: <Users className="w-4 h-4" /> },
    { label: 'Reports & P&L', href: '/admin/reports', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'Payments', href: '/admin/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Expenses', href: '/admin/expenses', icon: <DollarSign className="w-4 h-4" /> },
  ]},
  { group: 'Billing & Communication', items: [
    { label: 'Invoices & GST', href: '/admin/invoices', icon: <FileText className="w-4 h-4" /> },
    { label: 'Messaging', href: '/admin/messaging', icon: <Send className="w-4 h-4" /> },
  ]},
  { group: 'Manage', items: [
    { label: 'Services', href: '/admin/services', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Spare Parts', href: '/admin/parts', icon: <Package className="w-4 h-4" /> },
    { label: 'Branches', href: '/admin/branches', icon: <Building className="w-4 h-4" /> },
  ]},
  { group: 'Growth & Support', items: [
    { label: 'Coupons', href: '/admin/coupons', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Support Tickets', href: '/admin/tickets', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Website Feedback', href: '/admin/feedback', icon: <Star className="w-4 h-4" /> },
    { label: 'Blog & FAQs', href: '/admin/content', icon: <FileText className="w-4 h-4" /> },
  ]},
  { group: 'System', items: [
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
  ]},
];

const accent = { bg: 'bg-red-600', light: 'bg-red-50 text-red-600', hover: 'hover:text-red-600', gradient: 'from-red-600 to-red-800' };

export function DashboardLayout({ children, title, variant = 'admin' }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700">
      {/* Logo */}
      <div className={`bg-gradient-to-br ${accent.gradient} px-5 py-4 shrink-0`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="https://images.pexels.com/photos/30751895/pexels-photo-30751895.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1" alt="NMR Car Services" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">NMR</div>
            <div className="text-red-300 text-xs">Workshop</div>
            <div className="text-white/70 text-xs">Admin Dashboard</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${accent.bg} rounded-full flex items-center justify-center shrink-0`}>
            <span className="text-white font-semibold text-sm">{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
          </div>
          <button onClick={toggleTheme} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
        {adminNav.map(group => (
          <div key={group.group} className="mb-3">
            <p className="px-3 py-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{group.group}</p>
            {group.items.map(item => {
              const active = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                    active
                      ? `${accent.light} dark:bg-opacity-20`
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}>
                  <span className={active ? '' : 'text-gray-400 dark:text-slate-500'}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{item.badge}</span>}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-gray-100 dark:border-slate-700 shrink-0 space-y-0.5">
        <Link to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <Home className="w-4 h-4" /> Website
        </Link>
        <button onClick={async () => { await signOut(); navigate('/admin/login'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="hidden sm:flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`w-8 h-8 ${accent.bg} rounded-full flex items-center justify-center`}>
              <span className="text-white font-semibold text-xs">{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
