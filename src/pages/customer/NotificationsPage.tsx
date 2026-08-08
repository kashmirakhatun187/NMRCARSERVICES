import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase, Notification } from '../../lib/supabase';
import { Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle, Calendar, CreditCard } from 'lucide-react';

const typeIcons: Record<string, any> = {
  info: <Info className="w-5 h-5 text-blue-500" />,
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  booking: <Calendar className="w-5 h-5 text-blue-500" />,
  payment: <CreditCard className="w-5 h-5 text-green-500" />,
  reminder: <Bell className="w-5 h-5 text-orange-500" />,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchNotifs(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout title="Notifications" variant="customer">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && <p className="text-sm text-blue-600 mt-0.5">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Bell className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  n.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200 shadow-sm'
                }`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  {typeIcons[n.type] ?? <Bell className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                  <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
