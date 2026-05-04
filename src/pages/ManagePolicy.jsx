import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const ManagePolicy = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [policies, setPolicies] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchPolicies = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPolicies(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchPolicies();
    }
  }, [currentStore._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');

    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/policies/${editingId}` : `/api/policies`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          description, 
          storeId: currentStore._id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(editingId ? 'Policy updated successfully!' : 'Policy added successfully!');
        setTitle('');
        setDescription('');
        setEditingId(null);
        fetchPolicies(); // Refresh the list
      } else {
        setStatus(`Error: ${data.message || 'Failed to save policy'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy) => {
    setTitle(policy.title);
    setDescription(policy.description);
    setEditingId(policy._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setStatus('Policy deleted successfully');
        fetchPolicies();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to delete'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Policies">
      <div className="p-6 mx-auto mt-6">
        {/* <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Store Policies</h2>
        <p className="text-slate-500 mb-8">Manage Terms, Conditions, and Refunds for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p> */}

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit Policy' : 'Create New Policy'}</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="e.g. Return & Refund Policy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows="6" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none" placeholder="Enter policy details here..." />
            </div>
            <div className="flex gap-2 mt-2">
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition">
                {editingId ? 'Update Policy' : 'Save Policy'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setTitle(''); setDescription(''); }} className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition">Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {policies.length === 0 ? (<div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">No policies found. Add your first policy above!</div>) : (
            policies.map(p => (<div key={p._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg text-slate-800">{p.title}</h4><div className="flex gap-3"><button onClick={() => handleEdit(p)} className="text-sm font-bold text-blue-500 hover:text-blue-700 transition">Edit</button><button onClick={() => handleDelete(p._id)} className="text-sm font-bold text-red-500 hover:text-red-700 transition">Delete</button></div></div><p className="text-xs text-slate-400 mb-4 font-mono">Last updated: {new Date(p.updatedAt).toLocaleString()}</p><p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{p.description}</p></div>))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagePolicy;