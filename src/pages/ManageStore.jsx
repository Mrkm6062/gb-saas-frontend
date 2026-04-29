import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

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

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(currentStore.banner || '');
    setStatus('');
  }, [storeId, currentStore.storeName, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner]);

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
        </div>
      </div>

      {/* Store Settings Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-3xl">
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
    </div>
    </AdminLayout>
  );
};

export default ManageStore;
