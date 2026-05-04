import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Ticket, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const ManageCoupon = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [coupons, setCoupons] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const initialForm = {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: 0,
    maxDiscountAmount: '',
    startDate: formatDateTimeLocal(new Date()),
    endDate: '',
    usageLimit: '',
    isActive: true
  };

  const [formData, setFormData] = useState(initialForm);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchCoupons = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/coupons?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setCoupons(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) fetchCoupons();
  }, [currentStore._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');

    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/coupons/${editingId}` : `/api/coupons`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          storeId: currentStore._id,
          discountValue: Number(formData.discountValue) || 0,
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(editingId ? 'Coupon updated successfully!' : 'Coupon added successfully!');
        setFormData(initialForm);
        setEditingId(null);
        setIsFormOpen(false);
        fetchCoupons();
      } else {
        setStatus(`Error: ${data.message || 'Failed to save coupon'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon) => {
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue || '',
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      startDate: formatDateTimeLocal(coupon.startDate),
      endDate: formatDateTimeLocal(coupon.endDate),
      usageLimit: coupon.usageLimit || '',
      isActive: coupon.isActive
    });
    setEditingId(coupon._id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStatus('Coupon deleted successfully');
        fetchCoupons();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleClose = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsFormOpen(false);
    setStatus('');
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Coupons">
      <div className="p-6 mx-auto mt-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Discount Coupons</h2>
            <p className="text-slate-500">Create promotional codes for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>
          </div>
          <button onClick={() => setIsFormOpen(true)} className="px-6 py-3 bg-gradient-to-r from-[#76b900] to-[#5a8d00] text-white font-bold rounded-xl hover:shadow-lg transition flex items-center gap-2">
            <Ticket size={20} /> Add New Coupon
          </button>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-medium text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {/* Coupons List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium">
              <Ticket size={48} className="mx-auto mb-4 text-slate-300" />
              No coupons created yet. Offer a discount to boost your sales!
            </div>
          ) : (
            coupons.map(coupon => {
              const isExpired = new Date(coupon.endDate) < new Date();
              return (
                <div key={coupon._id} className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col relative overflow-hidden transition-shadow hover:shadow-md ${!coupon.isActive || isExpired ? 'border-slate-200 opacity-75' : 'border-[#76b900]/30'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-100 text-slate-800 font-black font-mono px-3 py-1.5 rounded-lg text-lg tracking-widest border border-slate-200 border-dashed">
                      {coupon.code}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${coupon.isActive && !isExpired ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {coupon.isActive && !isExpired ? <><CheckCircle2 size={14}/> Active</> : <><AlertCircle size={14}/> {isExpired ? 'Expired' : 'Inactive'}</>}
                    </span>
                  </div>
                  
                  <div className="mb-4 flex-1">
                    <p className="font-bold text-slate-800 text-xl">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : coupon.discountType === 'fixed' ? `₹${coupon.discountValue} OFF` : 'Free Shipping'}
                    </p>
                    {coupon.description && <p className="text-sm text-slate-500 mt-1">{coupon.description}</p>}
                    <div className="mt-3 space-y-1 text-xs font-medium text-slate-500">
                      {coupon.minOrderAmount > 0 && <li>Min. Order: ₹{coupon.minOrderAmount}</li>}
                      {coupon.maxDiscountAmount > 0 && <li>Max Discount: ₹{coupon.maxDiscountAmount}</li>}
                      {coupon.usageLimit && <li>Usage: {coupon.usageCount} / {coupon.usageLimit}</li>}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-auto">
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={14} /> Exp: {new Date(coupon.endDate).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(coupon)} className="text-blue-500 hover:text-blue-700 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition">Edit</button>
                      <button onClick={() => handleDelete(coupon._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-2xl font-extrabold text-slate-800">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <form id="couponForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Coupon Code <span className="text-red-500">*</span></label><input required value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] font-mono uppercase" placeholder="e.g. SUMMER50" /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Status</label>
                    <select value={formData.isActive} onChange={e=>setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white">
                      <option value="true">Active (Usable)</option><option value="false">Inactive (Disabled)</option>
                    </select>
                  </div>
                </div>
                <div><label className="block text-sm font-semibold mb-1 text-slate-700">Description (Optional)</label><input value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. Get 50% off on summer sales!" /></div>
                
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Discount Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-sm font-semibold mb-1 text-slate-700">Discount Type</label><select value={formData.discountType} onChange={e=>setFormData({...formData, discountType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] bg-white"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (₹)</option><option value="free_shipping">Free Shipping</option></select></div>
                    {formData.discountType !== 'free_shipping' && (<div><label className="block text-sm font-semibold mb-1 text-slate-700">Discount Value <span className="text-red-500">*</span></label><input type="number" required value={formData.discountValue} onChange={e=>setFormData({...formData, discountValue: e.target.value})} min="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="e.g. 50" /></div>)}
                    <div><label className="block text-sm font-semibold mb-1 text-slate-700">Minimum Order Amount (₹)</label><input type="number" value={formData.minOrderAmount} onChange={e=>setFormData({...formData, minOrderAmount: e.target.value})} min="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="0" /></div>
                    {formData.discountType === 'percentage' && (<div><label className="block text-sm font-semibold mb-1 text-slate-700">Max Discount Amount (₹)</label><input type="number" value={formData.maxDiscountAmount} onChange={e=>setFormData({...formData, maxDiscountAmount: e.target.value})} min="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900]" placeholder="No Limit" /></div>)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Start Date <span className="text-red-500">*</span></label><input type="datetime-local" required value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm" /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">End Date <span className="text-red-500">*</span></label><input type="datetime-local" required value={formData.endDate} onChange={e=>setFormData({...formData, endDate: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm" /></div>
                  <div><label className="block text-sm font-semibold mb-1 text-slate-700">Usage Limit</label><input type="number" value={formData.usageLimit} onChange={e=>setFormData({...formData, usageLimit: e.target.value})} min="1" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm" placeholder="Unlimited" /></div>
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0">
              <button type="button" onClick={handleClose} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button type="submit" form="couponForm" disabled={loading} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50">
                {editingId ? 'Update Coupon' : 'Save Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageCoupon;