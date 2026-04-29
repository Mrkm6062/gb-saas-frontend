import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Link as LinkIcon, Trash2 } from 'lucide-react';

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

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(currentStore.banner || '');
    setStatus('');
  }, [storeId, currentStore.storeName, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner]);

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
    switch(platform.toLowerCase()) {
      case 'facebook': return <Facebook size={20} className="text-blue-600" />;
      case 'instagram': return <Instagram size={20} className="text-pink-600" />;
      case 'twitter': return <Twitter size={20} className="text-sky-500" />;
      case 'linkedin': return <Linkedin size={20} className="text-blue-700" />;
      case 'youtube': return <Youtube size={20} className="text-red-600" />;
      default: return <LinkIcon size={20} className="text-slate-600" />;
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
    </AdminLayout>
  );
};

export default ManageStore;
