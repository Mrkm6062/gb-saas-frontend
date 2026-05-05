import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, MessageCircle, DollarSign, ShieldCheck } from 'lucide-react';

const ManageCheckout = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [formData, setFormData] = useState({
    codEnabled: true,
    whatsappEnabled: false,
    whatsappNumber: '',
    razorpayEnabled: false,
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentStore._id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/checkout-settings?storeId=${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data._id) {
            setFormData({
              codEnabled: data.codEnabled ?? true,
              whatsappEnabled: data.whatsappEnabled || false,
              whatsappNumber: data.whatsappNumber || '',
              razorpayEnabled: data.razorpayEnabled || false,
              razorpayKeyId: data.razorpayKeyId || '',
              razorpayKeySecret: data.razorpayKeySecret || ''
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, [currentStore._id, token, API_BASE_URL]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/checkout-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, storeId: currentStore._id })
      });
      if (res.ok) {
        setStatus('Payment settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus('Error saving settings.');
      }
    } catch (e) {
      setStatus('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Checkout & Payments">
      <div className="w-full px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3"><CreditCard className="text-[#76b900]" /> Payment Options</h2>
          <p className="text-slate-500">Configure how customers can pay on <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
        </div>

        {status && <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{status}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100"><DollarSign className="text-slate-600"/></div><div><h3 className="text-lg font-bold text-slate-800">Cash on Delivery (COD)</h3><p className="text-sm text-slate-500">Allow customers to pay in cash upon receiving the order.</p></div></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.codEnabled} onChange={e => setFormData({...formData, codEnabled: e.target.checked})} /><div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div></label></div></div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"><div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center border border-green-100"><MessageCircle className="text-green-600"/></div><div><h3 className="text-lg font-bold text-slate-800">WhatsApp Ordering</h3><p className="text-sm text-slate-500">Redirect customers to WhatsApp with their order details.</p></div></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.whatsappEnabled} onChange={e => setFormData({...formData, whatsappEnabled: e.target.checked})} /><div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div></label></div>
            {formData.whatsappEnabled && (
              <div className="pt-4 border-t border-slate-100 animate-fadeIn"><label className="block text-sm font-bold text-slate-700 mb-2">Business WhatsApp Number <span className="text-red-500">*</span></label><input type="tel" required={formData.whatsappEnabled} placeholder="e.g. 9876543210" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value.replace(/[^0-9]/g, '')})} className="w-full md:w-1/2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" /><p className="text-xs text-slate-500 mt-2">Customers will send their order message to this number.</p></div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"><div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100"><CreditCard className="text-blue-600"/></div><div><h3 className="text-lg font-bold text-slate-800">Razorpay Gateway</h3><p className="text-sm text-slate-500">Accept Credit Cards, UPI, Netbanking, and Wallets.</p></div></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.razorpayEnabled} onChange={e => setFormData({...formData, razorpayEnabled: e.target.checked})} /><div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div></label></div>
            {formData.razorpayEnabled && (
              <div className="pt-4 border-t border-slate-100 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">API Key ID <span className="text-red-500">*</span></label><input type="text" required={formData.razorpayEnabled} placeholder="rzp_live_xxxxxxxxx" value={formData.razorpayKeyId} onChange={e => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">API Key Secret <span className="text-red-500">*</span></label><input type="password" required={formData.razorpayEnabled} placeholder="••••••••••••••••" value={formData.razorpayKeySecret} onChange={e => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono" /></div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button type="submit" disabled={loading} className="px-8 py-3 bg-[#76b900] text-white font-bold text-lg rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2">
              <ShieldCheck size={20} />
              {loading ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default ManageCheckout;