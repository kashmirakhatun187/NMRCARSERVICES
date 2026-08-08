import { useEffect, useState } from 'react';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { supabase, FAQ } from '../../lib/supabase';
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react';

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('faqs').select('*').eq('is_active', true).order('sort_order');
      setFaqs(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = faqs.filter(f =>
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(f => f.category))];

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 py-16 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 mb-4">
            <HelpCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm font-medium">FAQ</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-400 text-lg mb-8">Find answers to common questions about our services.</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search FAQs..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-400" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No FAQs match your search.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map(cat => (
                <div key={cat}>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 capitalize">{cat}</h2>
                  <div className="space-y-3">
                    {filtered.filter(f => f.category === cat).map(faq => (
                      <div key={faq.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button
                          onClick={() => setOpen(open === faq.id ? null : faq.id)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                          {open === faq.id
                            ? <ChevronUp className="w-5 h-5 text-red-500 shrink-0" />
                            : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                        </button>
                        {open === faq.id && (
                          <div className="px-5 pb-5 border-t border-gray-100">
                            <p className="text-gray-600 text-sm leading-relaxed pt-4">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
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
