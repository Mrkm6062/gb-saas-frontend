import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const Mainpanel = ({ token, stores, setStores, onLogout }) => {
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState('Kirana Stores');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [status, setStatus] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/plans`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
          if (data.length > 0) setNewStorePlan(data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      }
    };
    fetchPlans();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStatus('Creating store...');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newStoreName,
          category: newStoreCategory,
          metaDescription: newStoreMeta,
          planId: newStorePlan
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('');
        setIsCreatingStore(false);
        setNewStoreName('');
        setNewStoreCategory('Kirana Stores');
        setNewStoreMeta('');
        setCurrentStep(1);
        // Add the new store to the local list
        setStores([...stores, data.store || { storeId: 'GBS-NEW', storeName: newStoreName, status: 'active', category: newStoreCategory }]);
      } else {
        setStatus(`Error: ${data.message || 'Failed to create store'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const closeForm = () => {
    setIsCreatingStore(false);
    setStatus('');
    setCurrentStep(1);
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Overview Dashboard">
        <main className="max-w-7xl mx-auto w-full px-6 py-10 text-left">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">My Stores</h2>
            <p className="text-slate-500 mt-1">Manage and monitor your digital storefronts</p>
          </div>
          <button onClick={() => setIsCreatingStore(true)} className="px-6 py-3 bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white font-bold rounded-xl hover:shadow-lg hover:opacity-90 transition transform hover:-translate-y-0.5 flex items-center gap-2">
            <span className="text-xl leading-none">+</span> Create New Store
          </button>
        </div>

        {status && (
           <div className={`mb-8 p-4 rounded-xl text-sm font-medium ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
             {status}
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Render Existing Stores */}
          {stores.map((store, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 p-6 flex flex-col group">
              <div className="flex justify-between items-start mb-5">
                {store.logo ? (
                  <img 
                    src={store.logo} 
                    alt={`${store.storeName} logo`} 
                    className="h-14 w-14 rounded-2xl object-contain bg-slate-50 border border-slate-100 shadow-sm p-1"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 text-[#ff8a00] flex items-center justify-center text-2xl font-bold shadow-inner">
                    {(store.storeName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${store.status === 'active' || !store.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {(store.status || 'active').charAt(0).toUpperCase() + (store.status || 'active').slice(1)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-[#76b900] transition-colors">{store.storeName}</h3>
              <div className="flex flex-col items-start gap-2 mb-6">
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{store.storeId || 'GBS-NEW'}</span>
                
                {(store.subdomain || store.storeSlug) && (
                  <a 
                    href={`http://${store.subdomain || store.storeSlug + '.galibrand.cloud'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1"
                  >
                    {store.subdomain || store.storeSlug + '.galibrand.cloud'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {store.planExpiryDate && (
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Plan Expires: <span className="font-semibold text-slate-700">{new Date(store.planExpiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-5 border-t border-slate-100 flex gap-2">
                <button onClick={() => navigate(`/store/${store.storeId}`)} className="flex-1 py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-[#76b900] hover:text-white transition-all duration-300">
                  Manage Store
                </button>
                <button onClick={() => navigate(`/store/${store.storeId}/plan`)} className="flex-1 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300">
                  Upgrade Plan
                </button>
              </div>
            </div>
          ))}

          {/* Empty State / Welcome Add Store Card */}
          {stores.length === 0 && !isCreatingStore && (
            <div 
              onClick={() => setIsCreatingStore(true)}
              className="col-span-full md:col-span-2 lg:col-span-1 min-h-[250px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-3xl hover:border-[#76b900] hover:bg-green-50/50 hover:text-[#76b900] transition-colors cursor-pointer cursor-pointer group"
            >
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#76b900] group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-700 group-hover:text-[#76b900] mb-1">Create Your First Store</h3>
              <p className="text-sm text-center px-4">Click here to launch your online ordering system.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Overlay for Store Creation */}
      {isCreatingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-extrabold text-slate-800">Launch New Store</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stepper Header */}
            <div className="px-8 pt-6">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
                <div className="absolute left-0 top-1/2 h-1 bg-[#76b900] -z-10 transform -translate-y-1/2 transition-all duration-500" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
                
                {[1, 2, 3].map(step => (
                  <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep >= step ? 'bg-[#76b900] border-[#76b900] text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                    {step}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">
                <span>Details</span>
                <span>Plan</span>
                <span>Payment</span>
              </div>
            </div>

            {/* Modal Body & Form */}
            <div className="p-8 overflow-y-auto flex-1">
              <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-6">
                
                {/* STEP 1: Store Details */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Store Name <span className="text-red-500">*</span></label>
                      <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. Fresh Veggies Mart" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900" required autoFocus />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Store Category <span className="text-red-500">*</span></label>
                      <select value={newStoreCategory} onChange={(e) => setNewStoreCategory(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 bg-white" required>
                        {["Vegetable Shop", "Bakery Shop", "Cafe Shop", "Kirana Stores", "Cake Shop", "Clothes Shop", "Multi-Ecommerce Shop", "Education Webapp", "Nasta Corner", "Appointment&Contact Webapp"].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Meta Description</label>
                      <textarea value={newStoreMeta} onChange={(e) => setNewStoreMeta(e.target.value)} placeholder="Brief description for SEO..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 resize-none h-24" />
                    </div>
                  </div>
                )}

                {/* STEP 2: Select Plan */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Select a Subscription Plan <span className="text-red-500">*</span></p>
                    {plans.length === 0 ? (
                      <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">No plans configured. Please contact support.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {plans.map(plan => (
                          <label key={plan._id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${newStorePlan === plan._id ? 'border-[#76b900] bg-green-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                            <div className="flex items-center gap-4">
                              <input type="radio" name="planSelection" value={plan._id} checked={newStorePlan === plan._id} onChange={() => setNewStorePlan(plan._id)} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900] cursor-pointer" />
                              <div>
                                <div className="font-bold text-slate-800 text-lg">{plan.name}</div>
                                <div className="text-sm text-slate-500">Up to {plan.features.maxProducts} products</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-xl text-slate-900">₹{plan.price}</div>
                              <div className="text-xs text-slate-500 font-medium">/month</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Payment Checkout Placeholder */}
                {currentStep === 3 && (
                  <div className="text-center py-6 animate-fadeIn">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CreditCard size={40} />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800 mb-2">Complete Payment</h4>
                    <p className="text-slate-500 mb-6">You have selected the <span className="font-bold text-slate-700">{plans.find(p => p._id === newStorePlan)?.name}</span> plan for <span className="font-bold text-slate-700">₹{plans.find(p => p._id === newStorePlan)?.price}/mo</span>.</p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mb-4">
                      * Payment gateway integration placeholder. Clicking "Confirm & Create" will activate your store immediately.
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
              {currentStep > 1 ? (
                <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  &larr; Back
                </button>
              ) : (
                <button type="button" onClick={closeForm} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  Cancel
                </button>
              )}
              
              {currentStep < 3 ? (
                <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} disabled={(currentStep === 1 && !newStoreName) || (currentStep === 2 && !newStorePlan)} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next Step &rarr;
                </button>
              ) : (
                <button type="submit" form="createStoreForm" className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100">
                  Confirm & Create
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Mainpanel;