import React, { useState } from 'react';
import { X, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';

const FixSSLModal = ({ domain, onClose, onRecheck }) => {
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await onRecheck(domain._id);
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
          <h3 className="text-xl font-extrabold text-amber-900 flex items-center gap-2">
            <ShieldAlert size={24} className="text-amber-600" /> Fix SSL for your domain
          </h3>
          <button onClick={onClose} className="text-amber-700 hover:text-amber-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">1</div>
              <div><p className="font-bold text-slate-800">Ensure your domain is connected to Cloudflare.</p><p className="text-sm text-slate-500">Your domain nameservers must be pointing to Cloudflare.</p></div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">2</div>
              <div><p className="font-bold text-slate-800">Check DNS settings:</p>
              <ul className="text-sm text-slate-500 list-disc ml-5 mt-1 space-y-1">
                <li><strong>A record</strong> (@ &rarr; your server IP)</li>
                <li><strong>CNAME</strong> (www &rarr; cname.galibrand.cloud)</li>
                <li><strong>Proxy status</strong> must be ON (orange cloud ☁️)</li>
              </ul></div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">3</div>
              <div><p className="font-bold text-slate-800">Go to Cloudflare &rarr; SSL/TLS:</p>
              <ul className="text-sm text-slate-500 list-disc ml-5 mt-1 space-y-1">
                <li>Set SSL Mode = <strong>Full (Strict)</strong></li>
                <li>Enable <strong>"Always Use HTTPS"</strong> in Edge Certificates</li>
              </ul></div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">4</div>
              <div><p className="font-bold text-slate-800">Wait 1–5 minutes for SSL activation.</p></div>
            </div>
          </div>
          <button onClick={handleCheck} disabled={checking} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} /> {checking ? 'Checking SSL Status...' : 'Check Again'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default FixSSLModal;