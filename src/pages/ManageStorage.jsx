import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Trash2, HardDrive, Image as ImageIcon } from 'lucide-react';

const ManageStorage = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [images, setImages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchData = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    try {
      // Fetch Images
      const imgRes = await fetch(`${API_BASE_URL}/api/upload?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (imgRes.ok) {
        const data = await imgRes.json();
        // Sort newest first
        const sortedImages = (data.images || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setImages(sortedImages);
      }

      // Fetch Plans to determine storage limits
      const planRes = await fetch(`${API_BASE_URL}/api/plans`);
      if (planRes.ok) {
        setPlans(await planRes.json());
      }
    } catch (error) {
      console.error("Error fetching storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentStore._id]);

  const handleDelete = async (filename) => {
    if (!window.confirm("Are you sure you want to permanently delete this image from your cloud storage? This action cannot be undone.")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ filename })
      });
      if (response.ok) {
        fetchData(); // Refresh the grid and storage usage
      } else {
        alert("Failed to delete image.");
      }
    } catch (err) {
      alert("Error deleting image.");
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determine Active Plan & Storage Limit
  const activePlan = plans.find(p => p._id === currentStore.planId) || plans.find(p => p.name === 'Free');
  const limitMB = activePlan?.features?.storageLimit || 500; // Default 500MB
  const limitBytes = limitMB * 1024 * 1024;
  
  // Calculate Used Storage
  const usedBytes = images.reduce((sum, img) => sum + (img.size || 0), 0);
  const usagePercent = Math.min(100, (usedBytes / limitBytes) * 100);

  const getProgressColor = () => {
    if (usagePercent < 50) return 'bg-[#76b900]';
    if (usagePercent < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Storage & Media">
      <div className="w-full px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Media Library</h2>
          <p className="text-slate-500">Manage all uploaded product images, banners, and logos for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
        </div>

        {/* Storage Usage Widget */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <HardDrive size={32} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Storage Usage</p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {formatBytes(usedBytes)} <span className="text-base text-slate-400 font-medium">used of {limitMB >= 1000 ? `${limitMB/1000}GB` : `${limitMB}MB`}</span>
                </p>
              </div>
              <span className="text-sm font-bold text-slate-600">{usagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${getProgressColor()} transition-all duration-500`} style={{ width: `${usagePercent}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Active Plan: <span className="font-semibold text-slate-600">{activePlan?.name || 'Free'}</span></p>
          </div>
        </div>

        {/* Image Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2"><ImageIcon size={20} className="text-slate-400"/> Uploaded Files ({images.length})</h3>
          
          {loading ? (
            <div className="py-20 text-center font-medium text-slate-400 animate-pulse">Loading media...</div>
          ) : images.length === 0 ? (
            <div className="py-20 text-center font-medium text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No media found. Upload images to your store first.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {images.map((img) => (
                <div key={img.name} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <img src={img.url} alt="media" className="w-full h-full object-cover flex-1" />
                  <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-md">{formatBytes(img.size)}</span>
                    <button onClick={() => handleDelete(img.name)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageStorage;