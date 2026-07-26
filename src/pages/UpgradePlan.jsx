import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Check, X } from 'lucide-react';

// Helper to dynamically load razorpay
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ('Razorpay' in window) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = (err) => {
      console.error("Razorpay script failed to load. Check your internet connection or adblockers.", err);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const UpgradePlan = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const activeStores = stores.filter(s => !s.isDeleted);
  const currentStore = activeStores.find(s => s.storeId === storeId) || {};
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [billingCycle, setBillingCycle] = useState(1); // 1, 6, or 12 months

  // Helper to extract billing price info dynamically for selected duration
  const getPlanBilling = (plan, duration) => {
    if (!plan || !plan.billing || plan.billing.length === 0) {
      return { price: 0, originalPrice: 0, discountEnabled: false, discount: 0 };
    }
    const bill = plan.billing.find(b => b.durationMonths === duration);
    if (!bill) return { price: 0, originalPrice: 0, discountEnabled: false, discount: 0 };
    
    const finalPrice = bill.discountEnabled
      ? bill.price - (bill.price * bill.discountValue / 100)
      : bill.price;
      
    return {
      price: finalPrice,
      originalPrice: bill.price,
      discountEnabled: bill.discountEnabled,
      discount: bill.discountValue
    };
  };

  // Fetch available plans on component load
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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

  const handleUpgrade = async (plan) => {
    setStatus('Initializing payment...');
    
    const rate = getPlanBilling(plan, billingCycle);
    const totalAmount = rate.price * billingCycle;

    // If plan total is free, activate directly via backend assign endpoint
    if (totalAmount === 0) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/store/${currentStore._id}/plan`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ planId: plan._id, billingDuration: billingCycle })
        });

        if (response.ok) {
          setStatus('Plan changed successfully! Reloading...');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          const data = await response.json();
          setStatus(`Error: ${data.message}`);
        }
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
      return;
    }

    // Paid Plan - Initialize Razorpay Checkout
    try {
      const keyRes = await fetch(`${API_BASE_URL}/api/platform-payments/public-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const keyData = await keyRes.json();
      if (!keyData.razorpayEnabled) return setStatus('Error: Platform payments are currently disabled. Contact support.');

      const isLoaded = await loadRazorpay();
      if (!isLoaded) return setStatus('Error: Failed to load Razorpay SDK. Check your internet connection.');

      const orderRes = await fetch(`${API_BASE_URL}/api/platform-payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: totalAmount, storeId: currentStore._id })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

      const options = {
        key: keyData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Galibrand Cloud",
        description: `${plan.name} Plan (${billingCycle} Month(s))`,
        order_id: orderData.id,
        handler: async function (response) {
          setStatus('Verifying payment...');
          const verifyRes = await fetch(`${API_BASE_URL}/api/platform-payments/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
              ...response, 
              storeId: currentStore._id, 
              planId: plan._id, 
              billingDuration: billingCycle 
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setStatus('Payment successful! Plan upgraded. Reloading...');
            setTimeout(() => window.location.reload(), 2000);
          } else {
            setStatus('Payment verification failed. Please contact support.');
          }
        },
        prefill: { name: currentStore.storeName },
        theme: { color: "#76b900" }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      setStatus('');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Plan & Billing">
      <div className="p-6 mx-auto mt-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Choose the Right Plan for Your Store</h2>
          <p className="text-slate-500">Unlock more products, custom domains, and premium features.</p>
        </div>

        {/* Billing Period Selector */}
        <div className="flex justify-center items-center gap-2 mb-10 bg-slate-100 p-1.5 rounded-xl max-w-xs mx-auto border border-slate-200">
          <button 
            onClick={() => setBillingCycle(1)} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${billingCycle === 1 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle(6)} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${billingCycle === 6 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            6 Months
          </button>
          <button 
            onClick={() => setBillingCycle(12)} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${billingCycle === 12 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            12 Months
          </button>
        </div>

        {status && (
          <div className={`p-4 mb-8 rounded-xl font-medium text-sm border text-center ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 font-bold animate-pulse">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const currentPlanId = typeof currentStore.planId === 'object' && currentStore.planId !== null ? currentStore.planId._id : currentStore.planId;
              const currentPlanIdStr = currentPlanId ? String(currentPlanId) : null;
              
              const currentPlanObj = plans.find(p => String(p._id) === currentPlanIdStr) || plans.find(p => {
                const isFree = p.billing?.every(b => b.price === 0) || p.price === 0;
                return isFree;
              }) || { billing: [] };

              const currentRate = getPlanBilling(currentPlanObj, billingCycle);
              const currentPrice = currentRate.price;
              
              let daysLeft = null;
              let isExpired = false;
              let isExpiringSoon = false;

              if (currentStore.planExpiryDate) {
                const diff = new Date(currentStore.planExpiryDate) - new Date();
                daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                isExpired = daysLeft <= 0 || currentStore.subscriptionStatus === 'expired';
                isExpiringSoon = daysLeft > 0 && daysLeft <= 3;
              }
              
              const canRenew = isExpired || isExpiringSoon;
              const hasPurchasedBefore = currentStore.subscriptionStatus === 'active' || currentStore.subscriptionStatus === 'expired' || currentStore.isTrialActive === false;
              const isCurrentPlanPremium = currentPlanObj.name === 'Premium';

              return plans.map(plan => {
                const rate = getPlanBilling(plan, billingCycle);
                const planPrice = rate.price;
                const isCurrentPlan = currentPlanIdStr === String(plan._id) || (!currentPlanIdStr && planPrice === 0);
                const isProPlan = plan.name === 'Pro';
                const isDowngrade = !isCurrentPlan && planPrice < currentPrice;
                const isFreePlan = planPrice === 0;
                const preventDowngrade = isDowngrade && !canRenew;
                
                const buttonDisabled = (isCurrentPlan && (!canRenew || isFreePlan)) || preventDowngrade;
                
                let buttonText = 'Upgrade Plan';
                if (isCurrentPlan) {
                  buttonText = (canRenew && !isFreePlan) ? 'Renew Plan' : 'Current Plan';
                } else if (preventDowngrade) {
                  buttonText = 'Cannot Downgrade';
                } else if (isDowngrade && canRenew) {
                  buttonText = 'Downgrade Plan';
                }
                
                return (
                  <div key={plan._id} className={`relative rounded-2xl shadow-sm border-2 flex flex-col p-6 transition-all ${isCurrentPlan ? 'bg-white border-[#76b900] ring-4 ring-green-50' : (isProPlan && !isCurrentPlanPremium) ? 'bg-gradient-to-br from-blue-50 to-white border-blue-500 ring-4 ring-blue-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#76b900] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap z-10">
                        Current Plan
                      </div>
                    )}
                    {isProPlan && !isCurrentPlan && !isCurrentPlanPremium && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <span className="absolute w-full h-full rounded-full bg-blue-400 animate-ping opacity-75"></span>
                        <div className="relative bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                          Recommended
                        </div>
                      </div>
                    )}
                    <div className="mb-5">
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                      {plan.description && <p className="text-xs text-slate-400 italic mb-2">"{plan.description}"</p>}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-slate-900">₹{rate.price}</span>
                        <span className="text-slate-500 text-sm font-medium">/month</span>
                      </div>
                      {rate.discountEnabled && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="line-through text-slate-400 text-xs">₹{rate.originalPrice}</span>
                          <span className="text-green-600 text-xs font-extrabold bg-green-50 px-2 py-0.5 rounded-full">
                            Save {rate.discount}%
                          </span>
                        </div>
                      )}
                      {billingCycle > 1 && (
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">
                          Billed ₹{rate.price * billingCycle} every {billingCycle} months
                        </p>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3 mb-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Check size={18} className="text-[#76b900] shrink-0" />
                        <span className="text-slate-600 font-medium">Up to {plan.limits?.maxProducts || 0} Products</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={18} className="text-[#76b900] shrink-0" />
                        <span className="text-slate-600 font-medium">
                          {plan.limits?.storageLimit ? (plan.limits.storageLimit >= 1000 ? `${plan.limits.storageLimit / 1000}GB` : `${plan.limits.storageLimit}MB`) : '500MB'} Storage
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={18} className="text-[#76b900] shrink-0" />
                        <span className="text-slate-600 font-medium">Up to {plan.limits?.storeLimit || 1} Store(s)</span>
                      </div>

                      {/* Display Features List */}
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included Features</h4>
                        <div className="space-y-2">
                          {plan.features?.map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Check size={18} className="text-[#76b900] shrink-0" />
                              <span className="text-slate-600 font-medium">{f.name}</span>
                            </div>
                          ))}
                          {(!plan.features || plan.features.length === 0) && (
                            <div className="text-slate-400 text-xs italic">No special features bundled.</div>
                          )}
                        </div>
                      </div>
                    </div>
  
                    <button 
                      onClick={() => handleUpgrade(plan)}
                      disabled={buttonDisabled}
                      className={`w-full py-3.5 rounded-xl font-bold transition-all ${buttonDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (isProPlan && !isCurrentPlanPremium) ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-[#76b900] text-white hover:bg-[#659e00] shadow-lg shadow-green-100'}`}
                    >
                      {buttonText}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UpgradePlan;