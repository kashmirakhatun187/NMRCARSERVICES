import { useEffect, useState } from 'react';
import { Check, MessageSquare, Star } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';

type Inquiry = { id: string; name: string; email: string; phone: string; subject: string; message: string; status: string; created_at: string };
type Rating = { id: string; name: string; car_model: string; rating: number; comment: string; is_published: boolean; created_at: string };

export default function AdminFeedbackPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: inquiryData }, { data: ratingData }] = await Promise.all([
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('site_ratings').select('*').order('created_at', { ascending: false }),
    ]);
    setInquiries((inquiryData as Inquiry[]) ?? []);
    setRatings((ratingData as Rating[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateInquiry = async (id: string, status: string) => {
    await supabase.from('inquiries').update({ status }).eq('id', id);
    setInquiries(items => items.map(item => item.id === id ? { ...item, status } : item));
  };

  const toggleRating = async (rating: Rating) => {
    const is_published = !rating.is_published;
    await supabase.from('site_ratings').update({ is_published }).eq('id', rating.id);
    setRatings(items => items.map(item => item.id === rating.id ? { ...item, is_published } : item));
  };

  return (
    <DashboardLayout title="Website Feedback" variant="admin">
      <div className="p-4 sm:p-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-5 h-5 text-red-600" /><h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer inquiries</h2></div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {loading ? <p className="p-6 text-gray-500">Loading saved inquiries...</p> : inquiries.length === 0 ? <p className="p-6 text-gray-500">No inquiries yet.</p> : <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Subject</th><th className="text-left p-3">Message</th><th className="text-left p-3">Status</th></tr></thead><tbody>{inquiries.map(item => <tr key={item.id} className="border-t border-gray-100 dark:border-slate-700"><td className="p-3 whitespace-nowrap"><p className="font-semibold text-gray-900 dark:text-white">{item.name}</p><p className="text-xs text-gray-500">{item.email}<br />{item.phone}</p></td><td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.subject}</td><td className="p-3 min-w-[260px] text-gray-600 dark:text-gray-400">{item.message}</td><td className="p-3"><select value={item.status} onChange={event => void updateInquiry(item.id, event.target.value)} className="rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1.5"><option value="new">New</option><option value="read">Read</option><option value="responded">Responded</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table>}
          </div>
        </section>
        <section>
          <div className="flex items-center gap-2 mb-4"><Star className="w-5 h-5 text-yellow-500" /><h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer ratings</h2></div>
          <div className="grid gap-3">{ratings.length === 0 ? <p className="text-gray-500">No ratings yet.</p> : ratings.map(rating => <div key={rating.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><div><div className="flex items-center gap-1">{Array.from({ length: rating.rating }).map((_, index) => <Star key={index} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}<span className="ml-2 font-semibold text-gray-900 dark:text-white">{rating.name}</span></div><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rating.comment}</p><p className="text-xs text-gray-500 mt-1">{rating.car_model || 'Car owner'} · {new Date(rating.created_at).toLocaleDateString('en-IN')}</p></div><button onClick={() => void toggleRating(rating)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${rating.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{rating.is_published && <Check className="w-4 h-4" />}{rating.is_published ? 'Published' : 'Hidden'}</button></div>)}</div>
        </section>
      </div>
    </DashboardLayout>
  );
}
