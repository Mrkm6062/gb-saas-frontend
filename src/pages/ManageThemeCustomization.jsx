import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Palette, Save } from 'lucide-react';

const AVAILABLE_FONTS = [
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Nunito', value: 'Nunito, sans-serif' },
  { name: 'Outfit', value: 'Outfit, sans-serif' },
  { name: 'Raleway', value: 'Raleway, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'System Sans', value: 'system-ui, sans-serif' }
];


const initialForm = {
  global: { primaryColor: '#22c55e', secondaryColor: '#f97316', fontFamily: 'Poppins', borderRadius: '12px', officialfaviconimage: '', metaTitle: '', metaDescription: '' },
  header: { bgColor: '#ffffff', textColor: '#000000', officialdesktopLogo: '', officialmobileLogo: '', offerBanner: { Enabled: true, text: 'Free delivery on orders above ₹500!', bgColor: '#22c55e', textColor: '#ffffff' } },
  banner: { bgColor: '#f5f5f5', textColor: '#111111', limit: 5 },
  category: { bgColor: '#ffffff' },
  productCard: { bgColor: '#ffffff', borderColor: '#e5e7eb' },
  footer: { bgColor: '#111827', textColor: '#ffffff', officialdesktopLogo: '', officialmobileLogo: '', description: '© 2024 Your Store. All rights reserved.', newsletter: { enabled: false, placeholder: 'Enter your email', buttonText: 'Subscribe' } },
  whyChooseUs: { enabled: true, title: 'Why Choose Us', subtitle: '', items: [] }
};

const ManageThemeCustomization = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find((s) => s.storeId === storeId) || {};
  const activeTheme = currentStore.theme || 'default';

  const [formData, setFormData] = useState(initialForm);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadingField, setUploadingField] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [activeMediaTarget, setActiveMediaTarget] = useState(null); // { type: 'nested', section, field } or { type: 'whyChooseUs', index }

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchCustomization = async () => {
      if (!currentStore._id) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/theme-customization?storeId=${currentStore._id}&themeId=${activeTheme}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.global) {
            setFormData((prev) => ({
              global: { ...prev.global, ...data.global },
              header: { ...prev.header, ...data.header },
              banner: { ...prev.banner, ...data.banner },
              category: { ...prev.category, ...data.category },
              productCard: { ...prev.productCard, ...data.productCard },
              footer: { 
                ...prev.footer, 
                ...data.footer,
                newsletter: {
                  ...prev.footer.newsletter,
                  ...(data.footer?.newsletter || {})
                }
              },
              whyChooseUs: { ...prev.whyChooseUs, ...data.whyChooseUs }
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch customizations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomization();
  }, [currentStore._id, activeTheme, token, API_BASE_URL]);

  useEffect(() => {
    // Load Google Fonts preview styles in dropdown
    const linkId = 'google-fonts-preview-styles';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;700&family=Outfit:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Roboto:wght@400;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);


  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleOfferBannerChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        offerBanner: {
          ...prev.header.offerBanner,
          [field]: value,
        },
      },
    }));
  };

  const handleAddWhyChooseItem = () => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        items: [
          ...prev.whyChooseUs.items,
          { title: '', description: '', icon: '', image: '', isActive: true, sortOrder: 0 }
        ]
      }
    }));
  };

  const handleWhyChooseItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.whyChooseUs.items];
      newItems[index][field] = value;
      return {
        ...prev,
        whyChooseUs: {
          ...prev.whyChooseUs,
          items: newItems
        }
      };
    });
  };

  const handleRemoveWhyChooseItem = (index) => {
    setFormData((prev) => {
      const newItems = prev.whyChooseUs.items.filter((_, i) => i !== index);
      return {
        ...prev,
        whyChooseUs: {
          ...prev.whyChooseUs,
          items: newItems
        }
      };
    });
  };

  const handleWhyChooseItemImageUpload = async (e, index) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('images', files[0]);

    setUploadingField(`whyChooseUs-item-${index}`);
    setUploadProgress(0);
    setUploadSpeed('Calculating...');

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const xhr = new XMLHttpRequest();
    setActiveXhr(xhr);
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000;
        if (timeDiff > 0.5) {
          const bytesDiff = event.loaded - lastLoaded;
          const speedBps = bytesDiff / timeDiff;
          let speedText = '';
          if (speedBps > 1024 * 1024) speedText = (speedBps / (1024 * 1024)).toFixed(2) + ' MB/s';
          else if (speedBps > 1024) speedText = (speedBps / 1024).toFixed(2) + ' KB/s';
          else speedText = Math.round(speedBps) + ' B/s';
          setUploadSpeed(speedText);
          lastLoaded = event.loaded;
          lastTime = currentTime;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        if (data.urls && data.urls.length > 0) handleWhyChooseItemChange(index, 'icon', data.urls[0]);
        else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: 'Upload Failed' }; }
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
      setUploadingField(null);
      setActiveXhr(null);
    };
    xhr.onerror = () => { setStatus('Upload Error: Network failure'); setUploadingField(null); setActiveXhr(null); };
    xhr.onabort = () => { setStatus('Upload canceled.'); setUploadingField(null); setActiveXhr(null); };
    xhr.send(uploadData);
  };

  const handleImageUpload = async (e, section, field) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('images', files[0]);

    setUploadingField(`${section}-${field}`);
    setUploadProgress(0);
    setUploadSpeed('Calculating...');

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const xhr = new XMLHttpRequest();
    setActiveXhr(xhr);
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000;
        if (timeDiff > 0.5) {
          const bytesDiff = event.loaded - lastLoaded;
          const speedBps = bytesDiff / timeDiff;
          let speedText = '';
          if (speedBps > 1024 * 1024) speedText = (speedBps / (1024 * 1024)).toFixed(2) + ' MB/s';
          else if (speedBps > 1024) speedText = (speedBps / 1024).toFixed(2) + ' KB/s';
          else speedText = Math.round(speedBps) + ' B/s';
          setUploadSpeed(speedText);
          lastLoaded = event.loaded;
          lastTime = currentTime;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        if (data.urls && data.urls.length > 0) handleNestedChange(section, field, data.urls[0]);
        else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: 'Upload Failed' }; }
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
      setUploadingField(null);
      setActiveXhr(null);
    };
    xhr.onerror = () => { setStatus('Upload Error: Network failure'); setUploadingField(null); setActiveXhr(null); };
    xhr.onabort = () => { setStatus('Upload canceled.'); setUploadingField(null); setActiveXhr(null); };
    xhr.send(uploadData);
  };

  const cancelUpload = () => {
    if (activeXhr) activeXhr.abort();
  };

  const fetchMedia = async () => {
    setLoadingMedia(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setMediaImages(data.images || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleDeleteMedia = async (filename) => {
    if (!window.confirm("Delete this image permanently from cloud storage?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (response.ok) fetchMedia();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus('Saving...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/theme-customization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          themeId: activeTheme,
          ...formData,
        }),
      });
      if (response.ok) {
        setStatus('✅ Theme settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const data = await response.json();
        setStatus(`❌ Error: ${data.message || 'Failed to save'}`);
      }
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderColorInput = (section, field, label) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={formData[section][field]}
          onChange={(e) => handleNestedChange(section, field, e.target.value)}
          className="w-12 h-10 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={formData[section][field]}
          onChange={(e) => handleNestedChange(section, field, e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none font-mono text-sm"
        />
      </div>
    </div>
  );

  const renderImageUpload = (section, field, label) => {
    const isUploading = uploadingField === `${section}-${field}`;
    const currentValue = formData[section][field];
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-semibold text-slate-700">{label}</label>
          <button type="button" onClick={() => { setIsMediaLibraryOpen(true); setActiveMediaTarget({ type: 'nested', section, field }); fetchMedia(); }} className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-2 py-0.5 rounded transition-colors">View Media Library</button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleNestedChange(section, field, e.target.value)}
            placeholder="https://..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none text-sm"
          />
          <label
            className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold text-sm rounded-lg hover:bg-blue-100 transition whitespace-nowrap ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, section, field)} />
          </label>
        </div>
        {isUploading && (
          <div className="mt-3 bg-blue-50 p-3 rounded-xl border border-blue-100 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-bold text-blue-800 mb-2">
              <span>Uploading... {uploadProgress}%</span>
              <div className="flex items-center gap-2">
                <span>{uploadSpeed}</span>
                <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-[10px] font-bold transition-colors">Cancel</button>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden"><div className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
          </div>
        )}
        {currentValue && (
          <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg inline-block">
            <img src={currentValue} alt="Preview" className="h-10 object-contain" />
          </div>
        )}
      </div>
    );
  };

  if (loading) return <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Customize Theme"><div className="p-10 text-center font-bold text-slate-400">Loading Configuration...</div></AdminLayout>;

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Customize Theme">
      <div className="w-full px-6 py-10 mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3">
              <Palette className="text-[#76b900]" /> Design Settings
            </h2>
            <p className="text-slate-500">Customize the visual identity of <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
            <p className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block mt-2">Active Theme: {activeTheme}</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition flex items-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50 whitespace-nowrap">
            <Save size={20} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {['global', 'header', 'banner', 'category', 'productCard', 'footer', 'whyChooseUs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap text-left ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                {tab === 'whyChooseUs' ? 'Why Choose Us' : tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')} Settings
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            
            {activeTab === 'global' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Global Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('global', 'primaryColor', 'Primary Brand Color')}
                  {renderColorInput('global', 'secondaryColor', 'Secondary Accent Color')}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Font Family</label>
                    <select
                      value={formData.global.fontFamily}
                      onChange={(e) => handleNestedChange('global', 'fontFamily', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none bg-white font-medium"
                    >
                      {AVAILABLE_FONTS.map(font => (
                        <option 
                          key={font.name} 
                          value={font.value} 
                          style={{ fontFamily: font.value }}
                        >
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Border Radius</label>
                    <input type="text" value={formData.global.borderRadius} onChange={(e) => handleNestedChange('global', 'borderRadius', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. 12px or 0.5rem" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4">SEO & Metadata</h4>
                  {renderImageUpload('global', 'officialfaviconimage', 'Favicon (Browser Tab Icon)')}
                  <div className="space-y-4">
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Meta Title</label><input type="text" value={formData.global.metaTitle} onChange={(e) => handleNestedChange('global', 'metaTitle', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Meta Description</label><textarea rows="3" value={formData.global.metaDescription} onChange={(e) => handleNestedChange('global', 'metaDescription', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none resize-none" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'header' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Navigation Header</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('header', 'bgColor', 'Header Background Color')}
                  {renderColorInput('header', 'textColor', 'Header Text Color')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {renderImageUpload('header', 'officialdesktopLogo', 'Desktop Logo')}
                  {renderImageUpload('header', 'officialmobileLogo', 'Mobile Logo')}
                </div>
                
                <div className="pt-4 border-t border-slate-100 bg-slate-50 p-5 rounded-xl border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800">Top Announcement Banner</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={formData.header.offerBanner.Enabled} onChange={(e) => handleOfferBannerChange('Enabled', e.target.checked)} />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#76b900]"></div>
                    </label>
                  </div>
                  <div className={`space-y-4 transition-opacity ${!formData.header.offerBanner.Enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Announcement Text</label><input type="text" value={formData.header.offerBanner.text} onChange={(e) => handleOfferBannerChange('text', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" /></div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Banner Background</label>
                        <div className="flex gap-2"><input type="color" value={formData.header.offerBanner.bgColor} onChange={(e) => handleOfferBannerChange('bgColor', e.target.value)} className="w-12 h-10 p-0.5 border border-slate-300 rounded-lg cursor-pointer" /><input type="text" value={formData.header.offerBanner.bgColor} onChange={(e) => handleOfferBannerChange('bgColor', e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none font-mono text-sm" /></div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Banner Text Color</label>
                        <div className="flex gap-2"><input type="color" value={formData.header.offerBanner.textColor} onChange={(e) => handleOfferBannerChange('textColor', e.target.value)} className="w-12 h-10 p-0.5 border border-slate-300 rounded-lg cursor-pointer" /><input type="text" value={formData.header.offerBanner.textColor} onChange={(e) => handleOfferBannerChange('textColor', e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none font-mono text-sm" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'banner' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Hero / Carousel Banner</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('banner', 'bgColor', 'Carousel Background Color')}
                  {renderColorInput('banner', 'textColor', 'Carousel Text Color')}
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Slide Limit</label><input type="number" min="1" value={formData.banner.limit} onChange={(e) => handleNestedChange('banner', 'limit', parseInt(e.target.value) || 1)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" /></div>
                </div>
              </div>
            )}

            {activeTab === 'category' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Category Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('category', 'bgColor', 'Category Bar / Bubble Background Color')}
                </div>
              </div>
            )}

            {activeTab === 'productCard' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Product Card Display</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('productCard', 'bgColor', 'Card Background Color')}
                  {renderColorInput('productCard', 'borderColor', 'Card Border Color')}
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold border-b border-slate-100 pb-3">Footer Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderColorInput('footer', 'bgColor', 'Footer Background Color')}
                  {renderColorInput('footer', 'textColor', 'Footer Text Color')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {renderImageUpload('footer', 'officialdesktopLogo', 'Desktop Logo')}
                  {renderImageUpload('footer', 'officialmobileLogo', 'Mobile Logo')}
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Footer Description / Copyright Text</label>
                  <textarea 
                    rows="3" 
                    value={formData.footer.description || ''} 
                    onChange={(e) => handleNestedChange('footer', 'description', e.target.value)} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none resize-none text-sm"
                    placeholder="e.g. © 2024 Your Store. All rights reserved."
                  />
                </div>
                <div className="pt-4 border-t border-slate-100 bg-slate-50 p-5 rounded-xl border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800 text-sm">Newsletter Subscription Form</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={formData.footer.newsletter?.enabled || false} 
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              newsletter: {
                                ...(prev.footer.newsletter || {}),
                                enabled: e.target.checked
                              }
                            }
                          }));
                        }} 
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#76b900] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#76b900]"></div>
                    </label>
                  </div>
                  <div className={`space-y-4 transition-opacity ${!formData.footer.newsletter?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Input Placeholder</label>
                        <input 
                          type="text" 
                          value={formData.footer.newsletter?.placeholder || ''} 
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              footer: {
                                ...prev.footer,
                                newsletter: {
                                  ...(prev.footer.newsletter || {}),
                                  placeholder: e.target.value
                                }
                              }
                            }));
                          }} 
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900] text-sm" 
                          placeholder="e.g. Enter your email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Button Text</label>
                        <input 
                          type="text" 
                          value={formData.footer.newsletter?.buttonText || ''} 
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              footer: {
                                ...prev.footer,
                                newsletter: {
                                  ...(prev.footer.newsletter || {}),
                                  buttonText: e.target.value
                                }
                              }
                            }));
                          }} 
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900] text-sm" 
                          placeholder="e.g. Subscribe"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'whyChooseUs' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xl font-bold text-slate-800">Why Choose Us Section</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.whyChooseUs.enabled} 
                      onChange={(e) => handleNestedChange('whyChooseUs', 'enabled', e.target.checked)} 
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#76b900]"></div>
                  </label>
                </div>

                <div className={`space-y-6 transition-opacity ${!formData.whyChooseUs.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Section Title</label>
                      <input 
                        type="text" 
                        value={formData.whyChooseUs.title} 
                        onChange={(e) => handleNestedChange('whyChooseUs', 'title', e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900]" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Section Subtitle</label>
                      <input 
                        type="text" 
                        value={formData.whyChooseUs.subtitle} 
                        onChange={(e) => handleNestedChange('whyChooseUs', 'subtitle', e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900]" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800">Feature Items</h4>
                      <button 
                        type="button" 
                        onClick={handleAddWhyChooseItem}
                        className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition text-sm"
                      >
                        + Add Feature
                      </button>
                    </div>

                    <div className="space-y-4">
                      {formData.whyChooseUs.items.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveWhyChooseItem(idx)} 
                            className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold text-xl leading-none"
                          >
                            &times;
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Feature Title <span className="text-red-500">*</span></label>
                              <input type="text" value={item.title} onChange={e => handleWhyChooseItemChange(idx, 'title', e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900] text-sm" placeholder="e.g. Free Delivery" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-700">Icon URL (or image)</label>
                                <button type="button" onClick={() => { setIsMediaLibraryOpen(true); setActiveMediaTarget({ type: 'whyChooseUs', index: idx }); fetchMedia(); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded transition-colors">Media Library</button>
                              </div>
                              <div className="flex gap-2">
                                <input type="text" value={item.icon} onChange={e => handleWhyChooseItemChange(idx, 'icon', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900] text-sm" placeholder="https://..." />
                                <label className={`cursor-pointer px-3 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap text-sm ${uploadingField === `whyChooseUs-item-${idx}` ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  {uploadingField === `whyChooseUs-item-${idx}` ? '...' : 'Upload'}
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleWhyChooseItemImageUpload(e, idx)} disabled={uploadingField !== null} />
                                </label>
                              </div>
                              {uploadingField === `whyChooseUs-item-${idx}` && (
                                <div className="mt-2 bg-blue-50 p-3 rounded-xl border border-blue-100 animate-fadeIn">
                                  <div className="flex justify-between items-center text-xs font-bold text-blue-800 mb-2">
                                    <span>Uploading... {uploadProgress}%</span>
                                    <div className="flex items-center gap-2">
                                      <span>{uploadSpeed}</span>
                                      <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-[10px] font-bold transition-colors">Cancel</button>
                                    </div>
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden"><div className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
                                </div>
                              )}
                              {item.icon && (
                                <div className="mt-2"><img src={item.icon} alt="Icon Preview" className="h-8 object-contain" /></div>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                              <textarea rows="2" value={item.description} onChange={e => handleWhyChooseItemChange(idx, 'description', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900] text-sm resize-none" placeholder="Provide details about this feature..." />
                            </div>
                          </div>
                        </div>
                      ))}
                      {formData.whyChooseUs.items.length === 0 && (
                         <p className="text-sm text-slate-500 italic text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">No feature items added. Click "+ Add Feature" to begin.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    {/* Media Library Modal */}
    {isMediaLibraryOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800">Store Media Library</h3>
            <button onClick={() => setIsMediaLibraryOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>
          <div className="p-8 overflow-y-auto flex-1">
            {loadingMedia ? (
              <div className="flex justify-center py-10"><span className="text-slate-500 font-medium">Loading media...</span></div>
            ) : mediaImages.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium">No media found. Upload images to populate.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {mediaImages.map((img) => (
                  <div key={img.name} className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-sm hover:shadow-md transition-shadow">
                    <img src={img.url} alt="media" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button onClick={() => {
                        if (activeMediaTarget.type === 'nested') {
                          handleNestedChange(activeMediaTarget.section, activeMediaTarget.field, img.url);
                        } else if (activeMediaTarget.type === 'whyChooseUs') {
                          handleWhyChooseItemChange(activeMediaTarget.index, 'icon', img.url);
                        }
                        setIsMediaLibraryOpen(false);
                      }} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 shadow-sm w-3/4">
                        Select
                      </button>
                      <button onClick={() => handleDeleteMedia(img.name)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 shadow-sm w-3/4">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </AdminLayout>
  );
};

export default ManageThemeCustomization;