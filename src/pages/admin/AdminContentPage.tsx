import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { FileText, BookOpen, Plus, Edit2, Trash2, X, Eye, ToggleRight, ToggleLeft, HelpCircle, CheckCircle } from 'lucide-react';

export default function AdminContentPage() {
  const [tab, setTab] = useState<'blog' | 'faq'>('blog');
  const [posts, setPosts] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    const [{ data: bp }, { data: faqData }] = await Promise.all([
      supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('faqs').select('*').order('sort_order'),
    ]);
    setPosts(bp ?? []);
    setFaqs(faqData ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openPostModal = (post?: any) => {
    setEditId(post?.id ?? null);
    setForm(post ? { title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, cover_image: post.cover_image, category: post.category, is_published: post.is_published } : { title: '', slug: '', excerpt: '', content: '', cover_image: '', category: 'tips', is_published: false });
    setError('');
    setShowModal(true);
  };

  const openFaqModal = (faq?: any) => {
    setEditId(faq?.id ?? null);
    setForm(faq ? { question: faq.question, answer: faq.answer, category: faq.category, sort_order: faq.sort_order, is_active: faq.is_active } : { question: '', answer: '', category: 'general', sort_order: 0, is_active: true });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let err;
    if (tab === 'blog') {
      const payload = { ...form, slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), published_at: form.is_published ? new Date().toISOString() : null };
      if (editId) ({ error: err } = await supabase.from('blog_posts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId));
      else ({ error: err } = await supabase.from('blog_posts').insert(payload));
    } else {
      const payload = { ...form, sort_order: Number(form.sort_order) };
      if (editId) ({ error: err } = await supabase.from('faqs').update(payload).eq('id', editId));
      else ({ error: err } = await supabase.from('faqs').insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess('Saved!');
    setShowModal(false);
    await fetchData();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Delete this?')) return;
    await supabase.from(table).delete().eq('id', id);
    await fetchData();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('blog_posts').update({ is_published: !current, published_at: !current ? new Date().toISOString() : null }).eq('id', id);
    await fetchData();
  };

  return (
    <DashboardLayout title="Blog & FAQs" variant="admin">
      <div className="p-4 sm:p-6">
        {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm"><CheckCircle className="w-4 h-4" /> {success}</div>}

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button onClick={() => setTab('blog')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'blog' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <BookOpen className="w-4 h-4" /> Blog Posts ({posts.length})
            </button>
            <button onClick={() => setTab('faq')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'faq' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <HelpCircle className="w-4 h-4" /> FAQs ({faqs.length})
            </button>
          </div>
          <button onClick={() => tab === 'blog' ? openPostModal() : openFaqModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm">
            <Plus className="w-4 h-4" /> Add {tab === 'blog' ? 'Post' : 'FAQ'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : tab === 'blog' ? (
          <div className="space-y-4">
            {posts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-all">
                {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
                    <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${p.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.is_published ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className="text-gray-500 text-sm truncate">{p.excerpt}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString('en-IN')} · {p.views} views · {p.category}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => togglePublish(p.id, p.is_published)} className={`p-2 rounded-lg transition-colors ${p.is_published ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {p.is_published ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openPostModal(p)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete('blog_posts', p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-md transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 mb-1">{f.question}</p>
                  <p className="text-gray-500 text-sm line-clamp-2">{f.answer}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{f.category}</span>
                    <span>Order: {f.sort_order}</span>
                    <span className={f.is_active ? 'text-green-600' : 'text-red-500'}>{f.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openFaqModal(f)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete('faqs', f.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit' : 'Add'} {tab === 'blog' ? 'Blog Post' : 'FAQ'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              {tab === 'blog' ? (
                <>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input required value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                    <textarea rows={2} value={form.excerpt} onChange={e => setForm((p: any) => ({ ...p, excerpt: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 resize-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea rows={5} value={form.content} onChange={e => setForm((p: any) => ({ ...p, content: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 resize-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                    <input value={form.cover_image} onChange={e => setForm((p: any) => ({ ...p, cover_image: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_published} onChange={e => setForm((p: any) => ({ ...p, is_published: e.target.checked }))} className="w-4 h-4 rounded text-red-600" />
                        <span className="text-sm text-gray-700">Publish immediately</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                    <input required value={form.question} onChange={e => setForm((p: any) => ({ ...p, question: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                    <textarea required rows={4} value={form.answer} onChange={e => setForm((p: any) => ({ ...p, answer: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 resize-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                      <input type="number" value={form.sort_order} onChange={e => setForm((p: any) => ({ ...p, sort_order: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded text-red-600" />
                    <span className="text-sm text-gray-700">Active (visible on website)</span>
                  </label>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
