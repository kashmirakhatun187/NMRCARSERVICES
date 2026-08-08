import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Settings, Save, CheckCircle, AlertCircle, Building, Phone, Mail, MapPin, Globe } from 'lucide-react';

export default function AdminSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [garageSettings, setGarageSettings] = useState({
    name: 'NMR Car Services',
    phone: '629182859',
    email: 'support@nmrcarservices.in',
    address: 'Mumbai, Maharashtra',
    gst_number: '19AABCA1234B1Z5',
    website: 'https://nmrcarservices.in',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuccess('Settings saved!');
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <DashboardLayout title="Settings" variant="admin">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Garage Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Building className="w-5 h-5 text-red-600" /> Garage Information</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input value={garageSettings.name} onChange={e => setGarageSettings(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
                <input value={garageSettings.phone} onChange={e => setGarageSettings(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</label>
                <input value={garageSettings.email} onChange={e => setGarageSettings(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Address</label>
              <textarea value={garageSettings.address} onChange={e => setGarageSettings(p => ({ ...p, address: e.target.value }))} rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input value={garageSettings.gst_number} onChange={e => setGarageSettings(p => ({ ...p, gst_number: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</label>
                <input value={garageSettings.website} onChange={e => setGarageSettings(p => ({ ...p, website: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </form>
        </div>

        {/* Tax Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Tax & Invoice Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="font-medium text-gray-900 text-sm">Default GST Rate</p>
                <p className="text-gray-500 text-xs">Applied to all invoices by default</p>
              </div>
              <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white">
                <option value="18">18% (Standard)</option>
                <option value="12">12%</option>
                <option value="5">5%</option>
                <option value="28">28%</option>
              </select>
            </div>
            {[
              { label: 'Send Invoice via Email', desc: 'Automatically email invoices on payment' },
              { label: 'Enable Online Payments', desc: 'Allow customers to pay online' },
              { label: 'Pickup & Drop Service', desc: 'Offer doorstep pickup and delivery' },
              { label: 'Customer Reviews', desc: 'Allow customers to leave reviews' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.label}</p>
                  <p className="text-gray-500 text-xs">{s.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
