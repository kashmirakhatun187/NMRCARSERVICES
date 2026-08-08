import { useEffect, useState } from 'react';
import { PublicHeader, PublicFooter } from '../../components/PublicLayout';
import { supabase, BlogPost } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Eye, Tag, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('is_published', true).order('published_at', { ascending: false });
      setPosts(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="pt-16">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 py-16 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 mb-4">
            <BookOpen className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm font-medium">Blog & Tips</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Car Care Tips & News</h1>
          <p className="text-gray-400 text-lg">Expert advice to keep your car in top shape.</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No blog posts yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {posts.map(post => (
                <article key={post.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="h-52 overflow-hidden">
                    <img src={post.cover_image || 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg'}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.views} views</span>
                    </div>
                    <h2 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">{post.title}</h2>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            <Tag className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link to={`/blog/${post.slug}`}
                      className="flex items-center gap-1 text-red-600 text-sm font-medium group-hover:gap-2 transition-all">
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
