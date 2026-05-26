import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { ChevronUp, ChevronDown } from 'lucide-react';

const ManageCategory = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [catStatus, setCatStatus] = useState('active');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setCategories(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchCategories(); }, [currentStore._id]);

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
        const timeDiff = (currentTime - lastTime) / 1000; // in seconds
        
        if (timeDiff > 0.5) { // update speed every 500ms
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
          setImage(data.urls[0]);
          setStatus('Image uploaded successfully!');
        } else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: 'Upload Failed' }; }
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
    if (activeXhr) {
      activeXhr.abort();
    }
  };

  const handleSubmit = async (e) => {
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

  const handleEdit = (category) => {
    setName(category.name);
    setDescription(category.description || '');
    setImage(category.image?.url || '');
    setCatStatus(category.status || 'active');
    setEditingId(category._id);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setName('');
    setDescription('');
    setImage('');
    setCatStatus('active');
    setEditingId(null);
    setStatus('');
  };

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

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Categories">
      <div className="w-full px-6 py-10">
        {/* <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Categories</h2>
        <p className="text-slate-500 mb-8">Manage product categories for <span className="font-bold">{currentStore.storeName}</span></p> */}
        {status && <div className="p-4 mb-6 rounded-xl font-medium text-sm border bg-green-50 text-green-700 border-green-200">{status}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit">
            <h3 className="text-xl font-bold mb-4 text-slate-800">{editingId ? 'Edit Category' : 'Add Category'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-semibold mb-1 text-slate-700">Category Name</label><input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. T-Shirts" /></div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Status</label>
                <select value={catStatus} onChange={e=>setCatStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white">
                  <option value="active">Active (Visible)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-1 text-slate-700">Description</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] resize-none" rows="3" placeholder="Optional details..." /></div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Category Image</label>
                <div className="flex gap-2">
                  <input type="text" value={image} onChange={e=>setImage(e.target.value)} placeholder="https://..." className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#76b900]" />
                  <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
                {uploadingImage && (
                  <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
                    <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                      <span>Uploading Image... {uploadProgress}%</span>
                      <div className="flex items-center gap-3">
                        <span>{uploadSpeed}</span>
                        <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
                  </div>
                )}
                {image && <img src={image} alt="Preview" className="mt-3 h-16 w-16 object-cover rounded-xl border border-slate-200" />}
              </div>
              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100">{loading ? 'Saving...' : (editingId ? 'Update Category' : 'Add Category')}</button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="w-full mt-3 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                )}
              </div>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-sm">Category List</div>
            {categories.length === 0 ? <div className="p-8 text-center text-slate-500">No categories added yet.</div> : (
              <div className="divide-y divide-slate-100">
                {categories.map((c, index) => (<div key={c._id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition"><div className="flex items-center gap-4"><div className="flex flex-col gap-1 mr-2"><button onClick={() => moveCategoryUp(index)} disabled={index === 0} className="text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronUp size={20} /></button><button onClick={() => moveCategoryDown(index)} disabled={index === categories.length - 1} className="text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronDown size={20} /></button></div>{c.image?.url ? <img src={c.image.url} className="w-12 h-12 rounded-lg object-cover bg-slate-100" alt={c.name} /> : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold">{c.name.substring(0, 2).toUpperCase()}</div>}<div><div className="font-bold text-slate-800 flex items-center gap-2">{c.name} <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${c.status === 'inactive' ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700'}`}>{c.status === 'inactive' ? 'Hidden' : 'Active'}</span></div><div className="text-sm text-slate-500">{c.description || 'No description'}</div></div></div><div className="flex gap-2"><button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition">Edit</button><button onClick={() => handleDelete(c._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">Delete</button></div></div>))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
export default ManageCategory;