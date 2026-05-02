import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Globe, CheckCircle, Clock, AlertCircle, Trash2, Copy, RefreshCw } from 'lucide-react';

const ManageDomain = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [domains, setDomains] = useState([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchDomains = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/domains`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      }
    } catch (err) {
      console.error("Failed to fetch domains", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore._id) fetchDomains();
  }, [currentStore._id]);

  const showStatus = (message, type = 'success') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName) return;
    setActionLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeId: currentStore._id, domainName: newDomainName })
      });
      const data = await response.json();
      
      if (response.ok) {
        setNewDomainName('');
        showStatus('Domain added successfully! Please configure your DNS settings.', 'success');
        fetchDomains();
      } else {
        showStatus(data.message || 'Failed to add domain', 'error');
      }
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDomain = async (id) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/domains/${id}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        showStatus('Domain verified and connected successfully!', 'success');
        fetchDomains();
      } else {
        showStatus(data.message || 'Domain verification failed. DNS changes can take up to 24 hours.', 'error');
      }
    } catch (err) {
      showStatus('Network error during verification.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!window.confirm("Are you sure you want to remove this domain? Your storefront will no longer be accessible via this URL.")) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/domains/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showStatus('Domain removed successfully.', 'success');
        fetchDomains();
      } else {
        const data = await response.json();
        showStatus(data.message || 'Failed to remove domain', 'error');
      }
    } catch (err) {
      showStatus('Network error while deleting domain.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showStatus('Copied to clipboard!', 'success');
  };

  // Filter domains specifically belonging to the active store being managed
  const storeDomains = domains.filter(d => d.storeId && (d.storeId._id === currentStore._id || d.storeId === currentStore._id));

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Custom Domains">
      <div className="p-6 max-w-5xl mx-auto mt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Manage Domains</h2>
          <p className="text-slate-500">Connect a custom domain to <span className="font-bold text-slate-700">{currentStore.storeName}</span> to build your brand.</p>
        </div>

        {status.message && (
          <div className={`p-4 mb-6 rounded-xl font-medium text-sm border flex items-center gap-3 animate-fadeIn ${status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {status.message}
          </div>
        )}

        {/* Add Domain Form */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe size={20} className="text-[#76b900]" /> Connect Existing Domain
          </h3>
          <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Domain Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">https://</span>
                <input type="text" value={newDomainName} onChange={(e) => setNewDomainName(e.target.value)} placeholder="www.yourdomain.com" className="w-full pl-20 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition font-medium" required />
              </div>
            </div>
            <button type="submit" disabled={actionLoading || !newDomainName} className="w-full sm:w-auto px-8 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100 disabled:opacity-50 whitespace-nowrap">
              {actionLoading ? 'Connecting...' : 'Add Domain'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-4">Make sure you own the domain. You will need access to your DNS settings (e.g., GoDaddy, Hostinger) to complete the connection.</p>
        </div>

        {/* Domains List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading domains...</div>
          ) : storeDomains.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center">
              <Globe size={48} className="text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">No custom domains connected</h3>
              <p className="text-slate-500 max-w-md">Your store is currently only accessible via its free Galibrand subdomain (<a href={`https://${currentStore.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{currentStore.subdomain}</a>).</p>
            </div>
          ) : (
            storeDomains.map(domain => (
              <div key={domain._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-xl font-bold text-slate-800">{domain.domain}</h4>
                      {domain.status === 'connected' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><CheckCircle size={12} /> Connected</span>
                      ) : domain.status === 'failed' ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><AlertCircle size={12} /> Failed</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><Clock size={12} /> Pending Setup</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">Added on {new Date(domain.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer" className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Visit Site</a>
                    <button onClick={() => handleDeleteDomain(domain._id)} disabled={actionLoading} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={20} /></button>
                  </div>
                </div>

                {domain.status !== 'connected' && (
                  <div className="p-6">
                    <h5 className="font-bold text-slate-800 mb-2 text-sm flex items-center gap-2"><AlertCircle size={16} className="text-amber-500"/> Action Required: Update your DNS records</h5>
                    <p className="text-sm text-slate-600 mb-6">Log in to your domain provider and add the following CNAME record. DNS changes can take up to 24 hours to propagate globally.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</span>
                        <span className="font-mono font-bold text-slate-800">CNAME</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name / Host</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">{domain.domain.startsWith('www.') ? 'www' : '@'}</span>
                          <button onClick={() => copyToClipboard(domain.domain.startsWith('www.') ? 'www' : '@')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Value / Target</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">cname.galibrand.cloud</span>
                          <button onClick={() => copyToClipboard('cname.galibrand.cloud')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => handleVerifyDomain(domain._id)} disabled={actionLoading} className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition shadow-md flex items-center gap-2 disabled:opacity-50">
                      <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} /> Verify Connection
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageDomain;