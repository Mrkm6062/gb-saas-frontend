import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Trash2, HardDrive, Image as ImageIcon, UploadCloud, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

const compressImage = (file, maxSizeMB = 5) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    if (file.size <= maxSizeMB * 1024 * 1024) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIMENSION = 1600;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const attemptCompression = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.2) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() }));
            else { quality -= 0.1; attemptCompression(); }
          }, 'image/jpeg', quality);
        };
        attemptCompression();
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const ManageStorage = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [images, setImages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeXhr, setActiveXhr] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);

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
        setSelectedImages(prev => prev.filter(name => name !== filename));
        fetchData(); // Refresh the grid and storage usage
      } else {
        alert("Failed to delete image.");
      }
    } catch (err) {
      alert("Error deleting image.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedImages.length} image(s)? This action cannot be undone.`)) return;

    setIsDeletingBulk(true);
    try {
      await Promise.all(selectedImages.map(filename => 
        fetch(`${API_BASE_URL}/api/upload`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename })
        })
      ));
      setSelectedImages([]);
      fetchData(); 
    } catch (err) {
      alert("Error deleting some images.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const toggleSelection = (filename) => {
    setSelectedImages(prev => prev.includes(filename) ? prev.filter(name => name !== filename) : [...prev, filename]);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const compressedFiles = await Promise.all(files.map(f => compressImage(f, 5)));

      const uploadData = new FormData();
      uploadData.append('storeId', currentStore._id);
      compressedFiles.forEach(file => uploadData.append('images', file));

      const xhr = new XMLHttpRequest();
      setActiveXhr(xhr);
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          fetchData(); 
        } else {
          alert('Upload failed. Please try again or check your storage limits.');
        }
        setUploading(false);
        setActiveXhr(null);
        if (e.target) e.target.value = '';
      };

      xhr.onerror = () => {
        alert('Upload failed due to network error.');
        setUploading(false);
        setActiveXhr(null);
        if (e.target) e.target.value = '';
      };

      xhr.send(uploadData);
    } catch (err) {
      console.error("Compression/Upload Error:", err);
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    if (activeXhr) activeXhr.abort();
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('Image URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy URL.');
    });
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

  const totalPages = Math.ceil(images.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedImages = images.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [images.length, totalPages, currentPage]);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Storage & Media">
      <div className="w-full px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Media Library</h2>
            <p className="text-slate-500">Manage all uploaded product images, banners, and logos for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
          </div>

          {/* Storage Usage Widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-5 w-full lg:w-[400px] shrink-0">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <HardDrive size={28} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Storage Usage</p>
                  <p className="text-xl font-extrabold text-slate-800">
                    {formatBytes(usedBytes)} <span className="text-sm text-slate-400 font-medium">/ {limitMB >= 1000 ? `${limitMB/1000}GB` : `${limitMB}MB`}</span>
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-600">{usagePercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getProgressColor()} transition-all duration-500`} style={{ width: `${usagePercent}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Active Plan: <span className="font-semibold text-slate-600">{activePlan?.name || 'Free'}</span></p>
            </div>
          </div>
        </div>

        {/* Image Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={20} className="text-slate-400"/> Uploaded Files ({images.length})</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <label className={`cursor-pointer px-4 py-2 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition flex items-center gap-2 shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <UploadCloud size={18} />
                {uploading ? `Uploading ${uploadProgress}%` : 'Upload Images'}
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              
              {images.length > 0 && (
                <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                  <span className="text-sm font-medium text-slate-500 hidden sm:inline">{selectedImages.length} selected</span>
                  {selectedImages.length > 0 ? (
                    <>
                      <button onClick={() => setSelectedImages([])} className="text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition">Clear</button>
                      <button onClick={handleBulkDelete} disabled={isDeletingBulk} className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1 disabled:opacity-50 shadow-sm">
                        <Trash2 size={16}/> <span className="hidden sm:inline">{isDeletingBulk ? 'Deleting...' : 'Delete Selected'}</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setSelectedImages(images.map(img => img.name))} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">Select All</button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {uploading && (
            <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
              <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                <span>Uploading Images... {uploadProgress}%</span>
                <button type="button" onClick={cancelUpload} className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors">Cancel</button>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center font-medium text-slate-400 animate-pulse">Loading media...</div>
          ) : images.length === 0 ? (
            <div className="py-20 text-center font-medium text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No media found. Upload images to your store first.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {paginatedImages.map((img) => {
                const isSelected = selectedImages.includes(img.name);
                return (
                <div key={img.name} className={`relative group rounded-xl border-2 overflow-hidden bg-slate-50 aspect-square shadow-sm transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:shadow-md'}`}>
                  <img src={img.url} alt="media" className={`w-full h-full object-cover flex-1 cursor-pointer transition-opacity ${isSelected ? 'opacity-80' : ''}`} onClick={() => toggleSelection(img.name)} />
                  
                  {/* Selection Checkbox Overlay */}
                  <div className="absolute top-2 left-2 z-10">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(img.name)} className="w-5 h-5 cursor-pointer accent-blue-600" />
                  </div>

                  <div className={`absolute inset-0 bg-slate-900/70 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] pointer-events-none ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-md pointer-events-auto mb-1">{formatBytes(img.size)}</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(img.url); }} className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 shadow-lg transform hover:scale-110 transition pointer-events-auto" title="Copy URL"><Copy size={16}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(img.name); }} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition pointer-events-auto" title="Delete Image"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              )})}
              </div>

              {images.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-slate-100 gap-4">
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, images.length)}</span> of <span className="font-bold text-slate-800">{images.length}</span> items
                    <select 
                      value={itemsPerPage} 
                      onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                      className="ml-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#76b900]"
                    >
                      <option value={24}>24 per page</option>
                      <option value={48}>48 per page</option>
                      <option value={96}>96 per page</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                      <ChevronLeft size={18} />
                    </button>
                    <div className="text-sm font-medium text-slate-600 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                      {currentPage} / {totalPages || 1}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageStorage;