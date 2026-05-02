import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Check, X } from 'lucide-react';

const UpgradePlan = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  // Fetch available plans on component load
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        // Note: You will need to expose a public/user-facing route for GET /api/plans 
        // as the current one is protected under the SuperAdmin middleware
        const response = await fetch(`${API_BASE_URL}/api/plans`);
        if (response.ok) {
          const data = await response.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleUpgrade = async (planId) => {
    setStatus('Processing upgrade...');
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      // Calls a backend endpoint to upgrade the plan for the current store context
      const response = await fetch(`${API_BASE_URL}/api/store/${currentStore._id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();
      if (response.ok) {
        setStatus('Plan upgraded successfully! Please reload the page to see changes.');
      } else {
        setStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Plan & Billing">
      <div className="p-6 mx-auto mt-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Choose the Right Plan for Your Store</h2>
          <p className="text-slate-500">Unlock more products, custom domains, and premium features.</p>
        </div>

        {status && (
          <div className={`p-4 mb-8 rounded-xl font-medium text-sm border text-center ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 font-bold animate-pulse">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 xl:gap-6">
            {plans.map(plan => {
              const isCurrentPlan = currentStore.planId === plan._id || (!currentStore.planId && plan.name === 'Free');
              const isProPlan = plan.name === 'Pro'; // Identify the Pro plan
              
              return (
                <div key={plan._id} className={`bg-white rounded-2xl shadow-sm border-2 flex flex-col p-5 md:p-6 transition-all ${isCurrentPlan ? 'border-[#76b900] ring-4 ring-green-50' : isProPlan ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">₹{plan.price}</span>
                      <span className="text-slate-500 text-sm font-medium">/month</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3 mb-6 text-sm">
                    <div className="flex items-center gap-2"><Check size={18} className="text-[#76b900] shrink-0" /><span className="text-slate-600 font-medium">Up to {plan.features.maxProducts} Products</span></div>
                    <div className="flex items-center gap-2"><Check size={18} className="text-[#76b900] shrink-0" /><span className="text-slate-600 font-medium">Up to {plan.features.storeLimit || 1} Store(s)</span></div>
                    <div className="flex items-center gap-2"><Check size={18} className="text-[#76b900] shrink-0" /><span className="text-slate-600 font-medium">{plan.features.storageLimit ? (plan.features.storageLimit >= 1000 ? `${plan.features.storageLimit / 1000}GB` : `${plan.features.storageLimit}MB`) : '500MB'} Storage</span></div>
                    <div className="flex items-center gap-2">{plan.features.customDomain ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.customDomain ? 'text-slate-600' : 'text-slate-400'}`}>Custom Domain</span></div>
                    <div className="flex items-center gap-2">{plan.features.freeSsl ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.freeSsl ? 'text-slate-600' : 'text-slate-400'}`}>Free SSL/TLS HTTPS</span></div>
                    <div className="flex items-center gap-2">{plan.features.securityHeaders ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.securityHeaders ? 'text-slate-600' : 'text-slate-400'}`}>Free Security Headers</span></div>
                    <div className="flex items-center gap-2">{plan.features.basicAnalytics ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.basicAnalytics ? 'text-slate-600' : 'text-slate-400'}`}>Basic Analytics</span></div>
                    <div className="flex items-center gap-2">{plan.features.advanceAnalytics ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.advanceAnalytics ? 'text-slate-600' : 'text-slate-400'}`}>Advance Analytics</span></div>
                    <div className="flex items-center gap-2">{plan.features.whatsappOrderButton ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.whatsappOrderButton ? 'text-slate-600' : 'text-slate-400'}`}>WhatsApp Order Button</span></div>
                    <div className="flex items-center gap-2">{plan.features.sevenDaysTrial !== false ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.sevenDaysTrial !== false ? 'text-slate-600' : 'text-slate-400'}`}>7-Days Trial</span></div>
                    <div className="flex items-center gap-2">{plan.features.themes ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.themes ? 'text-slate-600' : 'text-slate-400'}`}>Premium Themes</span></div>
                    <div className="flex items-center gap-2">{plan.features.prioritySupport ? <Check size={18} className="text-[#76b900] shrink-0" /> : <X size={18} className="text-slate-300 shrink-0" />}<span className={`font-medium ${plan.features.prioritySupport ? 'text-slate-600' : 'text-slate-400'}`}>Priority Support</span></div>
                  </div>

                  <button 
                    onClick={() => handleUpgrade(plan._id)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all ${isCurrentPlan ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : isProPlan ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-[#76b900] text-white hover:bg-[#659e00] shadow-lg shadow-green-100'}`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Upgrade Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UpgradePlan;