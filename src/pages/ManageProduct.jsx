import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const ManageProduct = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const initialForm = {
    name: '', description: '', category: '', unitType: 'piece',
    basePrice: '', totalStock: '', images: [], variants: []
  };
  const [formData, setFormData] = useState(initialForm);

  // Dynamic Field Handlers
  const handleAddVariant = () => setFormData({ ...formData, variants: [...formData.variants, { name: '', price: '', comparePrice: '', stock: '', sku: '' }] });
  const handleUpdateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };
  const handleRemoveVariant = (index) => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== index) });

  const handleRemoveImage = (index) => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchProducts = async () => {
    if (!currentStore._id) return;

    try {
      // Pass storeId context to the backend
      const response = await fetch(`${API_BASE_URL}/api/products?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchProducts();
    }
  }, [currentStore._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');

    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/products/${editingId}` : `/api/products`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...formData,
          basePrice: Number(formData.basePrice) || 0,
          totalStock: Number(formData.totalStock) || 0,
          storeId: currentStore._id // Explicitly bind product to this store
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(editingId ? 'Product updated successfully!' : 'Product added successfully!');
        setFormData(initialForm);
        setEditingId(null);
        setIsFormOpen(false);
        fetchProducts(); // Refresh the grid
      } else {
        setStatus(`Error: ${data.message || 'Failed to save product'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      unitType: product.unitType || 'piece',
      basePrice: product.basePrice || product.price || '',
      totalStock: product.totalStock !== undefined ? product.totalStock : (product.stock || ''),
      images: product.images || [],
      variants: product.variants || []
    });
    setEditingId(product._id);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsFormOpen(false);
    setStatus('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setStatus('Product deleted successfully');
        fetchProducts();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to delete'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    files.forEach(file => uploadData.append('images', file));

    setLoading(true);
    setStatus('Uploading and converting images...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      const data = await response.json();
      if (response.ok) {
        setFormData({ ...formData, images: [...formData.images, ...data.urls] });
        setStatus('Images uploaded successfully!');
      } else {
        setStatus(`Upload Error: ${data.message}`);
      }
    } catch (err) {
      setStatus(`Upload Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
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

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Products">
    <div className="p-6 mx-auto mt-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Product Management</h2>
          <p className="text-slate-500">Manage inventory and variants for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="px-6 py-3 bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white font-bold rounded-xl hover:shadow-lg transition flex items-center gap-2">
          <span className="text-xl leading-none">+</span> Add Product
        </button>
      </div>

      {status && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {status}
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-sm">
          <div className="col-span-5">Product Name</div><div className="col-span-3">Price</div><div className="col-span-2">Stock</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No products found. Add your first product above!</div>
        ) : (
          products.map(p => (
            <div key={p._id} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 items-center hover:bg-slate-50 transition">
              <div className="col-span-5">
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-1" title="Store ID">Store ID: {currentStore.storeId}</div>
              </div>
              <div className="col-span-3 text-green-600 font-bold">₹{p.basePrice || p.price || (p.variants?.length > 0 ? p.variants[0].price : 0)}</div>
              <div className="col-span-2 text-slate-600">{p.totalStock !== undefined ? p.totalStock : (p.stock || 0)} {p.unitType || 'units'}</div>
              <div className="col-span-2 text-right flex justify-end gap-2">
                <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition">
                  Edit
                </button>
                <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Modal Overlay for Product Form */}
    {isFormOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1">
            <form id="productForm" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b border-slate-100 pb-2 text-slate-800">Basic Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Product Name <span className="text-red-500">*</span></label><input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow" placeholder="e.g. Fresh Tomatoes" /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Category</label>
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow bg-white">
                      <option value="">Select Category</option>
                      <option value="vegetable">Vegetable Shop</option>
                      <option value="nasta">Nasta Corner</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="clothes">Clothes Shop</option>
                      <option value="kirana">Kirana Store</option>
                    </select>
                  </div>
                  <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1 text-slate-700">Description</label><textarea rows="3" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow resize-none" placeholder="Provide product details..." /></div>
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b border-slate-100 pb-2 text-slate-800">Pricing & Default Inventory</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Base Price (₹) <span className="text-red-500">*</span></label><input type="number" required={formData.variants.length === 0} value={formData.basePrice} onChange={e=>setFormData({...formData, basePrice: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow" placeholder="0.00" /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Total Stock</label><input type="number" value={formData.totalStock} onChange={e=>setFormData({...formData, totalStock: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow disabled:bg-slate-50" disabled={formData.variants.length > 0} placeholder={formData.variants.length > 0 ? "Calculated from variants" : "0"} /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Selling Unit Type</label>
                    <select value={formData.unitType} onChange={e=>setFormData({...formData, unitType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] transition-shadow bg-white">
                      <option value="piece">Piece</option>
                      <option value="kg">Kg</option>
                      <option value="gram">Gram</option>
                      <option value="plate">Plate</option>
                      <option value="pack">Pack</option>
                      <option value="size">Size</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-lg text-slate-800">Product Images</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsMediaLibraryOpen(true); fetchMedia(); }} className="text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">View Media Library</button>
                    <label className="cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      + Upload Images
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loading} />
                    </label>
                  </div>
                </div>
                {formData.images.length === 0 && <p className="text-sm text-slate-500 italic">No images added. A placeholder will be shown.</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square flex items-center justify-center">
                      <img src={img} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={()=>handleRemoveImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600">&times;</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Images will be automatically converted to AVIF format for better performance and smaller size.</p>
              </div>

              {/* Variants */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-lg text-slate-800">Product Variants</h4>
                  <button type="button" onClick={handleAddVariant} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">+ Add Variant</button>
                </div>
                {formData.variants.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No variants added. The product will use the base price and total stock.</p>
                ) : formData.variants.map((v, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 relative group transition-colors hover:border-slate-300">
                    <button type="button" onClick={()=>handleRemoveVariant(idx)} className="absolute top-3 right-4 text-red-400 hover:text-red-600 font-bold text-xl leading-none">&times;</button>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                      <div className="md:col-span-2"><label className="block text-xs font-semibold mb-1 text-slate-600">Variant Name <span className="text-red-500">*</span></label><input type="text" placeholder="e.g. 500g, Red, Size L" value={v.name} onChange={e=>handleUpdateVariant(idx, 'name', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">Price (₹) <span className="text-red-500">*</span></label><input type="number" placeholder="Price" value={v.price} onChange={e=>handleUpdateVariant(idx, 'price', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">Stock <span className="text-red-500">*</span></label><input type="number" placeholder="Qty" value={v.stock} onChange={e=>handleUpdateVariant(idx, 'stock', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">SKU Code</label><input type="text" placeholder="Optional" value={v.sku} onChange={e=>handleUpdateVariant(idx, 'sku', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0">
            <button type="button" onClick={handleClose} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" form="productForm" disabled={loading} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50">
              {editingId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>
      </div>
    )}

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
              <div className="text-center py-20 text-slate-500 font-medium">No media found. Upload images from the product form.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {mediaImages.map((img) => (
                  <div key={img.name} className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-sm hover:shadow-md transition-shadow">
                    <img src={img.url} alt="media" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button onClick={() => { if (!formData.images.includes(img.url)) setFormData({...formData, images: [...formData.images, img.url]}); setIsMediaLibraryOpen(false); }} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 shadow-sm w-3/4">
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

export default ManageProduct;