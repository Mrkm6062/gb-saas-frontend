import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Bell, Mail, Key, ShieldCheck, Settings, CheckCircle2 } from 'lucide-react';

const ManageAlerts = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [config, setConfig] = useState({
    isEmailEnabled: false, provider: 'gmail', smtpHost: 'smtp.gmail.com', smtpPort: 587, emailAddress: '', appPassword: ''
  });
  const [status, setStatus] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchConfig = async () => {
      if (!currentStore._id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setConfig({
            isEmailEnabled: data.isEmailEnabled || false,
            provider: data.provider || 'gmail',
            smtpHost: data.smtpHost || 'smtp.gmail.com',
            smtpPort: data.smtpPort || 587,
            emailAddress: data.emailAddress || '',
            appPassword: data.appPassword || ''
          });
        }
      } catch (error) {
        console.error("Failed to fetch alert config");
      }
    };
    fetchConfig();
  }, [currentStore._id]);

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setConfig(prev => ({
      ...prev,
      provider: val,
      smtpHost: val === 'gmail' ? 'smtp.gmail.com' : prev.smtpHost,
      smtpPort: val === 'gmail' ? 587 : prev.smtpPort
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (response.ok) setStatus('Configuration saved successfully!');
      else setStatus(`Error: ${(await response.json()).message}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMail = async () => {
    if (!testEmailTo) return alert("Please enter an email address to send the test to.");
    if (!config.emailAddress || !config.appPassword) return alert("Please fill and save your SMTP details first.");
    setTesting(true);
    setStatus('Sending test email...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...config, testEmailTo })
      });
      const data = await response.json();
      setStatus(response.ok ? '✅ Test email sent! Check your inbox.' : `❌ ${data.message}`);
    } catch (err) {
      setStatus(`❌ Network Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Alerts">
      <div className="p-6 mx-auto mt-6 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3"><Bell className="text-[#76b900]" /> Notifications & Alerts</h2>
          <p className="text-slate-500">Configure automated order confirmation emails for customers of <span className="font-bold text-slate-700">{currentStore.storeName}</span>.</p>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSave} className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div><h3 className="font-bold text-lg text-slate-800">Email Automation</h3><p className="text-sm text-slate-500">Send an automatic invoice receipt to your customers.</p></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.isEmailEnabled} onChange={e => setConfig({...config, isEmailEnabled: e.target.checked})} />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
              </label>
            </div>

            <div className={`space-y-5 transition-opacity ${!config.isEmailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Settings size={16}/> Mail Provider</label><select value={config.provider} onChange={handleProviderChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white text-sm"><option value="gmail">Gmail / Google Workspace</option><option value="custom">Custom SMTP Server</option></select></div>
                {config.provider === 'custom' && (<>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">SMTP Host</label><input required type="text" value={config.smtpHost} onChange={e=>setConfig({...config, smtpHost: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="mail.yourdomain.com" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">SMTP Port</label><input required type="number" value={config.smtpPort} onChange={e=>setConfig({...config, smtpPort: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="465 or 587" /></div>
                </>)}
              </div>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Mail size={16}/> Sending Email Address</label><input required type="email" value={config.emailAddress} onChange={e=>setConfig({...config, emailAddress: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="support@yourstore.com" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Key size={16}/> App Password</label><input required type="password" value={config.appPassword} onChange={e=>setConfig({...config, appPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="••••••••••••" />
                {config.provider === 'gmail' && <p className="text-xs text-slate-500 mt-2 flex items-start gap-1"><ShieldCheck size={14} className="shrink-0 text-blue-500" /> Since you are using Gmail, do not use your standard password. You must generate a 16-digit "App Password" inside your Google Account Security Settings.</p>}
              </div>

              <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition mt-6 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* Test Mail Section */}
          <div className={`border-t border-slate-100 bg-slate-50 p-6 sm:p-8 transition-opacity ${!config.isEmailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-[#76b900]"/> Test Your Connection</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="Enter recipient email address..." value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" />
              <button onClick={handleTestMail} type="button" disabled={testing || !testEmailTo} className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition whitespace-nowrap disabled:opacity-50 shadow-lg shadow-green-100">
                {testing ? 'Sending...' : 'Send Test Mail'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageAlerts;