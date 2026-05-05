import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Truck, MapPin, IndianRupee, ShieldCheck, X } from 'lucide-react';

const ManageDelivery = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const [formData, setFormData] = useState({
    baseCharge: 0,
    freeShippingThreshold: 0,
    deliveryMode: 'all', // 'all', 'state', 'pincode'
    allowedStates: [],
    allowedPincodes: []
  });

  const [pincodeInput, setPincodeInput] = useState('');
  
  // Standard list of Indian States & UTs
  const [availableStates] = useState([
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
    "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchDeliverySettings = async () => {
      if (!currentStore._id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/delivery-settings?storeId=${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data._id) {
            setFormData({
              baseCharge: data.baseCharge || 0,
              freeShippingThreshold: data.freeShippingThreshold || 0,
              deliveryMode: data.deliveryMode || 'all',
              allowedStates: data.allowedStates || [],
              allowedPincodes: data.allowedPincodes || []
            });
          }
        }
      } catch (err) {
        console.error("Failed to load delivery settings", err);
      }
    };

    fetchDeliverySettings();
  }, [currentStore._id, token, API_BASE_URL]);

  const handleStateToggle = (stateName) => {
    setFormData(prev => {
      const newStates = prev.allowedStates.includes(stateName)
        ? prev.allowedStates.filter(s => s !== stateName)
        : [...prev.allowedStates, stateName];
      return { ...prev, allowedStates: newStates };
    });
  };

  const handleAddPincode = (e) => {
    e.preventDefault();
    const cleaned = pincodeInput.trim();
    if (cleaned && !formData.allowedPincodes.includes(cleaned)) {
      setFormData(prev => ({ ...prev, allowedPincodes: [...prev.allowedPincodes, cleaned] }));
    }
    setPincodeInput('');
  };

  const handleRemovePincode = (code) => {
    setFormData(prev => ({ ...prev, allowedPincodes: prev.allowedPincodes.filter(p => p !== code) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, storeId: currentStore._id })
      });

      if (response.ok) {
        setStatus('Delivery settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to save'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Delivery">
      <div className="w-full px-6 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3"><Truck className="text-[#76b900]" /> Delivery Settings</h2>
            <p className="text-slate-500">Configure shipping zones and delivery charges for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
          </div>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Shipping Charges */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4"><IndianRupee size={22} className="text-slate-400" /> Shipping Charges</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Base Shipping Charge (₹)</label>
                <p className="text-xs text-slate-500 mb-3">Default delivery fee applied to all orders.</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.baseCharge} 
                    onChange={e => setFormData({...formData, baseCharge: Number(e.target.value)})} 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-lg font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Free Shipping Threshold (₹)</label>
                <p className="text-xs text-slate-500 mb-3">Provide free delivery for orders above this amount. (Set to 0 to disable)</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.freeShippingThreshold} 
                    onChange={e => setFormData({...formData, freeShippingThreshold: Number(e.target.value)})} 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-lg font-bold text-slate-800" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Serviceable Areas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4"><MapPin size={22} className="text-slate-400" /> Serviceable Areas</h3>
            
            <div className="space-y-4 mb-8">
              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.deliveryMode === 'all' ? 'border-[#76b900] bg-green-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                <input type="radio" name="deliveryMode" value="all" checked={formData.deliveryMode === 'all'} onChange={() => setFormData({...formData, deliveryMode: 'all'})} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900]" />
                <div>
                  <p className="font-bold text-slate-800">All over India</p>
                  <p className="text-sm text-slate-500">Accept orders from any pincode across the country.</p>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.deliveryMode === 'state' ? 'border-[#76b900] bg-green-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                <input type="radio" name="deliveryMode" value="state" checked={formData.deliveryMode === 'state'} onChange={() => setFormData({...formData, deliveryMode: 'state'})} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900]" />
                <div>
                  <p className="font-bold text-slate-800">Specific States</p>
                  <p className="text-sm text-slate-500">Only accept orders from selected states.</p>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.deliveryMode === 'pincode' ? 'border-[#76b900] bg-green-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                <input type="radio" name="deliveryMode" value="pincode" checked={formData.deliveryMode === 'pincode'} onChange={() => setFormData({...formData, deliveryMode: 'pincode'})} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900]" />
                <div>
                  <p className="font-bold text-slate-800">Specific Pincodes (Hyperlocal)</p>
                  <p className="text-sm text-slate-500">Restrict deliveries to a custom list of local pincodes.</p>
                </div>
              </label>
            </div>

            {formData.deliveryMode === 'state' && (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fadeIn">
                <p className="text-sm font-bold text-slate-700 mb-4">Select Allowed States ({formData.allowedStates.length} selected)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableStates.map(state => (
                    <label key={state} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={formData.allowedStates.includes(state)} onChange={() => handleStateToggle(state)} className="w-4 h-4 rounded text-[#76b900] focus:ring-[#76b900]" />
                      <span className="truncate">{state}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.deliveryMode === 'pincode' && (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fadeIn">
                <p className="text-sm font-bold text-slate-700 mb-4">Allowed Pincodes ({formData.allowedPincodes.length} selected)</p>
                <div className="flex gap-3 mb-6">
                  <input type="text" value={pincodeInput} onChange={(e) => setPincodeInput(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter 6-digit Pincode" maxLength="6" className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#76b900] font-medium" />
                  <button type="button" onClick={handleAddPincode} disabled={pincodeInput.length !== 6} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 whitespace-nowrap">Add Pincode</button>
                </div>
                {formData.allowedPincodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.allowedPincodes.map(code => (
                      <div key={code} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm font-mono text-sm font-bold text-slate-700">
                        {code}
                        <button type="button" onClick={() => handleRemovePincode(code)} className="text-red-400 hover:text-red-600 focus:outline-none"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">No pincodes added yet. Your store will not accept any orders until you add at least one pincode.</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button type="submit" disabled={loading} className="px-8 py-3 bg-[#76b900] text-white font-bold text-lg rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2">
              <ShieldCheck size={20} />
              {loading ? 'Saving...' : 'Save Delivery Settings'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default ManageDelivery;