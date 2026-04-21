import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const ManageProduct = ({ token, stores }) => {
  const { storeId } = useParams(); 
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchProducts = async () => {
    try {
      // Pass storeId context to the backend
      const response = await fetch(`${API_BASE_URL}/api/products?storeId=${currentStore._id || storeId}`, {
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
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

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
          name, 
          price: Number(price), 
          stock: Number(stock), 
          storeId: currentStore._id // Explicitly bind product to this store
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(editingId ? 'Product updated successfully!' : 'Product added successfully!');
        setName('');
        setPrice('');
        setStock('');
        setEditingId(null);
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
    setName(product.name);
    setPrice(product.price);
    setStock(product.stock || 0);
    setEditingId(product._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="p-6 max-w-5xl mx-auto mt-6">
      <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Product Management</h2>
      <p className="text-slate-500 mb-8">Manage inventory for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>

      {status && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {status}
        </div>
      )}

      {/* Product Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. 1kg Onions" />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (₹)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. 40" />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Qty</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required min="0" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. 100" />
          </div>
          <div className="w-full md:w-auto flex gap-2">
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition whitespace-nowrap">
              {editingId ? 'Update' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setName(''); setPrice(''); setStock(''); }} className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-sm">
          <div className="col-span-5">Product Name</div><div className="col-span-3">Price</div><div className="col-span-2">Stock</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {products.length === 0 ? (<div className="p-8 text-center text-slate-500 font-medium">No products found. Add your first product above!</div>) : (
          products.map(p => (<div key={p._id} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 items-center hover:bg-slate-50 transition"><div className="col-span-5 font-semibold text-slate-800">{p.name}</div><div className="col-span-3 text-green-600 font-bold">₹{p.price}</div><div className="col-span-2 text-slate-600">{p.stock} units</div><div className="col-span-2 text-right flex justify-end gap-2"><button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition">Edit</button><button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">Delete</button></div></div>))
        )}
      </div>
    </div>
  );
};

export default ManageProduct;