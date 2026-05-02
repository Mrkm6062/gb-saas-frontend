import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PlatformFooter from '../components/PlatformFooter';

const PlatformPolicy = () => {
  const { type } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const response = await fetch(`${API_BASE_URL}/api/platform-policies/public`);
        if (response.ok) {
          const data = await response.json();
          const found = data.find(p => p.type === type);
          setPolicy(found);
        }
      } catch (err) {
        console.error('Failed to fetch platform policy:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [type]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src="https://galibrand.cloud/public/Name.png" alt="Galibrand" className="h-8 w-auto" />
        </Link>
        <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-[#76b900] transition">
          Back to Home
        </Link>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 font-bold animate-pulse">Loading Policy...</div>
        ) : policy ? (
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">{policy.title}</h1>
            <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-wider">Version {policy.version} • Last Updated: {new Date(policy.updatedAt).toLocaleDateString()}</p>
            <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">{policy.content}</div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200"><h2 className="text-2xl font-bold text-slate-800 mb-2">Policy Not Found</h2><p className="text-slate-500 mb-6">The policy you are looking for does not exist or has been removed.</p><Link to="/login" className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition">Return Home</Link></div>
        )}
      </main>

      <PlatformFooter />
    </div>
  );
};
export default PlatformPolicy;