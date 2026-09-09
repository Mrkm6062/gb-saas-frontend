import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Truck, MapPin, IndianRupee, ShieldCheck, X, Plus, Trash2, Edit2, CheckCircle, Search, Filter } from 'lucide-react';

const LOCATION_TYPES = [
  { value: 'state', label: 'State' },
  { value: 'district', label: 'District' },
  { value: 'pincode', label: 'Pincode' },
  { value: 'postOffice', label: 'Post Office' },
  { value: 'village', label: 'Village' },
  { value: 'building', label: 'Building' },
  { value: 'chawl', label: 'Chawl / Local Community' },
];

const ManageDelivery = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('charges');

  const [formData, setFormData] = useState({
    baseCharge: 0,
    freeShippingThreshold: 0,
    deliveryMode: 'all', // 'all', 'state', 'district', 'pincode', 'postOffice', 'locality'
    allowedStates: [],
    allowedPincodes: [],
    deliveryLocations: []
  });

  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [locationMap, setLocationMap] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [areaFilterType, setAreaFilterType] = useState('all');

  // Form for adding custom location/area
  const [newLocation, setNewLocation] = useState({
    type: 'pincode',
    name: '',
    state: '',
    district: '',
    postOffice: '',
    pincode: '',
    charge: 0,
    enabled: true
  });

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

  // Fetch main delivery settings & delivery areas
  const fetchDeliverySettingsAndAreas = async () => {
    if (!currentStore._id) return;
    try {
      const [settingsRes, areasRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery-settings?storeId=${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/delivery-settings/areas?storeId=${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data && data._id) {
          setFormData({
            baseCharge: data.baseCharge || 0,
            freeShippingThreshold: data.freeShippingThreshold || 0,
            deliveryMode: data.deliveryMode || 'all',
            allowedStates: data.allowedStates || [],
            allowedPincodes: data.allowedPincodes || [],
            deliveryLocations: data.deliveryLocations || []
          });
        }
      }

      if (areasRes.ok) {
        setDeliveryAreas(await areasRes.json());
      }
    } catch (err) {
      console.error("Failed to load delivery settings", err);
    }
  };

  useEffect(() => {
    fetchDeliverySettingsAndAreas();
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

  // Add a new Delivery Area / Location
  const handleAddCustomLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.name.trim()) return alert("Location name is required");

    try {
      // 1. Add to backend DeliveryArea collection
      const res = await fetch(`${API_BASE_URL}/api/delivery-settings/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          ...newLocation
        })
      });

      if (res.ok) {
        const createdArea = await res.json();
        setDeliveryAreas(prev => [createdArea, ...prev]);

        // 2. Also sync to deliveryLocations inside deliverySettings
        const updatedLocations = [
          ...formData.deliveryLocations,
          {
            type: newLocation.type,
            name: newLocation.name.trim(),
            pincode: newLocation.pincode ? newLocation.pincode.trim() : null,
            charge: Number(newLocation.charge || 0),
            enabled: newLocation.enabled
          }
        ];

        setFormData(prev => ({ ...prev, deliveryLocations: updatedLocations }));
        setNewLocation({
          type: 'pincode',
          name: '',
          state: '',
          district: '',
          postOffice: '',
          pincode: '',
          charge: 0,
          enabled: true
        });

        setStatus('New delivery location area added successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add location');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding location area');
    }
  };

  const handleToggleArea = async (areaId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery-settings/areas/${areaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !currentStatus })
      });
      if (res.ok) {
        setDeliveryAreas(prev => prev.map(a => a._id === areaId ? { ...a, enabled: !currentStatus } : a));
      }
    } catch (e) {
      console.error("Failed to toggle area", e);
    }
  };

  const handleDeleteArea = async (areaId) => {
    if (!window.confirm("Are you sure you want to delete this delivery area?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery-settings/areas/${areaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeliveryAreas(prev => prev.filter(a => a._id !== areaId));
      }
    } catch (e) {
      console.error("Failed to delete area", e);
    }
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

  const filteredAreas = deliveryAreas.filter(area => {
    const matchesSearch = area.name.toLowerCase().includes(areaSearch.toLowerCase().trim()) ||
                          (area.pincode && area.pincode.includes(areaSearch.trim()));
    const matchesType = areaFilterType === 'all' || area.type === areaFilterType;
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Delivery">
      <div className="w-full px-6 pb-10 pt-4">

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Sticky Header Bar with Tabs and Save Button */}
          <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('charges')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'charges'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <IndianRupee size={16} />
                Shipping Charges Setting & Rule
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('areas')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'areas'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <MapPin size={16} />
                Delivery Area & Mode Setting
              </button>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2.5 bg-[#76b900] text-white font-bold text-sm rounded-xl hover:bg-[#659e00] transition shadow-md shadow-green-100 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              <ShieldCheck size={18} />
              {loading ? 'Saving...' : 'Save Delivery Settings'}
            </button>
          </div>

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
                  <p className="text-xs text-slate-500 mb-3">Default delivery fee applied to orders when no location-specific charge is matched.</p>
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
                    A base shipping charge of <span className="font-bold text-slate-800">₹{formData.baseCharge}</span> (or matching location charge) will be added.
                  </p>
                  <p>
                    • If cart subtotal is <span className="font-bold text-slate-800">equal to or above ₹{formData.freeShippingThreshold || 0}</span>:
                    Shipping will be <span className="font-bold text-green-600">FREE</span>.
                  </p>
                  {formData.freeShippingThreshold === 0 && (
                    <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg mt-2">
                      Note: Free shipping threshold is set to 0. All orders will be charged the standard delivery fees.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delivery Area & Mode Tab */}
          {activeTab === 'areas' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Delivery Mode Selector */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-3 bg-green-50 rounded-lg text-[#76b900] shrink-0">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">Select Delivery Mode</h4>
                      <p className="text-xs text-slate-500">Choose how you want to restrict or control delivery locations.</p>
                    </div>
                  </div>
                  <div className="w-full lg:w-80 shrink-0">
                    <select
                      value={formData.deliveryMode}
                      onChange={e => setFormData({...formData, deliveryMode: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-[#76b900] text-slate-800 font-bold shadow-sm"
                    >
                      <option value="all">All over India ("all")</option>
                      <option value="state">State wise ("state")</option>
                      <option value="district">District wise ("district")</option>
                      <option value="pincode">Pincode wise ("pincode")</option>
                      <option value="postOffice">Post Office wise ("postOffice")</option>
                      <option value="locality">Locality wise ("village", "building", "chawl")</option>
                    </select>
                  </div>
                </div>

                {/* Mode Description Banner */}
                {formData.deliveryMode === 'all' && (
                  <div className="bg-green-50/50 border border-green-200 text-green-800 p-5 rounded-xl flex items-center gap-4">
                    <Truck size={24} className="text-green-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is enabled for all addresses in India. You can optionally add location-specific charges below.</p>
                  </div>
                )}
                {formData.deliveryMode === 'state' && (
                  <div className="bg-blue-50/50 border border-blue-200 text-blue-800 p-5 rounded-xl flex items-center gap-4">
                    <MapPin size={24} className="text-blue-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is restricted strictly to enabled States selected below.</p>
                  </div>
                )}
                {formData.deliveryMode === 'district' && (
                  <div className="bg-indigo-50/50 border border-indigo-200 text-indigo-800 p-5 rounded-xl flex items-center gap-4">
                    <MapPin size={24} className="text-indigo-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is restricted strictly to enabled Districts configured in your Delivery Areas.</p>
                  </div>
                )}
                {formData.deliveryMode === 'pincode' && (
                  <div className="bg-amber-50/50 border border-amber-200 text-amber-800 p-5 rounded-xl flex items-center gap-4">
                    <MapPin size={24} className="text-amber-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is restricted strictly to allowed Pincodes configured below.</p>
                  </div>
                )}
                {formData.deliveryMode === 'postOffice' && (
                  <div className="bg-purple-50/50 border border-purple-200 text-purple-800 p-5 rounded-xl flex items-center gap-4">
                    <MapPin size={24} className="text-purple-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is restricted to allowed Post Office locations.</p>
                  </div>
                )}
                {formData.deliveryMode === 'locality' && (
                  <div className="bg-emerald-50/50 border border-emerald-200 text-emerald-800 p-5 rounded-xl flex items-center gap-4">
                    <MapPin size={24} className="text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium">Delivery is restricted to specific Villages, Buildings, or Chawls.</p>
                  </div>
                )}
              </div>

              {/* State Wise Mode Matrix */}
              {formData.deliveryMode === 'state' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <p className="text-sm font-bold text-slate-700">Select Allowed States ({formData.allowedStates.length} selected)</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, allowedStates: locationMap.map(l => l.stateName) }))} className="text-xs font-bold text-[#76b900] hover:underline">Enable All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, allowedStates: [] }))} className="text-xs font-bold text-red-500 hover:underline">Disable All</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {locationMap.map(loc => {
                      const isEnabled = formData.allowedStates.includes(loc.stateName);
                      return (
                        <div key={loc.stateName} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-sm font-bold text-slate-700 truncate mr-2" title={loc.stateName}>{loc.stateName}</span>
                          <button
                            type="button"
                            onClick={() => handleStateToggle(loc.stateName)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              isEnabled ? 'bg-[#76b900]' : 'bg-slate-200'
                            }`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pincode Selection Helper */}
              {formData.deliveryMode === 'pincode' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-6">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Quick Pincode Selector ({formData.allowedPincodes.length} selected)</p>
                      <p className="text-xs text-slate-500">Pick State/District/Office to add allowed pincodes.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                      <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(''); setSelectedOffice(''); }} className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white">
                        <option value="">Select State</option>
                        {locationMap.map(loc => (
                          <option key={loc.stateName} value={loc.stateName}>{loc.stateName}</option>
                        ))}
                      </select>
                      
                      <select value={selectedDistrict} onChange={e => { setSelectedDistrict(e.target.value); setSelectedOffice(''); }} disabled={!selectedState} className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white disabled:opacity-50">
                        <option value="">Select District</option>
                        {locationMap.find(loc => loc.stateName === selectedState)?.districts.map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>

                      <select value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)} disabled={!selectedDistrict || offices.length === 0} className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white disabled:opacity-50">
                        <option value="">Select Office / Pincode</option>
                        {offices.map(off => (
                          <option key={off._id} value={off.pincode}>{off.officeName} ({off.pincode})</option>
                        ))}
                      </select>

                      <button type="button" onClick={handleAddPincode} disabled={!selectedOffice} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50">Add Pincode</button>
                      <button type="button" onClick={handleAddEntireDistrict} disabled={!selectedDistrict || offices.length === 0} className="px-4 py-2 bg-[#76b900] text-white text-xs font-bold rounded-xl hover:bg-[#659e00] transition disabled:opacity-50">Add District</button>
                    </div>
                  </div>

                  {/* Pincode List */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <p className="text-sm font-bold text-slate-700">Allowed Pincodes List</p>
                    {formData.allowedPincodes.length > 0 && (
                      <input 
                        type="text" 
                        placeholder="Search pincodes..."
                        value={pincodeSearch}
                        onChange={e => setPincodeSearch(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                      />
                    )}
                  </div>

                  {filteredPincodes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {filteredPincodes.map(code => (
                        <div key={code} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-sm font-bold text-[#76b900]">
                          {code}
                          <button type="button" onClick={() => handleRemovePincode(code)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">No pincodes added yet.</p>
                  )}
                </div>
              )}

              {/* Add Custom Location / Delivery Area Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-[#76b900]" />
                  Add Custom Delivery Location / Area (With Custom Charges)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Location Type</label>
                    <select
                      value={newLocation.type}
                      onChange={e => setNewLocation({ ...newLocation, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white"
                    >
                      {LOCATION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Area / Location Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bandra West / Sector 4"
                      value={newLocation.name}
                      onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Pincode (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 400050"
                      value={newLocation.pincode}
                      onChange={e => setNewLocation({ ...newLocation, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Delivery Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newLocation.charge}
                      onChange={e => setNewLocation({ ...newLocation, charge: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddCustomLocation}
                    className="px-5 py-2 bg-[#76b900] text-white font-bold text-sm rounded-xl hover:bg-[#659e00] transition shadow-sm flex items-center gap-2"
                  >
                    <Plus size={16} /> Add Location Area
                  </button>
                </div>
              </div>

              {/* Configured Delivery Areas Table / List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Configured Delivery Areas ({deliveryAreas.length})</h3>
                    <p className="text-xs text-slate-500">Location specific charges and availability flags.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <select
                      value={areaFilterType}
                      onChange={e => setAreaFilterType(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="all">All Types</option>
                      {LOCATION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search areas..."
                      value={areaSearch}
                      onChange={e => setAreaSearch(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {filteredAreas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                          <th className="p-3">Type</th>
                          <th className="p-3">Area Name</th>
                          <th className="p-3">Pincode</th>
                          <th className="p-3 text-right">Delivery Charge</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAreas.map(area => (
                          <tr key={area._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-semibold text-xs text-slate-500 uppercase">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {area.type}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-800">{area.name}</td>
                            <td className="p-3 font-mono text-xs text-slate-600">{area.pincode || '-'}</td>
                            <td className="p-3 text-right font-bold text-slate-800">
                              {area.charge > 0 ? `₹${area.charge}` : <span className="text-green-600 font-bold">Free (₹0)</span>}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleArea(area._id, area.enabled)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                                  area.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {area.enabled ? 'Enabled' : 'Disabled'}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteArea(area._id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Area"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm italic border border-dashed border-slate-200 rounded-xl">
                    No custom delivery areas created yet. Use the form above to add location-specific charges (village, building, chawl, post office, etc.).
                  </div>
                )}
              </div>

            </div>
          )}

        </form>
      </div>
    </AdminLayout>
  );
};

export default ManageDelivery;