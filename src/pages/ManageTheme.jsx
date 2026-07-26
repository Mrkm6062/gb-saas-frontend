import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { CheckCircle, Lock, Eye, ExternalLink, CreditCard, X } from 'lucide-react';

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
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const ManageTheme = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};
  const [activeTheme, setActiveTheme] = useState('default');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [themes, setThemes] = useState([]);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [selectedThemeDetails, setSelectedThemeDetails] = useState(null);

  
  const [purchaseModal, setPurchaseModal] = useState({ isOpen: false, theme: null });

  useEffect(() => {
    if (currentStore.theme) {
      setActiveTheme(currentStore.theme);
    }
  }, [currentStore]);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/themes`);
        if (response.ok) {
          setThemes(await response.json());
        }
      } catch (err) {
        console.error('Failed to fetch themes:', err);
      }
    };
    fetchThemes();

    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans`);
        if (response.ok) {
          setPlans(await response.json());
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      }
    };
    fetchPlans();
  }, [API_BASE_URL]);

  const handleApplyTheme = async (themeId) => {
    setLoading(true);
    setStatus('Applying theme...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/store/${currentStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: themeId })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ Theme applied successfully! Your storefront has been updated.');
        setActiveTheme(themeId);
        currentStore.theme = themeId; // Optimistic local update
      } else {
        setStatus(`❌ Error: ${data.message || 'Failed to update theme'}`);
      }
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (themeToBuy) => {
    setLoading(true);
    setStatus('Initializing payment...');
    setPurchaseModal({ isOpen: false, theme: null }); // Close modal

    try {
        const keyRes = await fetch(`${API_BASE_URL}/api/theme-payments/public-key`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const keyData = await keyRes.json();
        if (!keyData.razorpayEnabled) {
            setStatus('❌ Platform payments are currently disabled. Contact support.');
            setLoading(false);
            return;
        }

        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
            setStatus('❌ Failed to load Razorpay SDK. Check your internet connection or adblocker.');
            setLoading(false);
            return;
        }

        const orderRes = await fetch(`${API_BASE_URL}/api/theme-payments/create-theme-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ themeId: themeToBuy._id, storeId: currentStore._id })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create payment order');

        const options = {
            key: keyData.razorpayKeyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Galibrand Cloud - Theme Purchase",
            description: `Purchase of "${themeToBuy.name}" Theme`,
            order_id: orderData.id,
            handler: async function (response) {
                setStatus('Verifying payment...');
                const verifyRes = await fetch(`${API_BASE_URL}/api/theme-payments/verify-theme-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ ...response, storeId: currentStore._id, themeId: themeToBuy._id })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    setStatus('✅ Payment successful! Theme purchased and applied.');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setStatus('❌ Payment verification failed. If money was deducted, please contact support.');
                }
            },
            prefill: { name: currentStore.storeName },
            theme: { color: "#76b900" }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        setStatus('');
    } catch (err) {
        setStatus(`❌ Error: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // Check if the current plan allows premium themes
  const activePlan = plans.find(p => p._id === currentStore.planId) || plans.find(p => p.price === 0) || {};
  const isPremiumAllowed = activePlan?.features?.themes || false;

  const filteredThemes = showAllThemes
    ? themes
    : themes.filter(theme => 
        !theme.category || 
        theme.category.length === 0 || 
        theme.category.includes('general') || 
        theme.category.includes(currentStore.storeType)
      );

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Themes">
      <div className="w-full px-6 py-10 mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Storefront Themes</h2>
            <p className="text-slate-500">Choose the perfect design for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
          </div>
          <button 
            onClick={() => setShowAllThemes(prev => !prev)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition text-sm shadow-sm"
          >
            {showAllThemes ? 'Show Recommended Themes' : 'Show All Themes'}
          </button>
        </div>

        {status && (
          <div className={`p-4 mb-8 rounded-xl font-medium text-sm border ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-10 text-center text-slate-500 font-medium">No themes available.</div>
          ) : filteredThemes.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500 font-medium">No specific themes found for your store type. Try showing all themes.</div>
          ) : filteredThemes.map((theme) => {
            const isActive = activeTheme === theme.themeId;
            const isPremiumTheme = theme.type === 'premium';
            const isPaidTheme = theme.type === 'paid';
            const isPurchased = currentStore.paidThemes?.some(pt => pt.themeId === theme.themeId);
            const isLocked = isPremiumTheme && !isPremiumAllowed;

            return (
              <div 
                key={theme._id} 
                onClick={() => setSelectedThemeDetails(theme)}
                className={`bg-white rounded-2xl overflow-hidden border-2 transition-all flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] ${isActive ? 'border-[#76b900] shadow-md ring-4 ring-green-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
              >
                <div className="h-60 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  <img src={theme.previewImage || 'https://placehold.co/600x400/f8fafc/475569?text=No+Preview'} alt={`${theme.name} Preview`} className="w-full h-full object-cover" />
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-[#76b900] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md z-10">
                      <CheckCircle size={14} /> Active
                    </div>
                  )}
                  {isLocked && (
                     <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                       <span className="bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
                         <Lock size={16} /> Upgrade to unlock
                       </span>
                     </div>
                  )}
                </div>
                <div className="p-4 bg-white border-t border-slate-50 flex justify-between items-center">
                  <h3 className="text-base font-extrabold text-slate-800">{theme.name}</h3>
                  <div className="flex gap-2">
                    {isPurchased ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">Purchased</span>
                    ) : (
                      theme.type === 'premium' ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">Premium</span>
                      : isPaidTheme ? <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-lg">₹{theme.price}</span> : null
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {purchaseModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-fadeIn">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Purchase Theme</h3>
                <p className="text-slate-500 mb-4">You are about to purchase the "<strong>{purchaseModal.theme.name}</strong>" theme.</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <p className="text-sm text-slate-600">Amount to Pay</p>
                    <p className="text-4xl font-extrabold text-slate-900">₹{purchaseModal.theme.price}</p>
                    <p className="text-xs text-slate-400 mt-1">This is a one-time payment.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setPurchaseModal({ isOpen: false, theme: null })} className="flex-1 px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => handlePurchase(purchaseModal.theme)} className="flex-1 px-6 py-3 font-bold text-white bg-[#76b900] hover:bg-[#659e00] rounded-xl transition-colors shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Pay Now
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Dynamic Theme Details Popup Modal */}
      {selectedThemeDetails && (() => {
        const isLocked = selectedThemeDetails.type === 'premium' && !isPremiumAllowed;
        const isPaidTheme = selectedThemeDetails.type === 'paid';
        const isPurchased = currentStore.paidThemes?.some(pt => pt.themeId === selectedThemeDetails.themeId);
        const isActive = activeTheme === selectedThemeDetails.themeId;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative animate-slideIn max-h-[90vh]">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedThemeDetails(null)} 
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-red-500 flex items-center justify-center transition shadow"
              >
                <X size={18} />
              </button>

              {/* Left Side: Theme Image */}
              <div className="md:w-1/2 bg-slate-50 border-r border-slate-100 flex items-center justify-center max-h-[300px] md:max-h-none md:h-auto overflow-hidden">
                <img 
                  src={selectedThemeDetails.previewImage || 'https://placehold.co/600x400/f8fafc/475569?text=No+Preview'} 
                  alt={`${selectedThemeDetails.name} Preview`} 
                  className="w-full h-full object-contain p-4 bg-slate-50" 
                />
              </div>

              {/* Right Side: Theme Details */}
              <div className="md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-3xl font-black text-slate-800">{selectedThemeDetails.name}</h3>
                    <div className="flex gap-2">
                      {isPurchased ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg uppercase tracking-wider">Purchased</span>
                      ) : (
                        selectedThemeDetails.type === 'premium' ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg uppercase tracking-wider">Premium</span>
                        : isPaidTheme ? <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">₹{selectedThemeDetails.price}</span> : null
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-[#76b900] text-xs font-bold rounded-lg border border-green-200">
                      <CheckCircle size={14} /> Currently Active Theme
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme Description</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {selectedThemeDetails.description || "No description provided for this theme."}
                    </p>
                  </div>

                  {isPaidTheme && !isPurchased && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                      💡 This is a paid theme. Once purchased, you can apply it to your store permanently with free lifetime updates.
                    </div>
                  )}
                  {isLocked && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
                      ⚠️ This premium theme is locked under your current store plan. Please upgrade your plan subscription to activate this theme.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-6 mt-8 border-t border-slate-100">
                  <a 
                    href={`//${currentStore.customDomain || currentStore.subdomain}?preview_theme=${selectedThemeDetails.themeFolder || selectedThemeDetails.themeId}&preview_id=${selectedThemeDetails.themeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                  >
                    <Eye size={16} /> Live Preview <ExternalLink size={14} className="ml-1 opacity-50" />
                  </a>

                  <button 
                    onClick={() => {
                      setSelectedThemeDetails(null);
                      if (isLocked) navigate(`/store/${storeId}/plan`);
                      else if (isPaidTheme && !isPurchased) setPurchaseModal({ isOpen: true, theme: selectedThemeDetails });
                      else handleApplyTheme(selectedThemeDetails.themeId);
                    }} 
                    disabled={isActive || (loading && !isLocked)} 
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm ${isActive ? 'bg-green-50 text-[#76b900]' : isLocked ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : (isPaidTheme && !isPurchased) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {isActive ? <><CheckCircle size={18} /> Active Theme</> 
                      : isLocked ? 'Upgrade Plan to Apply' 
                      : (isPaidTheme && !isPurchased) ? `Purchase Theme`
                      : 'Apply Theme'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
};
export default ManageTheme;