import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';                                                                                             
import { DownloadCloud, UploadCloud, Lock, Edit3, Save, Move, Expand } from 'lucide-react';

const ManageProduct = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [offerCategories, setOfferCategories] = useState([]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Progress Tracking States
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  // Default Product Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStoreType, setImportStoreType] = useState('');
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [selectedDefaultProducts, setSelectedDefaultProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideImported, setHideImported] = useState(true);
  const [stockFilter, setStockFilter] = useState('all');
  const [stockThreshold, setStockThreshold] = useState(5);
  const [plans, setPlans] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState([]);
  
  // Bulk Edit States
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  
  // Customizable Area Editor States
  const areaContainerRef = useRef(null);
  const [interaction, setInteraction] = useState({ type: null, startX: 0, startY: 0, initialRect: null });

  const initialForm = {
    name: '', description: '', category: '', foodtype: '', unitType: 'piece',
    brand: '', subCategory: '', discount: '', isActive: true,
    basePrice: '', totalStock: '', images: [], variants: [], isCustomizable: false, allowCustomText: false,
    customizableArea: { x: 25, y: 30, width: 50, height: 40 },
    variantType: 'option',
    keyFeaturesEnabled: false, specificationsEnabled: false, keyFeatures: [''], specifications: [{ name: '', value: '' }],
    subCategories: [],
    offerCategories: []
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

  // --- Customizable Area Handlers ---
  const handleInteractionStart = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (!areaContainerRef.current) return;

    const containerRect = areaContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setInteraction({
        type,
        startX: clientX,
        startY: clientY,
        initialRect: { ...formData.customizableArea },
        containerRect,
    });
  };

  const handleInteractionMove = (e) => {
      if (!interaction.type) return;
      
      const { type, startX, startY, initialRect, containerRect } = interaction;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;

      const dxPercent = (dx / containerRect.width) * 100;
      const dyPercent = (dy / containerRect.height) * 100;

      let newArea = { ...formData.customizableArea };

      if (type === 'drag') {
          newArea.x = Math.max(0, Math.min(100 - initialRect.width, initialRect.x + dxPercent));
          newArea.y = Math.max(0, Math.min(100 - initialRect.height, initialRect.y + dyPercent));
      } else if (type === 'resize') {
          newArea.width = Math.max(10, Math.min(100 - initialRect.x, initialRect.width + dxPercent));
          newArea.height = Math.max(10, Math.min(100 - initialRect.y, initialRect.height + dyPercent));
      }

      setFormData(prev => ({ ...prev, customizableArea: newArea }));
  };

  const handleInteractionEnd = () => {
      setInteraction({ type: null, startX: 0, startY: 0, initialRect: null });
  };

  useEffect(() => {
      const moveHandler = (e) => handleInteractionMove(e);
      const endHandler = () => handleInteractionEnd();

      if (interaction.type) {
          window.addEventListener('mousemove', moveHandler);
          window.addEventListener('mouseup', endHandler);
          window.addEventListener('touchmove', moveHandler);
          window.addEventListener('touchend', endHandler);
      }

      return () => {
          window.removeEventListener('mousemove', moveHandler);
          window.removeEventListener('mouseup', endHandler);
          window.removeEventListener('touchmove', moveHandler);
          window.removeEventListener('touchend', endHandler);
      };
  }, [interaction]);

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

  const fetchSubCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/subcategories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSubCategories(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
    }
  };

  const fetchOfferCategories = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/offercategories?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setOfferCategories(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch offer categories:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchProducts();
      fetchCategories();
      fetchSubCategories();
      fetchOfferCategories();
    }
  }, [currentStore._id]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans`);
        if (response.ok) {
          setPlans(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      }
    };
    fetchPlans();
  }, [API_BASE_URL]);

  useEffect(() => {
    const fetchStoreTypes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/store-types/active`);
        if (response.ok) {
          const data = await response.json();
          setStoreTypesList(data);
          if (data.length > 0 && (!importStoreType || importStoreType === 'kirana')) {
            setImportStoreType(data[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to load store types", err);
      }
    };
    fetchStoreTypes();
  }, [API_BASE_URL]);

  // Fetch default products when modal opens or store type changes
  useEffect(() => {
    if (isImportModalOpen && currentStore._id) {
      const fetchDefaultProducts = async () => {
        setLoadingDefaults(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/default-products?storeType=${importStoreType}&limit=10000`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setDefaultProducts(data.data || []);
            
            const importedIds = products
              .filter(p => p.source === 'default' && p.defaultProductId)
              .map(p => p.defaultProductId);
              
            const unimportedIds = (data.data || [])
              .filter(p => !importedIds.includes(p._id))
              .map(p => p._id);
              
            setSelectedDefaultProducts(unimportedIds);
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
  }, [isImportModalOpen, importStoreType, currentStore._id, API_BASE_URL, token, products]);

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
          basePrice: formData.basePrice !== '' ? Number(formData.basePrice) : 0,
          totalStock: formData.totalStock !== '' ? Number(formData.totalStock) : 0,
          price: formData.basePrice !== '' ? Number(formData.basePrice) : 0,
          stock: formData.totalStock !== '' ? Number(formData.totalStock) : 0,
          discount: formData.discount !== '' ? Number(formData.discount) : 0,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
          customizableArea: formData.customizableArea,
          isCustomizable: formData.isCustomizable || false,
          allowCustomText: formData.allowCustomText || false,
          storeId: currentStore._id, // Explicitly bind product to this store
          keyFeatures: (formData.keyFeatures || []).map(f => f.trim()).filter(Boolean),
          specifications: (formData.specifications || []).map(s => ({ name: s.name.trim(), value: s.value.trim() })).filter(s => s.name && s.value)
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
      foodtype: product.foodtype || '',
      unitType: product.unitType || 'piece',
      brand: product.Brand || product.brand || '',
      subCategory: product.subCategory || '',
      discount: product.discount !== undefined ? product.discount : '',
      isActive: product.isActive !== false,
      basePrice: product.basePrice || product.price || '',
      totalStock: product.totalStock !== undefined ? product.totalStock : (product.stock || ''),
      images: product.images || [],
      variants: product.variants || [],
      isCustomizable: product.isCustomizable || false,
      allowCustomText: product.allowCustomText || false,
      customizableArea: product.customizableArea || { x: 25, y: 30, width: 50, height: 40 },
      variantType: product.variantType || 'option',
      keyFeaturesEnabled: product.keyFeaturesEnabled || false,
      specificationsEnabled: product.specificationsEnabled || false,
      keyFeatures: product.keyFeatures && product.keyFeatures.length > 0 ? product.keyFeatures : [''],
      specifications: product.specifications && product.specifications.length > 0 ? product.specifications : [{ name: '', value: '' }],
      subCategories: product.subCategories || [],
      offerCategories: product.offerCategories || []
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

  const handleToggleActive = async (product) => {
    try {
      const newStatus = product.isActive === false ? true : false;
      const response = await fetch(`${API_BASE_URL}/api/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (response.ok) {
        setStatus(`Product status updated to ${newStatus ? 'Active' : 'Inactive'}`);
        fetchProducts();
        setTimeout(() => setStatus(''), 3000);
      } else {
        const data = await response.json();
        setStatus(`Error updating status: ${data.message || 'Failed'}`);
      }
    } catch (err) {
      setStatus(`Error updating status: ${err.message}`);
    }
  };


  const toggleDefaultProductSelection = (id) => {
    setSelectedDefaultProducts(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const importedProductIds = products
    .filter(p => p.source === 'default' && p.defaultProductId)
    .map(p => p.defaultProductId);

  const filteredDefaultProducts = defaultProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isImported = importedProductIds.includes(p._id);
    if (hideImported && isImported) return false;
    return matchesSearch;
  });

  const toggleAllDefaultProducts = () => {
    const filteredIds = filteredDefaultProducts
      .filter(p => !importedProductIds.includes(p._id))
      .map(p => p._id);
      
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedDefaultProducts.includes(id));

    if (allFilteredSelected) {
      setSelectedDefaultProducts(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelections = new Set([...selectedDefaultProducts, ...filteredIds]);
      setSelectedDefaultProducts(Array.from(newSelections));
    }
  };

  const handleBulkEditChange = (id, field, value) => {
    setBulkEdits(prev => {
      const product = products.find(p => p._id === id);
      return {
        ...prev,
        [id]: {
          ...(prev[id] || { 
            basePrice: product.basePrice || product.price || 0, 
            totalStock: product.totalStock !== undefined ? product.totalStock : (product.stock || 0) 
          }),
          [field]: Number(value)
        }
      };
    });
  };

  const handleSaveBulkEdits = async () => {
    if (Object.keys(bulkEdits).length === 0) return setIsBulkEditing(false);
    
    setBulkSaving(true);
    setStatus('Saving bulk updates...');
    
    try {
      const updatePromises = Object.keys(bulkEdits).map(id => {
        const originalProduct = products.find(p => p._id === id);
        const updatedData = bulkEdits[id];
        const payload = { ...originalProduct, basePrice: updatedData.basePrice, price: updatedData.basePrice, totalStock: updatedData.totalStock, stock: updatedData.totalStock };
        return fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      });

      await Promise.all(updatePromises);
      setStatus('✅ Quick edits saved successfully!');
      setBulkEdits({});
      setIsBulkEditing(false);
      fetchProducts();
    } catch (err) {
      setStatus('❌ Error saving bulk updates.');
    } finally {
      setBulkSaving(false);
      setTimeout(() => setStatus(''), 4000);
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
    uploadData.append('type', 'product');
    files.forEach(file => uploadData.append('images', file));

    setUploadingProductImage(true);
    setStatus('Uploading and converting images...');
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
          setFormData(prev => ({ ...prev, images: [...prev.images, ...data.urls] }));
          setStatus('Images uploaded successfully!');
        } else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: 'Upload Failed' }; }
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
      setUploadingProductImage(false);
      setActiveXhr(null);
      if (e.target) e.target.value = '';
    };

    xhr.onerror = () => {
      setStatus('Upload Error: Network failure');
      setUploadingProductImage(false);
      setActiveXhr(null);
      if (e.target) e.target.value = '';
    };

    xhr.onabort = () => {
      setStatus('Upload canceled.');
      setUploadingProductImage(false);
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
      // Lower the requirement to 5 columns in case 'AddStock' is deleted or omitted in Excel
      const dataRows = rows.slice(1).filter(r => r.length >= 5); // Skip header

      const updatesByProduct = {};

      dataRows.forEach(row => {
        const [pId, vIdRaw, pName, vName, currentStockStr, addStockStr] = row;
        const vId = vIdRaw ? vIdRaw.trim() : "";
        const hasVariant = vId !== "" && vId !== "null" && vId !== "undefined";
        
        const originalProduct = products.find(p => p._id === pId);
        if (!originalProduct) return;

        let actualDbStock = 0;
        if (hasVariant) {
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
          if (hasVariant) {
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
         } else {
           updatedProduct.totalStock = Number(updatedProduct.totalStock) || 0;
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

  // Check if the current plan limits have been reached
  const activePlan = plans.find(p => p._id === currentStore.planId) || plans.find(p => p.price === 0) || {};
  const maxProducts = activePlan?.features?.maxProducts || 0;
  const isLimitReached = maxProducts > 0 && products.length >= maxProducts;

  const storeTypeName = currentStore.storeType || currentStore.category || '';
  const currentStoreTypeObj = storeTypesList.find(st => st.name === storeTypeName);
  const canCustomize = 
    storeTypeName.toLowerCase().includes('print') || 
    storeTypeName.toLowerCase().includes('gift') || 
    storeTypeName.toLowerCase().includes('custom') || 
    currentStoreTypeObj?.features?.some(f => f.toLowerCase().includes('print') || f.toLowerCase().includes('custom') || f.toLowerCase().includes('gift'));

  const isNastaCorner = storeTypeName.toLowerCase() === 'nasta corner';

  const lowercaseStoreType = storeTypeName.toLowerCase();
  const canImportCatalog = 
    lowercaseStoreType === 'kirana' ||
    lowercaseStoreType.includes('vegetable') ||
    lowercaseStoreType.includes('fruit') ||
    lowercaseStoreType.includes('nasta corner') ||
    lowercaseStoreType.includes('nsta corner') ||
    lowercaseStoreType.includes('mobile & computer') ||
    lowercaseStoreType.includes('mobile') ||
    lowercaseStoreType.includes('computer') ||
    lowercaseStoreType.includes('accessories') ||
    lowercaseStoreType.includes('asscerois') ||
    lowercaseStoreType.includes('restaurant') ||
    lowercaseStoreType.includes('resturant');

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Products">
      <style>{`
        .floating-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          background-color: transparent;
          transition: all 0.2s ease-out;
          pointer-events: none;
          color: #94a3b8;
          font-size: 0.875rem;
          padding: 0 4px;
        }
        .floating-textarea ~ .floating-label {
          top: 24px;
          transform: translateY(-50%);
        }
        .floating-input:focus ~ .floating-label,
        .floating-input:not(:placeholder-shown) ~ .floating-label,
        .floating-input.has-value ~ .floating-label,
        .floating-textarea:focus ~ .floating-label,
        .floating-textarea:not(:placeholder-shown) ~ .floating-label {
          top: 0px;
          transform: translateY(-50%) scale(0.85);
          color: #76b900;
          background-color: #ffffff;
          font-weight: 600;
        }
        .floating-input:focus,
        .floating-textarea:focus {
          border-color: #76b900 !important;
          box-shadow: 0 0 0 1px #76b900;
        }
      `}</style>
    <div className="w-full px-6 py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 col-span-2 md:col-span-auto w-full md:w-auto">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-bold text-slate-600 bg-white h-11"
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
                className="w-16 px-2 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-bold text-slate-600 bg-white text-center h-11"
                min="0"
              />
            )}
          </div>

          <button onClick={handleExportCSV} className="w-full md:w-auto px-4 py-2.5 bg-white text-blue-600 border-2 border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm h-11 whitespace-nowrap">
            <DownloadCloud size={18} /> Export Stock CSV
          </button>

          <label className="w-full md:w-auto px-4 py-2.5 bg-white text-indigo-600 border-2 border-indigo-200 font-bold rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-2 text-sm h-11 whitespace-nowrap cursor-pointer">
            <UploadCloud size={18} /> Bulk Update Stock
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={loading} />
          </label>

          <button onClick={() => { setIsBulkEditing(!isBulkEditing); setBulkEdits({}); }} className={`w-full md:w-auto px-4 py-2.5 bg-white border-2 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm h-11 whitespace-nowrap ${isBulkEditing ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
            <Edit3 size={18} /> {isBulkEditing ? 'Cancel Quick Edit' : 'Quick Edit'}
          </button>

          {canImportCatalog && (
            <button onClick={() => isLimitReached ? navigate(`/store/${storeId}/plan`) : setIsImportModalOpen(true)} className={`w-full md:w-auto px-4 py-2.5 border-2 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm h-11 whitespace-nowrap ${isLimitReached ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-[#76b900] border-[#76b900] hover:bg-green-50'}`}>
              {isLimitReached ? <Lock size={18} /> : <DownloadCloud size={18} />} {isLimitReached ? 'Upgrade to Import' : 'Import Catalog'}
            </button>
          )}
          
          <button onClick={() => isLimitReached ? navigate(`/store/${storeId}/plan`) : setIsFormOpen(true)} className={`w-full md:w-auto col-span-2 md:col-span-auto px-6 py-2.5 font-bold rounded-xl transition flex items-center justify-center gap-2 h-11 whitespace-nowrap ${isLimitReached ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : 'bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white hover:shadow-lg'}`}>
            {isLimitReached ? <><Lock size={18} /> Upgrade to Add</> : <><span className="text-xl leading-none">+</span> Add Product</>}
          </button>
        </div>

        <div className="w-full md:w-auto md:text-right">
          {maxProducts > 0 && (
            <p className={`text-sm font-bold ${isLimitReached ? 'text-red-500' : 'text-slate-500'}`}>
              Plan Limit: {products.length} / {maxProducts} Products Used
            </p>
          )}
        </div>
      </div>

      {status && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {status}
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-sm items-center">
          <div className="col-span-3">Product Name</div><div className="col-span-2">Category</div><div className="col-span-2">Price</div><div className="col-span-2">Stock</div><div className="col-span-1 text-center">Status</div>
          <div className="col-span-2 text-right flex justify-end">
            {isBulkEditing ? (
              <button onClick={handleSaveBulkEdits} disabled={bulkSaving || Object.keys(bulkEdits).length === 0} className="px-4 py-1.5 bg-[#76b900] text-white rounded-lg flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-opacity">
                <Save size={16} /> {bulkSaving ? 'Saving...' : 'Save All'}
              </button>
            ) : 'Actions'}
          </div>
        </div>
        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No products found. Add your first product above!</div>
        ) : displayedProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No products match the selected filter.</div>
        ) : (
          displayedProducts.map(p => (
            <div key={p._id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 border-b border-slate-100 items-start md:items-center hover:bg-slate-50 transition">
              
              {/* Product Info */}
              <div className="col-span-3 w-full flex items-center gap-3">
                {/* Thumbnail Image */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                  {p.images && p.images.length > 0 ? (
                    <img 
                      src={p.images[0]} 
                      alt={p.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = 'No image';
                      }}
                    />
                  ) : p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = 'No image';
                      }}
                    />
                  ) : (
                    "No image"
                  )}
                </div>
                
                {/* Name, Brand, Category */}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 text-base md:text-sm truncate" title={p.name}>{p.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.Brand && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">{p.Brand}</span>}
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded md:hidden">
                      {categories.find(c => c._id === p.category)?.name || 'Uncategorized'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category (Desktop only) */}
              <div className="col-span-2 text-slate-600 text-sm font-medium hidden md:block">
                {categories.find(c => c._id === p.category)?.name || <span className="text-slate-400 italic">None</span>}
              </div>

              {/* Price */}
              <div className="col-span-2 w-full md:w-auto flex items-center justify-between md:block">
                <span className="text-slate-400 text-xs md:hidden font-bold">Price</span>
                <div className="text-green-600 font-bold">
                  {isBulkEditing && (!p.variants || p.variants.length === 0) ? (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-xs">₹</span>
                      <input 
                        type="number" 
                        min="0"
                        className="w-24 md:w-full md:max-w-[80px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-[#76b900] text-sm text-slate-800 font-medium" 
                        value={bulkEdits[p._id]?.basePrice ?? (p.basePrice || p.price || 0)} 
                        onChange={e => handleBulkEditChange(p._id, 'basePrice', e.target.value)} 
                      />
                    </div>
                  ) : (
                    <div>
                      {p.discount > 0 ? (
                        <div className="flex flex-col items-end md:items-start">
                          <span className="line-through text-slate-400 text-xs mr-1">₹{p.basePrice}</span>
                          <div>
                            <span>₹{p.price}</span>
                            <span className="text-red-500 text-[10px] font-bold ml-1">(-{p.discount}%)</span>
                          </div>
                        </div>
                      ) : (
                        `₹${p.basePrice || p.price || (p.variants?.length > 0 ? p.variants[0].price : 0)}`
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div className="col-span-2 w-full md:w-auto flex items-center justify-between md:block">
                <span className="text-slate-400 text-xs md:hidden font-bold">Stock</span>
                <div className="text-slate-600 text-sm md:text-base font-medium">
                  {isBulkEditing && (!p.variants || p.variants.length === 0) ? (
                    <input 
                      type="number" 
                      min="0"
                      className="w-24 md:w-full md:max-w-[80px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-[#76b900] text-sm text-slate-800 font-medium" 
                      value={bulkEdits[p._id]?.totalStock ?? (p.totalStock !== undefined ? p.totalStock : (p.stock || 0))} 
                      onChange={e => handleBulkEditChange(p._id, 'totalStock', e.target.value)} 
                    />
                  ) : (
                    `${p.totalStock !== undefined ? p.totalStock : (p.stock || 0)} ${p.unitType || 'units'}`
                  )}
                  {isBulkEditing && p.variants?.length > 0 && <span className="text-[10px] font-bold text-amber-500 block leading-tight mt-1 bg-amber-50 px-2 py-0.5 rounded w-fit">Has variants</span>}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-1 w-full md:w-auto flex items-center justify-between md:block md:text-center">
                <span className="text-slate-400 text-xs md:hidden font-bold">Status</span>
                <button 
                  type="button"
                  onClick={() => handleToggleActive(p)}
                  className={`px-3 py-1 md:px-2 md:py-0.5 rounded text-[11px] md:text-[10px] font-bold transition-all ${p.isActive !== false ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                  title="Click to toggle status"
                >
                  {p.isActive !== false ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Actions */}
              <div className="col-span-2 w-full md:w-auto flex md:justify-end gap-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none justify-end">
                {!isBulkEditing && (
                  <>
                    <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition">Edit</button>
                    <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">Delete</button>
                  </>
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="relative">
                    <input required placeholder=" " value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Product Name <span className="text-red-500">*</span></label>
                  </div>
                  {isNastaCorner && (
                    <div className="relative">
                      <input required placeholder=" " value={formData.foodtype} onChange={e=>setFormData({...formData, foodtype: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                      <label className="floating-label">Food Type <span className="text-red-500">*</span></label>
                    </div>
                  )}
                  <div className="relative">
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className={`floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-white text-sm ${formData.category ? 'has-value' : ''}`}>
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <label className="floating-label">Category</label>
                  </div>
                  <div className="relative">
                    <input placeholder=" " value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Brand</label>
                  </div>
                  <div className="relative">
                    <input placeholder=" " value={formData.subCategory} onChange={e=>setFormData({...formData, subCategory: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Sub Category (Legacy)</label>
                  </div>

                  {/* Select Sub-Categories (dynamic) */}
                  {formData.category && (
                    <div className="md:col-span-2 space-y-2 border border-slate-100 p-4 rounded-xl text-left">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply Sub-categories</label>
                      {subCategories.filter(sc => (sc.category?._id || sc.category) === formData.category).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No sub-categories defined for this category. Go to Catalog Manager to add some.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {subCategories.filter(sc => (sc.category?._id || sc.category) === formData.category).map(sc => {
                            const isChecked = formData.subCategories?.includes(sc._id);
                            return (
                              <label key={sc._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${isChecked ? 'bg-green-50 border-[#76b900] text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    let newSubCats = [...(formData.subCategories || [])];
                                    if (checked) {
                                      newSubCats.push(sc._id);
                                    } else {
                                      newSubCats = newSubCats.filter(id => id !== sc._id);
                                    }
                                    setFormData({ ...formData, subCategories: newSubCats });
                                  }} 
                                  className="hidden" 
                                />
                                {sc.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Select Offer Categories */}
                  <div className="md:col-span-2 space-y-2 border border-slate-100 p-4 rounded-xl text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply Offer Categories</label>
                    {offerCategories.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No offer categories defined. Go to Catalog Manager to add some.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {offerCategories.map(oc => {
                          const isChecked = formData.offerCategories?.includes(oc._id);
                          return (
                            <label key={oc._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${isChecked ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={e => {
                                  const checked = e.target.checked;
                                  let newOfferCats = [...(formData.offerCategories || [])];
                                  if (checked) {
                                    newOfferCats.push(oc._id);
                                  } else {
                                    newOfferCats = newOfferCats.filter(id => id !== oc._id);
                                  }
                                  setFormData({ ...formData, offerCategories: newOfferCats });
                                }} 
                                className="hidden" 
                              />
                              <span style={{ backgroundColor: oc.color }} className="w-2.5 h-2.5 rounded-full inline-block mr-1"></span>
                              {oc.name}
                              <span className="text-[9px] uppercase bg-white/60 px-1 py-0.5 rounded border border-black/5 ml-1">
                                {oc.offerType === 'B1G1' ? 'B1G1' : oc.offerType === 'B2G1' ? 'B2G1' : oc.offerType === 'DISCOUNT' ? 'Discount' : 'None'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-100 mt-2 space-y-3">
                {canCustomize && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={formData.isCustomizable} onChange={e => setFormData({...formData, isCustomizable: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                      Enable Custom Image Upload for Customers (Printing/Gift items)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={formData.allowCustomText} onChange={e => setFormData({...formData, allowCustomText: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                      Enable Custom Text Input for Customers (e.g. Names, Quotes, Messages)
                    </label>
                  </>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                  Product is Active (Visible to Customers)
                </label>
              </div>
                  <div className="md:col-span-2 relative">
                    <textarea rows="3" placeholder=" " value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="floating-textarea w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none resize-none text-sm bg-white" />
                    <label className="floating-label">Description</label>
                  </div>
                </div>
              </div>

              {/* Customizable Area Editor */}
              {(formData.isCustomizable || formData.allowCustomText) && (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-lg text-slate-800">Customizable Area Setup</h4>
                    <p className="text-sm text-slate-500">Click and drag the box below to define the area on your product where the customer's image will be printed. The first product image is used as the preview.</p>
                    
                    <div ref={areaContainerRef} className="relative w-fit max-w-lg mx-auto bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden">
                        {formData.images.length > 0 ? (
                            <img src={formData.images[0]} alt="Product Preview" className="max-w-full h-auto block" />
                        ) : (
                            <div className="w-full min-w-[280px] aspect-square flex items-center justify-center text-slate-400 p-4 text-center">Upload a product image first to define the customizable area.</div>
                        )}

                        {formData.images.length > 0 && (
                            <div 
                                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 cursor-move group"
                                style={{
                                    left: `${formData.customizableArea.x}%`,
                                    top: `${formData.customizableArea.y}%`,
                                    width: `${formData.customizableArea.width}%`,
                                    height: `${formData.customizableArea.height}%`,
                                }}
                                onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                                onTouchStart={(e) => handleInteractionStart(e, 'drag')}
                            >
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Move className="text-white drop-shadow-md" />
                                </div>
                                <div 
                                    className="absolute -right-2 -bottom-2 w-5 h-5 bg-blue-600 rounded-full cursor-se-resize border-2 border-white shadow-md flex items-center justify-center" 
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                                    onTouchStart={(e) => handleInteractionStart(e, 'resize')}
                                >
                                    <Expand size={10} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              )}

              {/* Pricing & Inventory */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b border-slate-100 pb-2 text-slate-800">Pricing & Default Inventory</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 pt-2">
                  <div className="relative">
                    <input type="number" required={formData.variants.length === 0} placeholder=" " value={formData.basePrice} onChange={e=>setFormData({...formData, basePrice: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Base Price (₹) <span className="text-red-500">*</span></label>
                  </div>
                  <div className="relative">
                    <input type="number" min="0" max="100" placeholder=" " value={formData.discount} onChange={e=>setFormData({...formData, discount: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Discount (%)</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={formData.basePrice ? Math.round(Number(formData.basePrice) - (Number(formData.basePrice) * (Number(formData.discount || 0) / 100))) : ''} 
                      disabled 
                      className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-semibold" 
                    />
                    <label className="floating-label">Selling Price (₹)</label>
                  </div>
                  <div className="relative">
                    <input type="number" placeholder=" " value={formData.totalStock} onChange={e=>setFormData({...formData, totalStock: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm disabled:bg-slate-50 bg-white" disabled={formData.variants.length > 0} />
                    <label className="floating-label">Total Stock</label>
                  </div>
                  <div className="relative">
                    <select value={formData.unitType} onChange={e=>setFormData({...formData, unitType: e.target.value})} className={`floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-white text-sm ${formData.unitType ? 'has-value' : ''}`}>
                      <option value="piece">Piece</option>
                      <option value="kg">Kg</option>
                      <option value="gram">Gram</option>
                      <option value="plate">Plate</option>
                      <option value="pack">Pack</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                      <option value="liter">Liter</option>
                      <option value="ml">Ml</option>
                      <option value="dozen">Dozen</option>
                      <option value="packet">Packet</option>
                      <option value="size">Size</option>
                      <option value="set">Set</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="floating-label">Selling Unit Type</label>
                  </div>
                </div>
              </div>

              {/* Key Features & Specifications */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-6">
                <h4 className="font-bold text-lg border-b border-slate-200 pb-2 text-slate-800">Features & Specifications</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Features */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="m-keyFeaturesEnabled" 
                        checked={formData.keyFeaturesEnabled || false} 
                        onChange={e => setFormData({ ...formData, keyFeaturesEnabled: e.target.checked })} 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                      />
                      <label htmlFor="m-keyFeaturesEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">Enable Key Features</label>
                    </div>

                    {formData.keyFeaturesEnabled && (
                      <div className="space-y-2.5">
                        {formData.keyFeatures?.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={feature} 
                              onChange={e => {
                                  const newFeatures = [...(formData.keyFeatures || [])];
                                  newFeatures[fIdx] = e.target.value;
                                  setFormData({ ...formData, keyFeatures: newFeatures });
                              }} 
                              placeholder="e.g. 100% Organic Cotton" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                  setFormData({
                                      ...formData,
                                      keyFeatures: formData.keyFeatures.filter((_, idx) => idx !== fIdx)
                                  });
                              }} 
                              className="text-red-500 hover:text-red-700 text-lg font-bold p-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, keyFeatures: [...(formData.keyFeatures || []), ''] })} 
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          + Add Key Feature
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Specifications */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="m-specificationsEnabled" 
                        checked={formData.specificationsEnabled || false} 
                        onChange={e => setFormData({ ...formData, specificationsEnabled: e.target.checked })} 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                      />
                      <label htmlFor="m-specificationsEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">Enable Specifications</label>
                    </div>

                    {formData.specificationsEnabled && (
                      <div className="space-y-2.5">
                        {formData.specifications?.map((spec, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={spec.name} 
                              onChange={e => {
                                  const newSpecs = [...(formData.specifications || [])];
                                  newSpecs[sIdx].name = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                              }} 
                              placeholder="Name (e.g. Weight)" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <input 
                              type="text" 
                              value={spec.value} 
                              onChange={e => {
                                  const newSpecs = [...(formData.specifications || [])];
                                  newSpecs[sIdx].value = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                              }} 
                              placeholder="Value (e.g. 500g)" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                  setFormData({
                                      ...formData,
                                      specifications: formData.specifications.filter((_, idx) => idx !== sIdx)
                                  });
                              }} 
                              className="text-red-500 hover:text-red-700 text-lg font-bold p-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, specifications: [...(formData.specifications || []), { name: '', value: '' }] })} 
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          + Add Specification
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-lg text-slate-800">Product Images</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsMediaLibraryOpen(true); fetchMedia(); }} className="text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">View Media Library</button>
                    <label className={`cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors ${uploadingProductImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploadingProductImage ? 'Uploading...' : '+ Upload Images'}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingProductImage} />
                    </label>
                  </div>
                </div>
                
                {uploadingProductImage && (
                  <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
                    <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                      <span>Uploading Images... {uploadProgress}%</span>
                      <div className="flex items-center gap-3">
                        <span>{uploadSpeed}</span>
                        <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
                  </div>
                )}
                
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-2 gap-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-lg text-slate-800">Product Variants</h4>
                    {formData.variants.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <label className="text-xs font-bold text-slate-600">Type:</label>
                        <select 
                          value={formData.variantType || 'option'} 
                          onChange={e => setFormData({ ...formData, variantType: e.target.value })}
                          className="px-2 py-0.5 border border-slate-200 rounded text-xs font-bold text-slate-700 bg-white outline-none focus:border-[#76b900]"
                        >
                          <option value="option">Option</option>
                          <option value="size">Size</option>
                          <option value="color">Color</option>
                          <option value="flavor">Flavor</option>
                          <option value="weight">Weight</option>
                          <option value="pack">Pack</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleAddVariant} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">+ Add Variant</button>
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
                  {storeTypesList.length > 0 ? storeTypesList.map(st => (
                    <option key={st._id} value={st.name}>{st.name}</option>
                  )) : (
                    <option value="kirana">Kirana / Grocery</option>
                  )}
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

            <div className="flex items-center justify-end mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={hideImported} onChange={(e) => setHideImported(e.target.checked)} className="w-4 h-4 text-[#76b900] rounded focus:ring-[#76b900] cursor-pointer" />
                Hide already imported products
              </label>
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
                    const isImported = importedProductIds.includes(p._id);
                    const isSelected = selectedDefaultProducts.includes(p._id);
                    return (
                    <div key={p._id} onClick={() => !isImported && toggleDefaultProductSelection(p._id)} className={`bg-white p-4 rounded-xl border relative cursor-pointer shadow-sm flex flex-col gap-2 transition-all ${isSelected ? 'border-[#76b900] ring-2 ring-green-100' : isImported ? 'border-slate-200 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-[#76b900] opacity-75 hover:opacity-100'}`}>
                      <div className="absolute top-2 right-2 z-10"><input type="checkbox" disabled={isImported} checked={isSelected} readOnly className="w-5 h-5 rounded text-[#76b900] cursor-pointer disabled:opacity-50" /></div>
                      <div className={`h-24 w-full rounded-lg flex items-center justify-center overflow-hidden transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 bg-slate-100'}`}>
                        {p.images && p.images[0] ? <img src={p.images[0]} alt={p.name} className={`w-full h-full object-cover ${isSelected ? '' : 'grayscale'}`} /> : <span className="text-slate-400 text-xs">No Image</span>}
                      </div>
                      <div className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} title={p.name}>{p.name}</div>
                      <div className="flex justify-between items-center">
                        <div className={`font-bold text-sm transition-colors ${isSelected ? 'text-[#76b900]' : 'text-slate-400'}`}>₹{p.basePrice}/{p.unitType}</div>
                        {isImported && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Imported</span>}
                      </div>
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