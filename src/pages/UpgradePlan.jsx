import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Check } from 'lucide-react';

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
      ? Math.round(bill.price - (bill.price * bill.discountValue / 100))
      : bill.price;
      
    return {
      price: finalPrice,
      originalPrice: bill.price,
      discountEnabled: bill.discountEnabled,
      discount: bill.discountValue
    };
  };

  // Helper to get max discount percentage for a cycle duration to show next to toggle selector
  const getMaxDiscountForCycle = (duration) => {
    let maxDisc = 0;
    plans.forEach(p => {
      const bill = p.billing?.find(b => b.durationMonths === duration);
      if (bill && bill.discountEnabled && bill.discountValue > maxDisc) {
        maxDisc = bill.discountValue;
      }
    });
    return maxDisc;
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
        theme: { color: "#FB8C00" }
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

        {/* 1️⃣ Monthly Changing Header / Billing Toggle Switch */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex flex-wrap justify-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-full">
            <button 
              onClick={() => setBillingCycle(1)} 
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out cursor-pointer border-0 ${billingCycle === 1 ? 'bg-white text-[#7CB342] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              1 Month
            </button>
            <button 
              onClick={() => setBillingCycle(6)} 
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out cursor-pointer border-0 ${billingCycle === 6 ? 'bg-white text-[#7CB342] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              6 Months
              {getMaxDiscountForCycle(6) > 0 && (
                <span className="bg-[#FB8C00] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  -{getMaxDiscountForCycle(6)}%
                </span>
              )}
            </button>
            <button 
              onClick={() => setBillingCycle(12)} 
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out cursor-pointer border-0 ${billingCycle === 12 ? 'bg-white text-[#7CB342] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              12 Months
              {getMaxDiscountForCycle(12) > 0 && (
                <span className="bg-[#FB8C00] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  -{getMaxDiscountForCycle(12)}%
                </span>
              )}
            </button>
          </div>
        </div>

        {status && (
          <div className={`p-4 mb-8 rounded-xl font-medium text-sm border text-center ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 font-bold animate-pulse">Loading plans...</div>
        ) : (
          /* 2️⃣ Plan Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
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
                const isProPlan = plan.popular || plan.name === 'Pro';
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
                  <div 
                    key={plan._id} 
                    className={
                      isProPlan 
                        ? "relative bg-white p-7 rounded-xl shadow-lg border border-slate-200 border-t-[5px] border-t-[#FB8C00] flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-2xl md:scale-105 z-10 my-5 md:my-0"
                        : "relative bg-white p-7 rounded-xl shadow-md border border-slate-200 border-t-[5px] border-[#7CB342] flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1"
                    }
                  >
                    {isCurrentPlan && (
                      <span className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-[#7CB342] text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full shadow-md whitespace-nowrap z-20">
                        Current Plan
                      </span>
                    )}

                    {isProPlan && (
                      <span className="self-center inline-block bg-[#FB8C00] text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-3">
                        MOST POPULAR
                      </span>
                    )}

                    <div className="mb-2">
                      <h3 className={`text-xl font-bold mb-1 ${isProPlan ? 'text-slate-800' : 'text-[#7CB342]'}`}>
                        {plan.name}
                      </h3>
                      {plan.description && <p className="text-xs text-slate-400 italic mb-2">"{plan.description}"</p>}
                      
                      {/* Price Section */}
                      <div className="text-4xl font-bold text-slate-800 my-4">
                        {rate.discountEnabled && (
                          <span className="line-through text-slate-400 text-lg mr-2 font-normal">
                            ₹{rate.originalPrice}
                          </span>
                        )}
                        ₹{rate.price}
                        <span className="text-base font-normal text-slate-500">/month</span>
                      </div>

                      {rate.discountEnabled && (
                        <span className="self-center inline-block bg-green-50 text-green-800 border border-green-300 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2.5">
                          Save {rate.discount}%
                        </span>
                      )}

                      {billingCycle > 1 && (
                        <p className="text-xs text-slate-500 mb-5">
                          Billed ₹{rate.price * billingCycle} every {billingCycle} months
                        </p>
                      )}
                    </div>
                    
                    {/* Features checklist container */}
                    <ul className="text-left my-5 flex-grow space-y-2.5">
                      <li className="relative pl-6 text-sm text-slate-700">
                        <Check size={16} className="text-[#FB8C00] absolute left-0 top-0.5 shrink-0" />
                        Up to {plan.limits?.maxProducts || 0} Products
                      </li>
                      <li className="relative pl-6 text-sm text-slate-700">
                        <Check size={16} className="text-[#FB8C00] absolute left-0 top-0.5 shrink-0" />
                        {plan.limits?.storageLimit ? (plan.limits.storageLimit >= 1000 ? `${plan.limits.storageLimit / 1000}GB` : `${plan.limits.storageLimit}MB`) : '500MB'} Storage
                      </li>
                      {plan.features?.map((f, i) => (
                        <li key={i} className="relative pl-6 text-sm text-slate-700">
                          <Check size={16} className="text-[#FB8C00] absolute left-0 top-0.5 shrink-0" />
                          {f.name}
                        </li>
                      ))}
                    </ul>
  
                    {/* Brand Styled Actions button */}
                    <button 
                      onClick={() => handleUpgrade(plan)}
                      disabled={buttonDisabled}
                      className={
                        buttonDisabled
                          ? "w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed border border-slate-200"
                          : isProPlan
                            ? "w-full inline-block px-6 py-3 bg-[#FB8C00] text-white font-semibold rounded-lg text-center hover:bg-[#ef6c00] transition-all duration-200 cursor-pointer border-0 shadow-sm"
                            : "w-full inline-block px-6 py-3 border-2 border-[#7CB342] text-[#7CB342] font-semibold rounded-lg text-center hover:bg-[#7CB342] hover:text-white transition-all duration-200 cursor-pointer bg-transparent"
                      }
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