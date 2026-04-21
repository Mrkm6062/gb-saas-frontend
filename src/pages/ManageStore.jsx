import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const ManageStore = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); // Gets the store ID from the URL

  // Find the current store to initialize the form state
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  // Form states
  const [storeName, setStoreName] = useState(currentStore.storeName || '');
  const [websiteTitle, setWebsiteTitle] = useState(currentStore.websiteTitle || '');
  const [logo, setLogo] = useState(currentStore.logo || '');
  const [favicon, setFavicon] = useState(currentStore.favicon || '');
  const [status, setStatus] = useState('');

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
          favicon
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

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Store">
    <div className="p-6 bg-white rounded-xl shadow-sm max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Store Settings</h2>
      
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
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Website Title (SEO)</label>
          <input 
            type="text" 
            value={websiteTitle}
            onChange={(e) => setWebsiteTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Logo URL</label>
          <input 
            type="text" 
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
          {logo && <img src={logo} alt="Logo Preview" className="mt-3 h-12 object-contain" />}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Favicon URL</label>
          <input 
            type="text" 
            value={favicon}
            onChange={(e) => setFavicon(e.target.value)}
            placeholder="https://example.com/favicon.ico"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
        </div>

        <button 
          type="submit" 
          className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition w-full mt-4"
        >
          Save Settings
        </button>
      </form>
    </div>
    </AdminLayout>
  );
};

export default ManageStore;
