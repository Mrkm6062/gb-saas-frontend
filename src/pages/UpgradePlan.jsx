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
      <div className="p-6 max-w-6xl mx-auto mt-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map(plan => {
              const isCurrentPlan = currentStore.planId === plan._id || (!currentStore.planId && plan.name === 'Free');
              
              return (
                <div key={plan._id} className={`bg-white rounded-2xl shadow-sm border-2 flex flex-col p-8 transition-all ${isCurrentPlan ? 'border-[#76b900] ring-4 ring-green-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                      <span className="text-slate-500 font-medium">/month</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4 mb-8">
                    <div className="flex items-center gap-3"><Check size={20} className="text-[#76b900]" /><span className="text-slate-600 font-medium">Up to {plan.features.maxProducts} Products</span></div>
                    <div className="flex items-center gap-3">{plan.features.customDomain ? <Check size={20} className="text-[#76b900]" /> : <X size={20} className="text-slate-300" />}<span className={`font-medium ${plan.features.customDomain ? 'text-slate-600' : 'text-slate-400'}`}>Custom Domain</span></div>
                    <div className="flex items-center gap-3">{plan.features.analytics ? <Check size={20} className="text-[#76b900]" /> : <X size={20} className="text-slate-300" />}<span className={`font-medium ${plan.features.analytics ? 'text-slate-600' : 'text-slate-400'}`}>Advanced Analytics</span></div>
                    <div className="flex items-center gap-3">{plan.features.themes ? <Check size={20} className="text-[#76b900]" /> : <X size={20} className="text-slate-300" />}<span className={`font-medium ${plan.features.themes ? 'text-slate-600' : 'text-slate-400'}`}>Premium Themes</span></div>
                    <div className="flex items-center gap-3">{plan.features.prioritySupport ? <Check size={20} className="text-[#76b900]" /> : <X size={20} className="text-slate-300" />}<span className={`font-medium ${plan.features.prioritySupport ? 'text-slate-600' : 'text-slate-400'}`}>Priority Support</span></div>
                  </div>

                  <button 
                    onClick={() => handleUpgrade(plan._id)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all ${isCurrentPlan ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#76b900] text-white hover:bg-[#659e00] shadow-lg shadow-green-100'}`}
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