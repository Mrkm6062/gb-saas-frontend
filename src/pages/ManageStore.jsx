import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ManageStore = ({ token, onLogout, stores }) => {
  const { storeId } = useParams();
  const navigate = useNavigate();

  // Find the specific store the user clicked on
  const store = stores.find(s => s.storeId === storeId) || { storeName: 'Loading...' };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full flex flex-col text-left">
      <nav className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[#76b900] font-bold hover:underline flex items-center gap-1">
            &larr; Back to Dashboard
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <span className="text-xl font-bold text-slate-800">Managing: {store.storeName}</span>
        </div>
        <button onClick={onLogout} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition duration-200">
          Logout
        </button>
      </nav>
      
      <main className="max-w-7xl mx-auto w-full px-6 py-10 flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Store Management</h2>
          <p className="text-slate-600 mb-8">Welcome to the management panel for <strong>{store.storeName}</strong> ({storeId}).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-green-50 rounded-xl border border-green-100 shadow-sm flex flex-col items-start">
              <h3 className="text-xl font-bold text-green-800 mb-2">Products</h3>
              <p className="text-sm text-green-700 mb-6">Add, update, or remove products from your catalog.</p>
              <button className="mt-auto px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition">Manage Products</button>
            </div>
            
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex flex-col items-start">
              <h3 className="text-xl font-bold text-blue-800 mb-2">Orders</h3>
              <p className="text-sm text-blue-700 mb-6">View and process incoming orders from customers.</p>
              <button className="mt-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">View Orders</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageStore;