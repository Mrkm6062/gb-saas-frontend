import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, ShieldCheck } from 'lucide-react';

const ManagePlatformPayments = ({ token, stores, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [formData, setFormData] = useState({
    razorpayEnabled: false,
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform-payments/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            razorpayEnabled: data.razorpayEnabled || false,
            razorpayKeyId: data.razorpayKeyId || '',
            razorpayKeySecret: data.razorpayKeySecret || ''
          });
        }
      } catch (e) {
        console.error("Failed to load platform payment settings");
      }
    };
    fetchSettings();
  }, [token, API_BASE_URL]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform-payments/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatus('✅ Settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else setStatus('❌ Failed to save settings.');
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Superadmin Settings">
      <div className="w-full px-6 py-10 max-w-4xl mx-auto">
        <div className="mb-8"><h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3"><ShieldCheck className="text-blue-600" /> Platform Billing Settings</h2><p className="text-slate-500">Manage the global Razorpay keys used for SaaS plan subscriptions.</p></div>
        {status && <div className="p-4 mb-6 rounded-xl font-bold text-sm border bg-white">{status}</div>}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100"><CreditCard className="text-blue-600"/></div><div><h3 className="text-lg font-bold text-slate-800">SaaS Razorpay Gateway</h3><p className="text-sm text-slate-500">Accept payments from store owners when they create a store or upgrade.</p></div></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.razorpayEnabled} onChange={e => setFormData({...formData, razorpayEnabled: e.target.checked})} /><div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div></label></div>
            {formData.razorpayEnabled && (
              <div className="pt-4 border-t border-slate-100 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Platform API Key ID <span className="text-red-500">*</span></label><input type="text" required={formData.razorpayEnabled} value={formData.razorpayKeyId} onChange={e => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-sm font-mono" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Platform API Key Secret <span className="text-red-500">*</span></label><input type="password" required={formData.razorpayEnabled} value={formData.razorpayKeySecret} onChange={e => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-sm font-mono" /></div>
              </div>
            )}
          </div>
          <div className="flex justify-end"><button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 flex items-center gap-2">{loading ? 'Saving...' : 'Save Keys'}</button></div>
        </form>
      </div>
    </AdminLayout>
  );
};
export default ManagePlatformPayments;