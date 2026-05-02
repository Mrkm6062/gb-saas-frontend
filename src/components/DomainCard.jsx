import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Trash2, Copy, RefreshCw, Lock, Unlock, ShieldAlert } from 'lucide-react';

const DomainCard = ({ domain: initialDomain, token, currentStore, onDelete, onVerify, onFixSSL, copyToClipboard }) => {
  const [domain, setDomain] = useState(initialDomain);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  // Auto-refresh logic: Poll every 10s if SSL is pending and domain is connected
  useEffect(() => {
    let interval;
    if (domain.status === 'connected' && domain.sslStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/domains/status/${domain._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDomain(prev => ({ ...prev, status: data.status, sslStatus: data.sslStatus }));
          }
        } catch (e) {
          // Silent fail on polling
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [domain.status, domain.sslStatus, domain._id, token, API_BASE_URL]);

  // Sync external domain updates
  useEffect(() => { setDomain(initialDomain); }, [initialDomain]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-bold text-slate-800">{domain.domain}</h4>
            
            {/* Connection Badge */}
            {domain.status === 'connected' ? (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><CheckCircle size={12} /> Connected</span>
            ) : domain.status === 'failed' ? (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><AlertCircle size={12} /> Failed</span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><Clock size={12} /> Pending Setup</span>
            )}

            {/* SSL Badge */}
            {domain.sslStatus === 'active' ? (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><Lock size={12} /> Secure</span>
            ) : domain.sslStatus === 'failed' ? (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><Unlock size={12} /> SSL Failed</span>
            ) : (
              <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1"><Clock size={12} /> SSL Pending</span>
            )}
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-4">
            <span>Added on {new Date(domain.createdAt).toLocaleDateString()}</span>
            
            {/* Fix SSL Button */}
            {domain.status === 'connected' && domain.sslStatus !== 'active' && (
              <button onClick={() => onFixSSL(domain)} className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition underline">
                <ShieldAlert size={14} /> Fix SSL
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer" className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Visit Site</a>
          <button onClick={() => onDelete(domain._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={20} /></button>
        </div>
      </div>

      {domain.status !== 'connected' && (
        <div className="p-6">
          <h5 className="font-bold text-slate-800 mb-2 text-sm flex items-center gap-2"><AlertCircle size={16} className="text-amber-500"/> Action Required: Update your DNS records</h5>
          <p className="text-sm text-slate-600 mb-6">Log in to your domain provider and add the following <strong>two</strong> DNS records. DNS changes can take up to 24 hours to propagate globally.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</span><span className="font-mono font-bold text-slate-800">A Record</span></div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name / Host</span>
              <div className="flex items-center justify-between"><span className="font-mono font-bold text-slate-800">@</span><button onClick={() => copyToClipboard('@')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Value / Target</span>
              <div className="flex items-center justify-between"><span className="font-mono font-bold text-slate-800">72.62.199.214</span><button onClick={() => copyToClipboard('72.62.199.214')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</span><span className="font-mono font-bold text-slate-800">CNAME</span></div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name / Host</span>
              <div className="flex items-center justify-between"><span className="font-mono font-bold text-slate-800">www</span><button onClick={() => copyToClipboard('www')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group"><span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Value / Target</span>
              <div className="flex items-center justify-between"><span className="font-mono font-bold text-slate-800">cname.galibrand.cloud</span><button onClick={() => copyToClipboard('cname.galibrand.cloud')} className="text-slate-400 hover:text-[#76b900] transition"><Copy size={16} /></button></div>
            </div>
          </div>

          <button onClick={() => onVerify(domain._id)} className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition shadow-md flex items-center gap-2">
            <RefreshCw size={16} /> Verify Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default DomainCard;