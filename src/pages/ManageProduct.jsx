import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';                                                                                             
import { DownloadCloud, UploadCloud } from 'lucide-react';

const ManageProduct = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Default Product Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStoreType, setImportStoreType] = useState('kirana');
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [selectedDefaultProducts, setSelectedDefaultProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [stockThreshold, setStockThreshold] = useState(5);

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

  const fetchCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setCategories(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchProducts();
      fetchCategories();
    }
  }, [currentStore._id]);

  // Fetch default products when modal opens or store type changes
  useEffect(() => {
    if (isImportModalOpen && currentStore._id) {
      const fetchDefaultProducts = async () => {
        setLoadingDefaults(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/default-products?storeType=${importStoreType}&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setDefaultProducts(data.data || []);
            setSelectedDefaultProducts((data.data || []).map(p => p._id)); // Auto-select all by default
          }
        } catch (error) {
          console.error("Failed to fetch default products:", error);
        } finally {
          setLoadingDefaults(false);
        }
      };
      setSearchQuery('');
      fetchDefaultProducts();
    }
  }, [isImportModalOpen, importStoreType, currentStore._id, API_BASE_URL, token]);

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

  const toggleDefaultProductSelection = (id) => {
    setSelectedDefaultProducts(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const filteredDefaultProducts = defaultProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleAllDefaultProducts = () => {
    const filteredIds = filteredDefaultProducts.map(p => p._id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedDefaultProducts.includes(id));

    if (allFilteredSelected) {
      setSelectedDefaultProducts(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelections = new Set([...selectedDefaultProducts, ...filteredIds]);
      setSelectedDefaultProducts(Array.from(newSelections));
    }
  };

  const handleImportDefaultProducts = async () => {
    setImporting(true);
    setStatus('Importing products...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/default-products/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          storeType: importStoreType,
          importOnlyMissing: true,
          productIds: selectedDefaultProducts
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStatus(`✅ Successfully imported ${data.count} products!`);
        setIsImportModalOpen(false);
        fetchProducts(); // Refresh the grid
      } else {
        setStatus(`Error: ${data.message || 'Failed to import products'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setImporting(false);
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

  // --- CSV Export & Import Handlers ---
  const handleExportCSV = () => {
    let csvContent = "ProductID,VariantID,ProductName,VariantName,CurrentStock,AddStock\n";
    displayedProducts.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          csvContent += `"${p._id}","${v._id}","${p.name.replace(/"/g, '""')}","${v.name.replace(/"/g, '""')}",${v.stock},0\n`;
        });
      } else {
        csvContent += `"${p._id}","","${p.name.replace(/"/g, '""')}","",${p.totalStock !== undefined ? p.totalStock : (p.stock || 0)},0\n`;
      }
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `stock_update_${currentStore.storeName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus('Processing CSV update...');

    const parseCSVRow = (str) => {
      const result = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') inQuote = !inQuote;
        else if (str[i] === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
        else cur += str[i];
      }
      result.push(cur.trim());
      return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(line => line.trim()).map(parseCSVRow);
      const dataRows = rows.slice(1).filter(r => r.length >= 6); // Skip header

      const updatesByProduct = {};

      dataRows.forEach(row => {
        const [pId, vId, pName, vName, currentStockStr, addStockStr] = row;
        
        const originalProduct = products.find(p => p._id === pId);
        if (!originalProduct) return;

        let actualDbStock = 0;
        if (vId) {
          const variant = originalProduct.variants?.find(v => v._id === vId);
          if (variant) actualDbStock = Number(variant.stock) || 0;
        } else {
          actualDbStock = originalProduct.totalStock !== undefined ? Number(originalProduct.totalStock) : (Number(originalProduct.stock) || 0);
        }

        const parsedCurrentStock = parseInt(currentStockStr, 10);
        const addStock = parseInt(addStockStr, 10) || 0;
        const baseStock = isNaN(parsedCurrentStock) ? actualDbStock : parsedCurrentStock;
        const newStock = baseStock + addStock;

        if (newStock !== actualDbStock) {
          if (!updatesByProduct[pId]) {
             updatesByProduct[pId] = { ...originalProduct, variants: originalProduct.variants ? JSON.parse(JSON.stringify(originalProduct.variants)) : [] };
          }
          const productToUpdate = updatesByProduct[pId];
          if (vId) {
            const variant = productToUpdate.variants.find(v => v._id === vId);
            if (variant) variant.stock = newStock;
          } else {
            productToUpdate.totalStock = newStock;
            productToUpdate.stock = newStock;
          }
        }
      });

      const updatePromises = Object.values(updatesByProduct).map(async (updatedProduct) => {
         if (updatedProduct.variants && updatedProduct.variants.length > 0) {
           updatedProduct.totalStock = updatedProduct.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
         }
         const response = await fetch(`${API_BASE_URL}/api/products/${updatedProduct._id}`, {
           method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(updatedProduct)
         });
         return response.ok;
      });

      try {
        await Promise.all(updatePromises);
        setStatus(`✅ Successfully added stock for ${Object.keys(updatesByProduct).length} products.`);
        fetchProducts(); 
      } catch (err) {
        setStatus('❌ Error during bulk update.');
      } finally {
        setLoading(false);
        e.target.value = null; // Reset input
      }
    };
    reader.readAsText(file);
  };

  // Filter products for the table
  const displayedProducts = products.filter(p => {
    const stock = p.totalStock !== undefined ? p.totalStock : (p.stock || 0);
    if (stockFilter === 'out_of_stock') {
      const stock = p.totalStock !== undefined ? p.totalStock : (p.stock || 0);
      return stock <= 0;
    }
    if (stockFilter === 'low_stock') {
      return stock <= stockThreshold;
    }
    return true;
  });

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Products">
    <div className="w-full px-6 py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Product Management</h2>
          <p className="text-slate-500">Manage inventory and variants for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-bold text-slate-600 bg-white"
            >
              <option value="all">All Products</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="low_stock">Low Stock (≤)</option>
            </select>
            {stockFilter === 'low_stock' && (
              <input 
                type="number" 
                value={stockThreshold}
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                className="w-16 px-2 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-bold text-slate-600 bg-white text-center"
                min="0"
              />
            )}
          </div>

          <button onClick={handleExportCSV} className="px-4 py-2.5 bg-white text-blue-600 border-2 border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap">
            <DownloadCloud size={18} /> Export Stock CSV
          </button>

          <label className="px-4 py-2.5 bg-white text-indigo-600 border-2 border-indigo-200 font-bold rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap cursor-pointer">
            <UploadCloud size={18} /> Bulk Update Stock
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={loading} />
          </label>

          <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2.5 bg-white text-[#76b900] border-2 border-[#76b900] font-bold rounded-xl hover:bg-green-50 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap">
            <DownloadCloud size={18} /> Import Catalog
          </button>
          
          <button onClick={() => setIsFormOpen(true)} className="px-6 py-2.5 bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white font-bold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2 whitespace-nowrap">
            <span className="text-xl leading-none">+</span> Add Product
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {status}
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-sm">
          <div className="col-span-4">Product Name</div><div className="col-span-2">Category</div><div className="col-span-2">Price</div><div className="col-span-2">Stock</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No products found. Add your first product above!</div>
        ) : displayedProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No products match the selected filter.</div>
        ) : (
          displayedProducts.map(p => (
            <div key={p._id} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 items-center hover:bg-slate-50 transition">
              <div className="col-span-4">
                <div className="font-semibold text-slate-800">{p.name}</div>
              </div>
              <div className="col-span-2 text-slate-600 text-sm font-medium">
                {categories.find(c => c._id === p.category)?.name || <span className="text-slate-400 italic">None</span>}
              </div>
              <div className="col-span-2 text-green-600 font-bold">₹{p.basePrice || p.price || (p.variants?.length > 0 ? p.variants[0].price : 0)}</div>
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
                      {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
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

    {/* Import Default Products Modal */}
    {isImportModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><DownloadCloud className="text-[#76b900]" /> Import Default Catalog</h3>
            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>

          <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Catalog to Preview:</label>
                <select value={importStoreType} onChange={(e) => setImportStoreType(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white font-medium text-slate-700 shadow-sm">
                  <option value="kirana">Kirana / Grocery</option>
                  <option value="vegetable">Vegetables & Fruits</option>
                  <option value="nasta">Nasta / Snacks Corner</option>
                  <option value="restaurant">Restaurant / Cafe</option>
                  <option value="clothes">Clothing & Apparel</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Catalog:</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white font-medium text-slate-700 shadow-sm"
                />
              </div>
            </div>

            {loadingDefaults ? (
              <div className="py-20 text-center text-slate-500 font-bold animate-pulse">Loading preview catalog...</div>
            ) : defaultProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white font-medium">No default products found for this category.</div>
            ) : filteredDefaultProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white font-medium">No products match your search.</div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-500 font-semibold">Showing {filteredDefaultProducts.length} products. Select the ones you want to import.</p>
                  <button type="button" onClick={toggleAllDefaultProducts} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    {filteredDefaultProducts.length > 0 && filteredDefaultProducts.every(p => selectedDefaultProducts.includes(p._id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDefaultProducts.map(p => {
                    const isSelected = selectedDefaultProducts.includes(p._id);
                    return (
                    <div key={p._id} onClick={() => toggleDefaultProductSelection(p._id)} className={`bg-white p-4 rounded-xl border relative cursor-pointer shadow-sm flex flex-col gap-2 transition-all ${isSelected ? 'border-[#76b900] ring-2 ring-green-100' : 'border-slate-200 hover:border-[#76b900] opacity-75 hover:opacity-100'}`}>
                      <div className="absolute top-2 right-2 z-10"><input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 rounded text-[#76b900] cursor-pointer" /></div>
                      <div className={`h-24 w-full rounded-lg flex items-center justify-center overflow-hidden transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 bg-slate-100'}`}>
                        {p.images && p.images[0] ? <img src={p.images[0]} alt={p.name} className={`w-full h-full object-cover ${isSelected ? '' : 'grayscale'}`} /> : <span className="text-slate-400 text-xs">No Image</span>}
                      </div>
                      <div className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} title={p.name}>{p.name}</div>
                      <div className={`font-bold text-sm transition-colors ${isSelected ? 'text-[#76b900]' : 'text-slate-400'}`}>₹{p.basePrice}/{p.unitType}</div>
                    </div>
                  )})}
                </div>
              </>
            )}
          </div>

          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0">
            <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleImportDefaultProducts} disabled={importing || selectedDefaultProducts.length === 0} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2">
              {importing ? 'Importing...' : `Import ${selectedDefaultProducts.length} Products`}
            </button>
          </div>
        </div>
      </div>
    )}
    </AdminLayout>
  );
};

export default ManageProduct;