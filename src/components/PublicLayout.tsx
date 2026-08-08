import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Calendar, Sun, Moon, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm border-b border-gray-100 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://images.pexels.com/photos/30751895/pexels-photo-30751895.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1" alt="NMR Car Services" className="w-10 h-10 rounded-lg object-cover" />
            <div className="leading-tight">
              <span className="font-bold text-gray-900 dark:text-white text-base">NMR Car Services</span>
              <span className="block text-xs text-red-600 font-semibold -mt-0.5">Mumbai</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.href} to={l.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(l.href)
                    ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href="tel:629182859" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors">
              <Phone className="w-4 h-4" />
              <span className="hidden lg:inline">629182859</span>
            </a>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user && profile?.role === 'admin' ? (
              <div className="flex items-center gap-2">
                <Link to="/admin/dashboard" className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={async () => { await signOut(); navigate('/'); }}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/book" className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                <Calendar className="w-4 h-4" /> Book Now
              </Link>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 px-4 py-3 space-y-1">
          {navLinks.map(l => (
            <Link key={l.href} to={l.href} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive(l.href) ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
            <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
              {isDark ? <><Sun className="w-4 h-4" /> Light Mode</> : <><Moon className="w-4 h-4" /> Dark Mode</>}
            </button>
            {user && profile?.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                </Link>
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate('/'); }} className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/book" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium text-center justify-center">
                <Calendar className="w-4 h-4" /> Book a Service
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-gray-900 dark:bg-slate-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="https://images.pexels.com/photos/30751895/pexels-photo-30751895.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1" alt="NMR Car Services" className="w-10 h-10 rounded-lg object-cover" />
              <div>
                <span className="font-bold text-white text-base block leading-tight">NMR Car Services</span>
                <span className="text-xs text-red-400">Mumbai</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Professional car service &amp; repairs in the heart of Mumbai. Trusted by thousands of customers across the city.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Our Services</h4>
            <ul className="space-y-2 text-sm">
              {['Basic Service', 'Full Service', 'AC Service', 'Tyre Service', 'Brake Repair', 'Car Wash', 'Battery Check', 'Wheel Alignment'].map(s => (
                <li key={s}><Link to="/services" className="hover:text-red-400 transition-colors">{s}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              {[['About Us', '/about'], ['Blog', '/blog'], ['FAQs', '/faqs'], ['Contact Us', '/contact']].map(([l, h]) => (
                <li key={h}><Link to={h} className="hover:text-red-400 transition-colors">{l}</Link></li>
              ))}
              <li><Link to="/admin/login" className="text-gray-500 hover:text-red-400 transition-colors text-xs">Admin Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                <span>629182859<br />Mon–Sat, 8am–8pm</span>
              </li>
              <li><span className="text-gray-400">support@nmrcarservices.in</span></li>
              <li className="text-gray-400 leading-relaxed">
                Mumbai, Maharashtra
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} NMR Car Services. All rights reserved.</span>
          <span>Mumbai, Maharashtra | Made in India</span>
        </div>
      </div>
    </footer>
  );
}
