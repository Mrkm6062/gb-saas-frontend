import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { ChevronUp, ChevronDown, FolderOpen, Tags, Percent, Plus, Trash2, Edit3, Image as ImageIcon } from 'lucide-react';

const ManageCategory = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [activeTab, setActiveTab] = useState('category'); // 'category', 'subcategory', 'offer'
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Media Library states
  const [mediaTarget, setMediaTarget] = useState('category'); // 'category', 'offer'
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);

  // 1. Categories State
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [catStatus, setCatStatus] = useState('active');
  const [editingId, setEditingId] = useState(null);

  // 2. Sub-categories State
  const [subCategories, setSubCategories] = useState([]);
  const [subName, setSubName] = useState('');
  const [subDescription, setSubDescription] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subStatus, setSubStatus] = useState('active');
  const [subOrder, setSubOrder] = useState(0);
  const [editingSubId, setEditingSubId] = useState(null);

  // 3. Offer Categories State
  const [offerCategories, setOfferCategories] = useState([]);
  const [offerName, setOfferName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerBanner, setOfferBanner] = useState('');
  const [offerIcon, setOfferIcon] = useState('');
  const [offerColor, setOfferColor] = useState('#76b900');
  const [offerPriority, setOfferPriority] = useState(0);
  const [offerHomepageSection, setOfferHomepageSection] = useState(false);
  const [offerActive, setOfferActive] = useState(true);
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerType, setOfferType] = useState('NONE');
  const [offerDiscountPercentage, setOfferDiscountPercentage] = useState(0);
  const [editingOfferId, setEditingOfferId] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  // API Call Helpers
  const fetchCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Default category select for sub-categories
        if (data.length > 0 && !subCategoryId) {
          setSubCategoryId(data[0]._id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/subcategories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setSubCategories(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOfferCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/offercategories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setOfferCategories(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchCategories();
      fetchSubCategories();
      fetchOfferCategories();
    }
  }, [currentStore._id]);

  // Image Upload Logic
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('images', files[0]);

    setUploadingImage(true);
    setStatus('Uploading image...');
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
        if (data.urls && data.urls.length > 0) {
          if (mediaTarget === 'category') {
            setImage(data.urls[0]);
          } else {
            setOfferBanner(data.urls[0]);
          }
          setStatus('Image uploaded successfully!');
        } else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (err) { data = { message: 'Upload Failed' }; }
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
      setUploadingImage(false);
      setActiveXhr(null);
      if (e.target) e.target.value = '';
    };

    xhr.onerror = () => {
      setStatus('Upload Error: Network failure');
      setUploadingImage(false);
      setActiveXhr(null);
      if (e.target) e.target.value = '';
    };

    xhr.onabort = () => {
      setStatus('Upload canceled.');
      setUploadingImage(false);
      setActiveXhr(null);
      if (e.target) e.target.value = '';
    };

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

  // 1. Submit Handlers - Categories
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/categories/${editingId}` : `/api/categories`;
    const body = editingId 
      ? { name, description, image, status: catStatus } 
      : { storeId: currentStore._id, name, description, image, status: catStatus };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setName('');
        setDescription('');
        setImage('');
        setCatStatus('active');
        setEditingId(null);
        setStatus(editingId ? 'Category updated successfully!' : 'Category created successfully!');
        fetchCategories();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Handlers - Subcategories
  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    if (!subName || !subCategoryId) {
      alert("Name and Parent Category are required");
      return;
    }
    setLoading(true);
    setStatus('Saving subcategory...');
    const method = editingSubId ? 'PUT' : 'POST';
    const endpoint = editingSubId ? `/api/subcategories/${editingSubId}` : `/api/subcategories`;
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          categoryId: subCategoryId,
          name: subName,
          description: subDescription,
          status: subStatus,
          order: Number(subOrder)
        })
      });
      if (response.ok) {
        setStatus(editingSubId ? 'Sub-category updated successfully!' : 'Sub-category added successfully!');
        setSubName('');
        setSubDescription('');
        setSubCategoryId(categories[0]?._id || '');
        setSubStatus('active');
        setSubOrder(0);
        setEditingSubId(null);
        fetchSubCategories();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to save sub-category'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Handlers - Offer Categories
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (!offerName) {
      alert("Offer Category Name is required");
      return;
    }
    setLoading(true);
    setStatus('Saving offer category...');
    const method = editingOfferId ? 'PUT' : 'POST';
    const endpoint = editingOfferId ? `/api/offercategories/${editingOfferId}` : `/api/offercategories`;
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          name: offerName,
          description: offerDescription,
          banner: offerBanner,
          icon: offerIcon,
          color: offerColor,
          priority: Number(offerPriority),
          homepageSection: offerHomepageSection,
          active: offerActive,
          startDate: offerStartDate || null,
          endDate: offerEndDate || null,
          offerType: offerType,
          discountPercentage: Number(offerDiscountPercentage)
        })
      });
      if (response.ok) {
        setStatus(editingOfferId ? 'Offer category updated successfully!' : 'Offer category added successfully!');
        setOfferName('');
        setOfferDescription('');
        setOfferBanner('');
        setOfferIcon('');
        setOfferColor('#76b900');
        setOfferPriority(0);
        setOfferHomepageSection(false);
        setOfferActive(true);
        setOfferStartDate('');
        setOfferEndDate('');
        setOfferType('NONE');
        setOfferDiscountPercentage(0);
        setEditingOfferId(null);
        fetchOfferCategories();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to save offer category'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reorder & Position actions for categories
  const saveReorder = async (newOrder) => {
    try {
      const orderedIds = newOrder.map(c => c._id);
      await fetch(`${API_BASE_URL}/api/categories/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeId: currentStore._id, orderedIds })
      });
    } catch (err) {
      console.error("Failed to reorder categories", err);
    }
  };

  const moveCategoryUp = async (index) => {
    if (index === 0) return;
    const newCats = [...categories];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    setCategories(newCats);
    await saveReorder(newCats);
  };

  const moveCategoryDown = async (index) => {
    if (index === categories.length - 1) return;
    const newCats = [...categories];
    [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    setCategories(newCats);
    await saveReorder(newCats);
  };

  // Edit loaders
  const handleEdit = (category) => {
    setName(category.name);
    setDescription(category.description || '');
    setImage(category.image?.url || '');
    setCatStatus(category.status || 'active');
    setEditingId(category._id);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubEdit = (sub) => {
    setSubName(sub.name);
    setSubDescription(sub.description || '');
    setSubCategoryId(sub.category?._id || sub.category || '');
    setSubStatus(sub.status || 'active');
    setSubOrder(sub.order || 0);
    setEditingSubId(sub._id);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfferEdit = (off) => {
    setOfferName(off.name);
    setOfferDescription(off.description || '');
    setOfferBanner(off.banner || '');
    setOfferIcon(off.icon || '');
    setOfferColor(off.color || '#76b900');
    setOfferPriority(off.priority || 0);
    setOfferHomepageSection(off.homepageSection || false);
    setOfferActive(off.active !== false);
    setOfferStartDate(off.startDate ? new Date(off.startDate).toISOString().split('T')[0] : '');
    setOfferEndDate(off.endDate ? new Date(off.endDate).toISOString().split('T')[0] : '');
    setOfferType(off.offerType || 'NONE');
    setOfferDiscountPercentage(off.discountPercentage || 0);
    setEditingOfferId(off._id);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete helpers
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubDelete = async (id) => {
    if (!window.confirm("Delete this sub-category?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/subcategories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchSubCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOfferDelete = async (id) => {
    if (!window.confirm("Delete this offer category?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/offercategories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchOfferCategories();
    } catch (err) {
      console.error(err);
    }
  };

  // Resets
  const cancelEdit = () => {
    setName('');
    setDescription('');
    setImage('');
    setCatStatus('active');
    setEditingId(null);
    setStatus('');
  };

  const cancelSubEdit = () => {
    setSubName('');
    setSubDescription('');
    setSubStatus('active');
    setSubOrder(0);
    setEditingSubId(null);
    setStatus('');
  };

  const cancelOfferEdit = () => {
    setOfferName('');
    setOfferDescription('');
    setOfferBanner('');
    setOfferIcon('');
    setOfferColor('#76b900');
    setOfferPriority(0);
    setOfferHomepageSection(false);
    setOfferActive(true);
    setOfferStartDate('');
    setOfferEndDate('');
    setOfferType('NONE');
    setOfferDiscountPercentage(0);
    setEditingOfferId(null);
    setStatus('');
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Catalog Manager">
      <div className="w-full px-6 py-8">
        
        {/* Navigation Tabs - Wow factor premium glassmorphism tab design */}
        <div className="flex flex-wrap gap-3 mb-8 bg-slate-100 p-2.5 rounded-2xl w-fit border border-slate-200">
          <button 
            onClick={() => { setActiveTab('category'); setStatus(''); }} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'category' ? 'bg-[#76b900] text-white shadow-md' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'}`}
          >
            <FolderOpen size={18} />
            Manage Category
          </button>
          <button 
            onClick={() => { setActiveTab('subcategory'); setStatus(''); }} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'subcategory' ? 'bg-[#76b900] text-white shadow-md' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'}`}
          >
            <Tags size={18} />
            Manage Subcategory
          </button>
          <button 
            onClick={() => { setActiveTab('offer'); setStatus(''); }} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'offer' ? 'bg-[#76b900] text-white shadow-md' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'}`}
          >
            <Percent size={18} />
            Manage Offer Category
          </button>
        </div>

        {status && (
          <div className="p-4 mb-6 rounded-xl font-bold text-sm border bg-green-50 text-green-700 border-green-200 animate-fadeIn">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          {/* LEFT PANEL: CRUD FORMS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit transition-all duration-300 hover:shadow-md">
            
            {/* 1. Category Form */}
            {activeTab === 'category' && (
              <>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
                  {editingId ? 'Edit Category' : 'Add Category'}
                </h3>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Category Name</label>
                    <input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. Vegetables" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Status</label>
                    <select value={catStatus} onChange={e=>setCatStatus(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white text-sm">
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] resize-none text-sm" rows="3" placeholder="Describe this category..." />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category Image</label>
                      <button type="button" onClick={() => { setMediaTarget('category'); setIsMediaLibraryOpen(true); fetchMedia(); }} className="text-[10px] font-bold text-[#76b900] hover:underline transition">View Media Library</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={image} onChange={e=>setImage(e.target.value)} placeholder="https://..." className="flex-1 w-full px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                      <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap text-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingImage ? '...' : 'Upload'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { setMediaTarget('category'); handleImageUpload(e); }} disabled={uploadingImage} />
                      </label>
                    </div>
                    {image && <img src={image} alt="Preview" className="mt-3 h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm" />}
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={loading} className="w-full py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100/50">{loading ? 'Saving...' : (editingId ? 'Save Category' : 'Add Category')}</button>
                    {editingId && (
                      <button type="button" onClick={cancelEdit} className="w-full mt-2.5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                    )}
                  </div>
                </form>
              </>
            )}

            {/* 2. Subcategory Form */}
            {activeTab === 'subcategory' && (
              <>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
                  {editingSubId ? 'Edit Sub-Category' : 'Add Sub-Category'}
                </h3>
                <form onSubmit={handleSubCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Sub-Category Name</label>
                    <input required value={subName} onChange={e=>setSubName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. Leafy Vegetables" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Parent Category</label>
                    <select required value={subCategoryId} onChange={e=>setSubCategoryId(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white text-sm">
                      <option value="">Select Parent Category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Status</label>
                    <select value={subStatus} onChange={e=>setSubStatus(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white text-sm">
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Order / Priority</label>
                    <input type="number" value={subOrder} onChange={e=>setSubOrder(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea value={subDescription} onChange={e=>setSubDescription(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] resize-none text-sm" rows="3" placeholder="Describe this subcategory..." />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={loading} className="w-full py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100/50">{loading ? 'Saving...' : (editingSubId ? 'Save Sub-Category' : 'Add Sub-Category')}</button>
                    {editingSubId && (
                      <button type="button" onClick={cancelSubEdit} className="w-full mt-2.5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                    )}
                  </div>
                </form>
              </>
            )}

            {/* 3. Offer Category Form */}
            {activeTab === 'offer' && (
              <>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
                  {editingOfferId ? 'Edit Offer Category' : 'Add Offer Category'}
                </h3>
                <form onSubmit={handleOfferSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Offer Title</label>
                    <input required value={offerName} onChange={e=>setOfferName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. Festival B1G1 Fest" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Offer Type</label>
                    <select value={offerType} onChange={e=>setOfferType(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white text-sm">
                      <option value="NONE">No Special Offer Rules</option>
                      <option value="B1G1">Buy 1 Get 1 Free (B1G1)</option>
                      <option value="B2G1">Buy 2 Get 1 Free (B2G1)</option>
                      <option value="DISCOUNT">Percent Discount (Storefront)</option>
                    </select>
                  </div>

                  {offerType === 'DISCOUNT' && (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Discount Percentage (%)</label>
                      <input type="number" min="1" max="100" value={offerDiscountPercentage} onChange={e=>setOfferDiscountPercentage(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Theme Color</label>
                      <input type="color" value={offerColor} onChange={e=>setOfferColor(e.target.value)} className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Display Priority</label>
                      <input type="number" value={offerPriority} onChange={e=>setOfferPriority(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Start Date</label>
                      <input type="date" value={offerStartDate} onChange={e=>setOfferStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">End Date</label>
                      <input type="date" value={offerEndDate} onChange={e=>setOfferEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={offerHomepageSection} onChange={e=>setOfferHomepageSection(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      Show as Homepage Section
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={offerActive} onChange={e=>setOfferActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      Active (Visible to Customers)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea value={offerDescription} onChange={e=>setOfferDescription(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] resize-none text-sm" rows="3" placeholder="Offer details, terms..." />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Offer Banner / Image</label>
                      <button type="button" onClick={() => { setMediaTarget('offer'); setIsMediaLibraryOpen(true); fetchMedia(); }} className="text-[10px] font-bold text-[#76b900] hover:underline transition">View Media Library</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={offerBanner} onChange={e=>setOfferBanner(e.target.value)} placeholder="https://..." className="flex-1 w-full px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                      <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap text-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingImage ? '...' : 'Upload'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { setMediaTarget('offer'); handleImageUpload(e); }} disabled={uploadingImage} />
                      </label>
                    </div>
                    {offerBanner && <img src={offerBanner} alt="Preview" className="mt-3 h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm" />}
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={loading} className="w-full py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100/50">{loading ? 'Saving...' : (editingOfferId ? 'Save Offer Category' : 'Add Offer Category')}</button>
                    {editingOfferId && (
                      <button type="button" onClick={cancelOfferEdit} className="w-full mt-2.5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                    )}
                  </div>
                </form>
              </>
            )}

          </div>

          {/* RIGHT PANEL: LIST DISPLAY */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Category Tab List */}
            {activeTab === 'category' && (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-700 text-sm flex items-center justify-between">
                  <span>Categories List</span>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{categories.length} Total</span>
                </div>
                {categories.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">No categories found. Create one on the left.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {categories.map((c, index) => (
                      <div key={c._id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1 mr-2">
                            <button onClick={() => moveCategoryUp(index)} disabled={index === 0} className="text-slate-400 hover:text-slate-800 disabled:opacity-30 transition"><ChevronUp size={18} /></button>
                            <button onClick={() => moveCategoryDown(index)} disabled={index === categories.length - 1} className="text-slate-400 hover:text-slate-800 disabled:opacity-30 transition"><ChevronDown size={18} /></button>
                          </div>
                          {c.image?.url ? (
                            <img src={c.image.url} className="w-12 h-12 rounded-xl object-cover bg-slate-50 border border-slate-100" alt={c.name} />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-extrabold text-sm">{c.name.substring(0, 2).toUpperCase()}</div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              {c.name}
                              <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${c.status === 'inactive' ? 'bg-slate-100 text-slate-400 border' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                {c.status === 'inactive' ? 'Hidden' : 'Active'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description || 'No description provided.'}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-xl transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(c._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Sub-category Tab List */}
            {activeTab === 'subcategory' && (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-700 text-sm flex items-center justify-between">
                  <span>Subcategories List</span>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{subCategories.length} Total</span>
                </div>
                {subCategories.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">No subcategories found. Create one on the left.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {subCategories.map((sub) => (
                      <div key={sub._id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-sm">#</div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              {sub.name}
                              <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold border">
                                Parent: {sub.category?.name || 'Category Deleted'}
                              </span>
                              <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${sub.status === 'inactive' ? 'bg-slate-100 text-slate-400 border' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                {sub.status === 'inactive' ? 'Hidden' : 'Active'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sub.description || 'No description provided.'}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSubEdit(sub)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-xl transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleSubDelete(sub._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Offer Categories Tab List */}
            {activeTab === 'offer' && (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-700 text-sm flex items-center justify-between">
                  <span>Offers List</span>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{offerCategories.length} Total</span>
                </div>
                {offerCategories.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">No offers found. Create one on the left.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {offerCategories.map((off) => (
                      <div key={off._id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-4 text-left">
                          {off.banner ? (
                            <img src={off.banner} className="w-12 h-12 rounded-xl object-cover bg-slate-50 border border-slate-100" alt={off.name} />
                          ) : (
                            <div style={{ backgroundColor: off.color || '#76b900' }} className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-extrabold text-sm uppercase">%</div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                              {off.name}
                              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                {off.offerType === 'B1G1' ? 'Buy 1 Get 1' : off.offerType === 'B2G1' ? 'Buy 2 Get 1' : off.offerType === 'DISCOUNT' ? `${off.discountPercentage}% Off` : 'None'}
                              </span>
                              <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${!off.active ? 'bg-slate-100 text-slate-400 border' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                {off.active ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{off.description || 'No description provided.'}</div>
                            {(off.startDate || off.endDate) && (
                              <div className="text-[10px] font-semibold text-slate-400 mt-1">
                                Duration: {off.startDate ? new Date(off.startDate).toLocaleDateString() : 'Start'} to {off.endDate ? new Date(off.endDate).toLocaleDateString() : 'End'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleOfferEdit(off)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-xl transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleOfferDelete(off._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
                        <button 
                          onClick={() => {
                            if (mediaTarget === 'category') {
                              setImage(img.url);
                            } else {
                              setOfferBanner(img.url);
                            }
                            setIsMediaLibraryOpen(false);
                          }} 
                          className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 shadow-sm w-3/4"
                        >
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

export default ManageCategory;