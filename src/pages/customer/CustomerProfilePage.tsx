import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { User, Phone, MapPin, Save, CheckCircle, AlertCircle, Camera } from 'lucide-react';

export default function CustomerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name, phone: profile.phone, address: profile.address });
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error } = await supabase.from('profiles').update(form).eq('id', profile!.id);
    if (error) { setError(error.message); setSaving(false); return; }
    await refreshProfile();
    setSuccess('Profile updated successfully!');
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <DashboardLayout title="My Profile" variant="customer">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">{profile?.full_name?.[0]?.toUpperCase() ?? 'U'}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-50">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || 'User'}</h2>
            <p className="text-gray-500 text-sm capitalize">{profile?.role}</p>
            <p className="text-gray-400 text-xs mt-1">Member since {profile ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-6">Edit Profile</h3>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Full Name" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  placeholder="+91 98765 43210" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={3}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Your full address" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
