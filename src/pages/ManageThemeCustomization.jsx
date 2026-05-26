import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Palette, Save } from 'lucide-react';

const initialForm = {
  global: { primaryColor: '#22c55e', secondaryColor: '#f97316', fontFamily: 'Poppins', borderRadius: '12px', officialfaviconimage: '', metaTitle: '', metaDescription: '' },
  header: { bgColor: '#ffffff', textColor: '#000000', officialdesktopLogo: '', officialmobileLogo: '', offerBanner: { Enabled: true, text: 'Free delivery on orders above ₹500!', bgColor: '#22c55e', textColor: '#ffffff' } },
  banner: { bgColor: '#f5f5f5', textColor: '#111111', limit: 5 },
  category: { bgColor: '#ffffff' },
  productCard: { bgColor: '#ffffff', borderColor: '#e5e7eb' },
  footer: { bgColor: '#111827', textColor: '#ffffff' }
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
              footer: { ...prev.footer, ...data.footer }
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

  const handleImageUpload = async (e, section, field) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('images', files[0]);

    setUploadingField(`${section}-${field}`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      });
      const data = await response.json();
      if (response.ok && data.urls && data.urls.length > 0) {
        handleNestedChange(section, field, data.urls[0]);
      } else {
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
    } catch (err) {
      setStatus(`Upload Error: ${err.message}`);
    } finally {
      setUploadingField(null);
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
        <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
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
      <div className="w-full px-6 py-10 max-w-6xl mx-auto">
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
            {['global', 'header', 'banner', 'category', 'productCard', 'footer'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap text-left ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')} Settings
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
                    <input type="text" value={formData.global.fontFamily} onChange={(e) => handleNestedChange('global', 'fontFamily', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. Poppins, sans-serif" />
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
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageThemeCustomization;