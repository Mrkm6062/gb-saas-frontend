import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { CheckCircle, Lock, Eye, ExternalLink } from 'lucide-react';

const THEMES = [
  { id: 'default', name: 'Default Theme', description: 'The standard robust theme.', type: 'free', image: 'https://placehold.co/600x400/f8fafc/475569?text=Default+Theme' },
  { id: 'theme-free', name: 'Free Theme', description: 'A basic, clean storefront.', type: 'free', image: 'https://placehold.co/600x400/f8fafc/475569?text=Free+Theme' },
  { id: 'minimal', name: 'Minimal', description: 'A sleek, minimalist design focusing on products.', type: 'premium', image: 'https://placehold.co/600x400/f8fafc/475569?text=Minimal+Theme' },
  { id: 'modern', name: 'Modern', description: 'Bold and modern look for contemporary brands.', type: 'premium', image: 'https://placehold.co/600x400/f8fafc/475569?text=Modern+Theme' },
  { id: 'premium', name: 'Premium', description: 'A high-end, luxurious storefront experience.', type: 'premium', image: 'https://placehold.co/600x400/f8fafc/475569?text=Premium+Theme' }
];

const ManageTheme = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [activeTheme, setActiveTheme] = useState('default');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    if (currentStore.theme) {
      setActiveTheme(currentStore.theme);
    }
  }, [currentStore]);

  useEffect(() => {
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

  // Check if the current plan allows premium themes
  const activePlan = plans.find(p => p._id === currentStore.planId) || plans.find(p => p.price === 0) || {};
  const isPremiumAllowed = activePlan?.features?.themes || false;

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Themes">
      <div className="w-full px-6 py-10 mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Storefront Themes</h2>
          <p className="text-slate-500">Choose the perfect design for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
        </div>

        {status && (
          <div className={`p-4 mb-8 rounded-xl font-medium text-sm border ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {THEMES.map((theme) => {
            const isActive = activeTheme === theme.id;
            const isPremiumTheme = theme.type === 'premium';
            const isLocked = isPremiumTheme && !isPremiumAllowed;

            return (
              <div key={theme.id} className={`bg-white rounded-2xl overflow-hidden border-2 transition-all flex flex-col ${isActive ? 'border-[#76b900] shadow-md ring-4 ring-green-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                <div className="h-48 bg-slate-100 flex items-center justify-center border-b border-slate-100 relative">
                  <img src={theme.image} alt={`${theme.name} Preview`} className="w-full h-full object-cover" />
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
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-800">{theme.name}</h3>
                    {theme.type === 'premium' && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg uppercase tracking-wider">Premium</span>}
                  </div>
                  <p className="text-slate-500 text-sm mb-6 flex-1">{theme.description}</p>
                  <div className="mt-auto flex flex-col gap-2">
                    <a 
                      href={`http://${currentStore.subdomain}?preview_theme=${theme.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                    >
                      <Eye size={16} /> Live Preview <ExternalLink size={14} className="ml-1 opacity-50" />
                    </a>
                    <button 
                      onClick={() => isLocked ? navigate(`/store/${storeId}/plan`) : handleApplyTheme(theme.id)} 
                      disabled={isActive || (loading && !isLocked)} 
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isActive ? 'bg-green-50 text-[#76b900]' : isLocked ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {isActive ? <><CheckCircle size={18} /> Active Theme</> : isLocked ? 'Upgrade Plan to Apply' : 'Apply Theme'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};
export default ManageTheme;