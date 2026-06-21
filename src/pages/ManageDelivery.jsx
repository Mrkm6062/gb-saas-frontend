import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Truck, MapPin, IndianRupee, ShieldCheck, X } from 'lucide-react';

const ManageDelivery = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const [formData, setFormData] = useState({
    baseCharge: 0,
    freeShippingThreshold: 0,
    deliveryMode: 'all', // 'all', 'state', 'pincode'
    allowedStates: [],
    allowedPincodes: []
  });

  const [locationMap, setLocationMap] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState(''); // Stores the pincode value
  const [activeTab, setActiveTab] = useState('charges');
  const [pincodeSearch, setPincodeSearch] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  // Fetch state & district map
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/delivery-settings/locations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLocationMap(data);
        }
      } catch (e) {
        console.error("Failed to load locations", e);
      }
    };
    fetchLocations();
  }, [API_BASE_URL, token]);

  // Fetch offices when district changes
  useEffect(() => {
    const fetchOffices = async () => {
      if (!selectedState || !selectedDistrict) {
        setOffices([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/delivery-settings/offices?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setOffices(await res.json());
        }
      } catch (e) {
        console.error("Failed to load offices", e);
      }
    };
    fetchOffices();
  }, [selectedState, selectedDistrict, API_BASE_URL, token]);

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
    const cleaned = selectedOffice.toString().trim();
    if (cleaned && !formData.allowedPincodes.includes(cleaned)) {
      setFormData(prev => ({ ...prev, allowedPincodes: [...prev.allowedPincodes, cleaned] }));
    }
  };

  const handleAddEntireDistrict = (e) => {
    e.preventDefault();
    if (offices.length === 0) return;
    
    setFormData(prev => {
      const districtPincodes = offices.map(o => o.pincode.toString());
      const merged = Array.from(new Set([...prev.allowedPincodes, ...districtPincodes]));
      return { ...prev, allowedPincodes: merged };
    });
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

  const filteredPincodes = formData.allowedPincodes.filter(code =>
    code.toString().toLowerCase().includes(pincodeSearch.toLowerCase().trim())
  );

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Delivery">
      <div className="w-full px-6 py-10">

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {/* Tab Navigation Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('charges')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'charges'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <IndianRupee size={18} />
            Shipping Charges Setting & Rule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('areas')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'areas'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <MapPin size={18} />
            Delivery Area Setting
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Shipping Charges Tab */}
          {activeTab === 'charges' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fadeIn">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <IndianRupee size={22} className="text-[#76b900]" /> 
                Shipping Charges & Rules Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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

              {/* Shipping Rules Summary Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                  <Truck size={18} className="text-[#76b900]" />
                  Active Shipping Rule Summary
                </h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    • If cart subtotal is <span className="font-bold text-slate-800">below ₹{formData.freeShippingThreshold || 0}</span>:
                    A shipping charge of <span className="font-bold text-slate-800">₹{formData.baseCharge}</span> will be added to the order.
                  </p>
                  <p>
                    • If cart subtotal is <span className="font-bold text-slate-800">equal to or above ₹{formData.freeShippingThreshold || 0}</span>:
                    Shipping will be <span className="font-bold text-green-600">FREE</span>.
                  </p>
                  {formData.freeShippingThreshold === 0 && (
                    <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg mt-2">
                      Note: Free shipping threshold is set to 0. All orders will be charged the base charge of ₹{formData.baseCharge}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delivery Area Tab */}
          {activeTab === 'areas' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fadeIn">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <MapPin size={22} className="text-[#76b900]" /> 
                Serviceable Delivery Areas
              </h3>
              
              <div className="mb-8 max-w-md">
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Delivery Mode</label>
                <p className="text-xs text-slate-500 mb-3">Choose how you want to restrict delivery areas.</p>
                <select
                  value={formData.deliveryMode}
                  onChange={e => setFormData({...formData, deliveryMode: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-slate-800 font-bold"
                >
                  <option value="all">All over India</option>
                  <option value="state">State wise</option>
                  <option value="pincode">Pincode wise</option>
                </select>
              </div>

              {/* Mode Specific Contents */}
              {formData.deliveryMode === 'all' && (
                <div className="bg-green-50/50 border border-green-200 text-green-800 p-6 rounded-2xl flex items-center gap-4 animate-fadeIn">
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Delivery is available all over India</h4>
                    <p className="text-sm text-green-700 font-medium">Your store will accept orders from any delivery address across India. No pincode or state restrictions are active.</p>
                  </div>
                </div>
              )}

              {formData.deliveryMode === 'state' && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <p className="text-sm font-bold text-slate-700">Select Allowed States ({formData.allowedStates.length} selected)</p>
                    <div className="flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, allowedStates: locationMap.map(l => l.stateName) }))} 
                        className="text-xs font-bold text-[#76b900] hover:underline"
                      >
                        Enable All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, allowedStates: [] }))} 
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {locationMap.length > 0 ? locationMap.map(loc => {
                      const isEnabled = formData.allowedStates.includes(loc.stateName);
                      return (
                        <div key={loc.stateName} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition">
                          <span className="text-sm font-bold text-slate-700 truncate mr-2" title={loc.stateName}>{loc.stateName}</span>
                          
                          {/* Custom Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleStateToggle(loc.stateName)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-[#76b900]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-slate-500 col-span-full text-center py-4">Loading states from database...</p>
                    )}
                  </div>
                </div>
              )}

              {formData.deliveryMode === 'pincode' && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fadeIn">
                  <p className="text-sm font-bold text-slate-700 mb-4">Manage Allowed Pincodes ({formData.allowedPincodes.length} selected)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(''); setSelectedOffice(''); }} className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#76b900] text-sm">
                      <option value="">Select State</option>
                      {locationMap.map(loc => (
                        <option key={loc.stateName} value={loc.stateName}>{loc.stateName}</option>
                      ))}
                    </select>
                    
                    <select value={selectedDistrict} onChange={e => { setSelectedDistrict(e.target.value); setSelectedOffice(''); }} disabled={!selectedState} className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#76b900] text-sm disabled:opacity-50">
                      <option value="">Select District</option>
                      {locationMap.find(loc => loc.stateName === selectedState)?.districts.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>

                    <select value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)} disabled={!selectedDistrict || offices.length === 0} className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#76b900] text-sm disabled:opacity-50">
                      <option value="">Select Office / Pincode</option>
                      {offices.map(off => (
                        <option key={off._id} value={off.pincode}>{off.officeName} ({off.pincode})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 mb-6 border-b border-slate-200 pb-6">
                    <button type="button" onClick={handleAddEntireDistrict} disabled={!selectedDistrict || offices.length === 0} className="px-6 py-2 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition disabled:opacity-50 whitespace-nowrap">Add Entire District</button>
                    <button type="button" onClick={handleAddPincode} disabled={!selectedOffice} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 whitespace-nowrap">Add Pincode</button>
                  </div>

                  {/* Pincode Allowed List & Search */}
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <p className="text-sm font-bold text-slate-700">Allowed Pincodes List</p>
                      
                      {formData.allowedPincodes.length > 0 && (
                        <div className="w-full sm:w-64 relative">
                          <input 
                            type="text" 
                            placeholder="Search allowed pincodes..."
                            value={pincodeSearch}
                            onChange={e => setPincodeSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#76b900] text-sm"
                          />
                          {pincodeSearch && (
                            <button 
                              type="button" 
                              onClick={() => setPincodeSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {filteredPincodes.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-white rounded-xl border border-slate-200 shadow-inner custom-scrollbar">
                        {filteredPincodes.map(code => (
                          <div key={code} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm font-mono text-sm font-bold text-[#76b900]">
                            {code}
                            <button type="button" onClick={() => handleRemovePincode(code)} className="text-red-400 hover:text-red-600 focus:outline-none"><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        {pincodeSearch ? (
                          <p className="text-sm text-slate-500 italic">No matching pincodes found for "{pincodeSearch}".</p>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No pincodes added yet. Your store will not accept any orders until you add at least one pincode.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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