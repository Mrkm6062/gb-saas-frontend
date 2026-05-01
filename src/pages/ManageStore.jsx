import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Link as LinkIcon, Trash2, Plus, CreditCard } from 'lucide-react';

const SocialIcon = ({ platform, size = 20, className }) => {
  const getPath = () => {
    switch(platform.toLowerCase()) {
      case 'facebook': return <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>;
      case 'instagram': return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></>;
      case 'twitter': return <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>;
      case 'linkedin': return <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></>;
      case 'youtube': return <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></>;
      default: return <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></>;
    }
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {getPath()}
    </svg>
  );
};

const ManageStore = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); // Gets the store ID from the URL
  const navigate = useNavigate();

  // Find the current store to initialize the form state
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  // Form states
  const [storeName, setStoreName] = useState(currentStore.storeName || '');
  const [websiteTitle, setWebsiteTitle] = useState(currentStore.websiteTitle || '');
  const [logo, setLogo] = useState(currentStore.logo || '');
  const [favicon, setFavicon] = useState(currentStore.favicon || '');
  const [banner, setBanner] = useState(currentStore.banner || '');
  const [status, setStatus] = useState('');
  const [uploadingField, setUploadingField] = useState(null); // 'logo' or 'favicon'
  
  // Social Media states
  const [socialLinks, setSocialLinks] = useState([]);
  const [newPlatform, setNewPlatform] = useState('Facebook');
  const [newUrl, setNewUrl] = useState('');
  const [socialStatus, setSocialStatus] = useState('');
  
  // Store Creation States
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState('Kirana Stores');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [createStatus, setCreateStatus] = useState('');
  const [toast, setToast] = useState(null);

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(currentStore.banner || '');
    setStatus('');
  }, [storeId, currentStore.storeName, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner]);

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

  const fetchSocialLinks = async () => {
    if (!currentStore._id) return;
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const res = await fetch(`${API_BASE_URL}/api/social-media?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSocialLinks(await res.json());
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchSocialLinks(); }, [currentStore._id]);

  const handleUpdateStore = async (e) => {
    e.preventDefault();
    setStatus('Updating...');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      
      const response = await fetch(`${API_BASE_URL}/api/store/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName,
          websiteTitle,
          logo,
          favicon,
          banner
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('Store updated successfully!');
        // Optional: Update your local App.jsx stores state here if passed down as a prop
      } else {
        setStatus(`Error: ${data.message || 'Failed to update store'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleImageUpload = async (e, field) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('images', files[0]); // Just one file for logo/favicon

    setUploadingField(field);
    setStatus(`Uploading ${field}...`);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      const data = await response.json();
      if (response.ok && data.urls && data.urls.length > 0) {
        if (field === 'logo') setLogo(data.urls[0]);
        if (field === 'favicon') setFavicon(data.urls[0]);
        if (field === 'banner') setBanner(data.urls[0]);
        setStatus(`${field.charAt(0).toUpperCase() + field.slice(1)} uploaded successfully!`);
      } else {
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
    } catch (err) {
      setStatus(`Upload Error: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddSocial = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    setSocialStatus('Adding...');
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const res = await fetch(`${API_BASE_URL}/api/social-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeId: currentStore._id, platform: newPlatform, url: newUrl })
      });
      if (res.ok) {
        setNewUrl('');
        setSocialStatus('');
        fetchSocialLinks();
      } else {
        setSocialStatus('Failed to add link');
      }
    } catch (err) {
      setSocialStatus('Error occurred');
    }
  };

  const handleDeleteSocial = async (id) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const res = await fetch(`${API_BASE_URL}/api/social-media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSocialLinks();
    } catch (err) {
      console.error(err);
    }
  };

  const renderSocialIcon = (platform) => {
    let colorClass = "text-slate-600";
    switch(platform.toLowerCase()) {
      case 'facebook': colorClass = "text-blue-600"; break;
      case 'instagram': colorClass = "text-pink-600"; break;
      case 'twitter': colorClass = "text-sky-500"; break;
      case 'linkedin': colorClass = "text-blue-700"; break;
      case 'youtube': colorClass = "text-red-600"; break;
    }
    return <SocialIcon platform={platform} size={20} className={colorClass} />;
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setCreateStatus('Creating store...');

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
        closeForm();
        window.location.reload(); // Refresh the app state to fetch and display the new store
      } else {
        setCreateStatus(`Error: ${data.message || 'Failed to create store'}`);
      }
    } catch (err) {
      setCreateStatus(`Error: ${err.message}`);
    }
  };

  const closeForm = () => {
    setIsCreatingStore(false);
    setCreateStatus('');
    setCurrentStep(1);
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateStore = () => {
    let maxStoresAllowed = 1;
    
    stores.forEach(s => {
      const plan = plans.find(p => p._id === s.planId);
      if (plan && plan.features?.storeLimit) {
        if (plan.features.storeLimit > maxStoresAllowed) {
          maxStoresAllowed = plan.features.storeLimit;
        }
      }
    });

    if (stores.length >= maxStoresAllowed) {
      showToast(`Store limit reached! Your current plans allow up to ${maxStoresAllowed} store(s). Please upgrade to create more.`, 'error');
      return;
    }
    setIsCreatingStore(true);
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Store">
    <div className="p-6 mx-auto mt-6">
      
      {/* Your Stores List */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Your Stores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stores.map((s) => (
            <div key={s._id} className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col transition-all ${s.storeId === storeId ? 'border-[#76b900] ring-4 ring-green-50' : 'border-slate-100 hover:border-slate-300'}`}>
              <div className="flex justify-between items-start mb-4">
                {s.logo ? (
                  <img src={s.logo} alt={s.storeName} className="h-12 w-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-[#ff8a00] flex items-center justify-center text-xl font-bold shadow-inner">
                    {(s.storeName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${s.status === 'active' || !s.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {(s.status || 'active').charAt(0).toUpperCase() + (s.status || 'active').slice(1)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 truncate" title={s.storeName}>{s.storeName}</h3>
              {s.subdomain && (
                <a href={`http://${s.subdomain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline mb-5 truncate">
                  {s.subdomain}
                </a>
              )}
              <button 
                onClick={() => navigate(`/store/${s.storeId}`)} 
                disabled={s.storeId === storeId}
                className={`mt-auto w-full py-2.5 font-bold rounded-xl transition-all ${s.storeId === storeId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700 hover:bg-[#76b900] hover:text-white'}`}
              >
                {s.storeId === storeId ? 'Currently Managing' : 'Manage Store'}
              </button>
            </div>
          ))}
          
          {/* Create New Store Card */}
          <div onClick={handleOpenCreateStore} className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-slate-500 hover:border-[#76b900] hover:bg-green-50/50 hover:text-[#76b900] transition-all cursor-pointer min-h-[200px] group">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:bg-[#76b900] group-hover:text-white transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-bold text-lg">Create New Store</span>
            <span className="text-xs mt-1 text-center">Launch another outlet</span>
          </div>
          
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Settings for {currentStore.storeName}</h2>
        
        {status && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {status}
          </div>
        )}

        <form onSubmit={handleUpdateStore} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Store Name</label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Website Title (SEO)</label>
            <input 
              type="text" 
              value={websiteTitle}
              onChange={(e) => setWebsiteTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Logo URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'logo' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'logo' ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} disabled={uploadingField !== null} />
              </label>
            </div>
            {logo && <img src={logo} alt="Logo Preview" className="mt-3 h-12 object-contain" />}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Favicon URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={favicon}
                onChange={(e) => setFavicon(e.target.value)}
                placeholder="https://example.com/favicon.ico"
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'favicon' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'favicon' ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'favicon')} disabled={uploadingField !== null} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Banner URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'banner' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'banner' ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} disabled={uploadingField !== null} />
              </label>
            </div>
            {banner && <img src={banner} alt="Banner Preview" className="mt-3 h-24 w-full object-cover rounded-lg border border-slate-200" />}
          </div>

          <button 
            type="submit" 
            className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition w-full mt-4 shadow-lg shadow-green-100"
          >
            Save Settings
          </button>
        </form>
      </div>

      {/* Social Media Links Manager */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Social Media Links</h2>
        <p className="text-sm text-slate-500 mb-6">Add your social media profiles. They will automatically appear in your storefront footer.</p>
        
        <form onSubmit={handleAddSocial} className="flex flex-col sm:flex-row gap-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <select 
            value={newPlatform} 
            onChange={(e) => setNewPlatform(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none bg-white font-medium text-slate-700"
          >
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Twitter">Twitter</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="Other">Other Link</option>
          </select>
          <input 
            type="url" 
            required
            placeholder="https://..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
          <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition whitespace-nowrap">
            + Add Link
          </button>
        </form>
        {socialStatus && <p className="text-sm text-red-500 mb-4 font-medium">{socialStatus}</p>}

        <div className="space-y-3">
          {socialLinks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-xl">No social links added yet</div>
          ) : socialLinks.map(link => (
            <div key={link._id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition bg-white group">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{renderSocialIcon(link.platform)}</div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 text-sm">{link.platform}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-[200px] sm:max-w-xs">{link.url}</a>
                </div>
              </div>
              <button onClick={() => handleDeleteSocial(link._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
    
    {/* Modal Overlay for Store Creation */}
    {isCreatingStore && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
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
            {createStatus && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${createStatus.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {createStatus}
              </div>
            )}
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
                              <div className="text-sm text-slate-500">Up to {plan.features?.maxProducts || 0} products</div>
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

    {/* Custom Toast Notification */}
    {toast && (
      <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#76b900] text-white'}`}>
        <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
        {toast.message}
      </div>
    )}
    </AdminLayout>
  );
};

export default ManageStore;
