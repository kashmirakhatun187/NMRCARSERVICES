import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Users, Search, Shield, User, Wrench, Settings, Eye, X, Phone } from 'lucide-react';

const roleColors: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-700',
  mechanic: 'bg-green-100 text-green-700',
  staff: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

const roleIcons: Record<string, any> = {
  customer: <User className="w-4 h-4" />,
  mechanic: <Wrench className="w-4 h-4" />,
  staff: <Settings className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (id: string, role: string) => {
    setSaving(true);
    const { error } = await supabase.rpc('update_user_role', { target_user_id: id, new_role: role });
    if (error) { alert('Failed to update role: ' + error.message); }
    else {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: role as any } : u));
      setSelected((prev: any) => prev ? { ...prev, role: role as any } : null);
    }
    setSaving(false);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ['customer', 'mechanic', 'staff', 'admin'].reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<string, number>);

  return (
    <DashboardLayout title="User Management" variant="admin">
      <div className="p-4 sm:p-6">
        {/* Role Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {(['customer', 'mechanic', 'staff', 'admin'] as const).map(role => (
            <button key={role} onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`p-4 bg-white rounded-2xl border-2 text-left transition-all ${roleFilter === role ? 'border-red-400 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${roleColors[role]}`}>
                {roleIcons[role]} <span className="capitalize">{role}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{roleCounts[role] ?? 0}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              placeholder="Search users..." />
          </div>
          <div className="flex gap-2">
            {['all', 'customer', 'mechanic', 'staff', 'admin'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all whitespace-nowrap ${
                  roleFilter === r ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['User', 'Phone', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No users found.</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-red-600 font-semibold text-sm">{u.full_name?.[0]?.toUpperCase() ?? '?'}</span>
                          </div>
                          <span className="font-medium text-gray-900">{u.full_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.phone || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full capitalize ${roleColors[u.role]}`}>
                          {roleIcons[u.role]} {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => setSelected(u)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">Manage User</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{selected.full_name?.[0]?.toUpperCase() ?? '?'}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selected.full_name}</h4>
                  {selected.phone && <p className="text-gray-500 text-sm">{selected.phone}</p>}
                  <p className="text-gray-400 text-xs">Joined {new Date(selected.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Change Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['customer', 'mechanic', 'staff', 'admin'] as const).map(role => (
                    <button key={role} onClick={() => updateRole(selected.id, role)} disabled={saving}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                        selected.role === role ? `border-current ${roleColors[role]}` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {roleIcons[role]} {role}
                      {selected.role === role && <span className="ml-auto text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {saving && <div className="text-center text-sm text-gray-500 py-2">Updating role...</div>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
