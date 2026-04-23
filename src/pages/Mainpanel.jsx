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
        // Add the new store to the local list
        setStores([...stores, data.store || { storeId: 'GBS-NEW', storeName: newStoreName, status: 'active', category: newStoreCategory }]);
      } else {
        setStatus(`Error: ${data.message || 'Failed to create store'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Overview Dashboard">
        <main className="max-w-7xl mx-auto w-full px-6 py-10 text-left">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">My Stores</h2>
            <p className="text-slate-500 mt-1">Manage and monitor your digital storefronts</p>
          </div>
          {!isCreatingStore && (
            <button onClick={() => setIsCreatingStore(true)} className="px-6 py-3 bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white font-bold rounded-xl hover:shadow-lg hover:opacity-90 transition transform hover:-translate-y-0.5 flex items-center gap-2">
              <span className="text-xl leading-none">+</span> Create New Store
            </button>
          )}
        </div>

        {status && (
           <div className={`mb-8 p-4 rounded-xl text-sm font-medium ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
             {status}
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Store Creation Inline Form */}
          {isCreatingStore && (
            <div className="bg-white rounded-2xl shadow-md border-2 border-[#76b900] p-6 flex flex-col transform scale-100 transition-all">
              <h3 className="text-lg font-bold text-slate-800 mb-4">New Store Details</h3>
              <form onSubmit={handleCreateStore} className="flex flex-col gap-3 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Store Name</label>
                  <input 
                    type="text" 
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g. Fresh Veggies Mart"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] focus:border-transparent outline-none transition text-slate-900"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Store Category</label>
                  <select 
                    value={newStoreCategory}
                    onChange={(e) => setNewStoreCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] focus:border-transparent outline-none transition text-slate-900 bg-white"
                    required
                  >
                    {["Vegetable Shop", "Bakery Shop", "Cafe Shop", "Kirana Stores", "Cake Shop", "Clothes Shop", "Multi-Ecommerce Shop", "Education Webapp", "Nasta Corner", "Appointment&Contact Webapp"].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Plan</label>
                  <select 
                    value={newStorePlan}
                    onChange={(e) => setNewStorePlan(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] focus:border-transparent outline-none transition text-slate-900 bg-white"
                    required
                  >
                    <option value="" disabled>Select a plan...</option>
                    {plans.map(plan => (
                      <option key={plan._id} value={plan._id}>{plan.name} - ₹{plan.price}/mo</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Description</label>
                  <textarea 
                    value={newStoreMeta}
                    onChange={(e) => setNewStoreMeta(e.target.value)}
                    placeholder="Brief description for SEO..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] focus:border-transparent outline-none transition text-slate-900 resize-none h-20"
                  />
                </div>
                <div className="mt-auto flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-[#76b900] text-white font-bold py-3 rounded-xl hover:bg-[#659e00] transition">
                    Save
                  </button>
                  <button type="button" onClick={() => {setIsCreatingStore(false); setStatus('');}} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

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
    </AdminLayout>
  );
};

export default Mainpanel;