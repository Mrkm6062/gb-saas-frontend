import { API_BASE_URL } from '../api';
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
  const [activeTab, setActiveTab] = useState('list');
  const [viewPolicy, setViewPolicy] = useState(null);

  

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
        setActiveTab('list');
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
    setActiveTab('form');
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

        {/* Navigation Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <button 
            type="button"
            onClick={() => { setActiveTab('list'); setEditingId(null); setTitle(''); setDescription(''); }} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'list' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            All Policies
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('form')} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'form' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {editingId ? 'Edit Policy' : '+ Add New Policy'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {activeTab === 'form' && (
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fadeIn">
              <h3 className="text-xl font-bold mb-4 text-slate-800">{editingId ? 'Edit Policy' : 'Create New Policy'}</h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition" placeholder="e.g. Return & Refund Policy" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows="8" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition resize-none" placeholder="Enter policy details here..." />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={loading} className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-md">
                    {editingId ? 'Update Policy' : 'Save Policy'}
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setTitle(''); setDescription(''); setActiveTab('list'); }} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="grid grid-cols-1 gap-4 animate-fadeIn">
              {policies.length === 0 ? (<div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">No policies found. Click "+ Add New Policy" to get started!</div>) : (
                policies.map(p => (<div key={p._id} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg text-slate-800">{p.title}</h4><div className="flex gap-2"><button onClick={() => setViewPolicy(p)} className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">View</button><button onClick={() => handleEdit(p)} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Edit</button><button onClick={() => handleDelete(p._id)} className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Delete</button></div></div><p className="text-xs text-slate-400 font-mono">Last updated: {new Date(p.updatedAt).toLocaleString()}</p></div>))
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Policy Modal */}
      {viewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{viewPolicy.title}</h3>
              <button onClick={() => setViewPolicy(null)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-xs text-slate-400 mb-4 font-mono">Last updated: {new Date(viewPolicy.updatedAt).toLocaleString()}</p>
              <div className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">
                {viewPolicy.description}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setViewPolicy(null)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManagePolicy;