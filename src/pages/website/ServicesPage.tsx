import { useEffect, useState } from 'react';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { supabase, Service } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, Search, Filter, Wrench } from 'lucide-react';

const categories = ['all', 'periodic', 'repair', 'wash', 'ac', 'tyres', 'electrical', 'bodywork', 'inspection'];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('services').select('*').eq('is_active', true).order('category');
      setServices(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'all' || s.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16">
        {/* Hero */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 mb-4">
              <Wrench className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm font-medium">All Services</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Our Service Menu</h1>
            <p className="text-gray-400 text-lg mb-8">Expert care for every make and model. Transparent pricing, no surprises.</p>

            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white/15"
              />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-all ${
                    category === c ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c === 'all' ? 'All Services' : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No services found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(s => (
                <div key={s.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-red-200 hover:shadow-xl transition-all group">
                  <div className="h-48 overflow-hidden">
                    <img src={s.image_url || 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg'}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full capitalize">{s.category}</span>
                      <span className="text-xl font-bold text-gray-900">₹{s.base_price.toLocaleString('en-IN')}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{s.name}</h3>
                    <p className="text-gray-500 text-sm mb-4">{s.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {s.duration_minutes} min
                      </span>
                      <Link to="/book" state={{ serviceId: s.id }}
                        className="flex items-center gap-1 text-red-600 text-sm font-medium group-hover:gap-2 transition-all">
                        Book Now <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
