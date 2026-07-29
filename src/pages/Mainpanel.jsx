import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, TrendingUp, ShoppingBag, Users, IndianRupee, Mail, Store, Package, Wallet, Building, MapPin, Upload, ArrowRight, CheckCircle, X } from 'lucide-react';

// Helper to dynamically load razorpay
const loadRazorpay = () => {
  return new Promise((resolve) => {
    // Safely check if the Razorpay SDK is already loaded
    if ('Razorpay' in window) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = (err) => {
      console.error("Razorpay script failed to load. You may have an adblocker enabled.", err);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const Mainpanel = ({ token, stores, setStores, onLogout }) => {
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState('Kirana Stores');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [status, setStatus] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resendingOrderId, setResendingOrderId] = useState(null);
  const [newStoreEmpId, setNewStoreEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [verifyingEmp, setVerifyingEmp] = useState(false);
  const [storeTypes, setStoreTypes] = useState([]);
  const navigate = useNavigate();

  const activeStores = stores.filter(s => !s.isDeleted);
  const activeStoreIdLocal = localStorage.getItem('gb_active_store_id');
  const currentStore = activeStores.find(s => s.storeId === activeStoreIdLocal) || activeStores[0] || {};
  const activeStoreObjId = currentStore._id;
  const activeStoreStringId = currentStore.storeId;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/plans`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
          if (data.length > 0) setNewStorePlan(data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!activeStoreObjId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders?storeId=${activeStoreObjId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };
    fetchOrders();
  }, [activeStoreObjId, token]);

  useEffect(() => {
    const fetchStoreTypes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/store-types/active`);
        if (res.ok) {
          const data = await res.json();
          setStoreTypes(data);
          if (data.length > 0 && newStoreType === 'Kirana Stores') setNewStoreType(data[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch store types', err);
      }
    };
    fetchStoreTypes();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStatus('Creating store...');

    const selectedPlanObj = plans.find(p => p._id === newStorePlan);
    const planPrice = selectedPlanObj ? selectedPlanObj.price : 0;

    try {
      let keyData = null;
      if (planPrice > 0) {
        const keyRes = await fetch(`${API_BASE_URL}/api/platform-payments/public-key`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        keyData = await keyRes.json();
        if (!keyData.razorpayEnabled) {
          return setStatus('Error: Platform payments are currently disabled. Cannot purchase paid plans.');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newStoreName,
          storeType: newStoreType,
          empId: newStoreEmpId,
          metaDescription: newStoreMeta,
          planId: newStorePlan,
          storeSlug: newStoreSlug
        })
      });

      const data = await response.json();

      if (response.ok) {
        const createdStore = data.store || { storeId: 'GBS-NEW', storeName: newStoreName, status: 'active', storeType: newStoreType };

        if (planPrice === 0) {
          setStatus('');
          setIsCreatingStore(false);
          setNewStoreName('');
          setNewStoreType('Kirana Stores');
          setNewStoreMeta('');
          setNewStoreEmpId('');
          setCurrentStep(1);
          setStores([...stores, createdStore]);
          showToast('Store created successfully!', 'success');
        } else {
          setStatus('Initializing payment...');
          const isLoaded = await loadRazorpay();
          if (!isLoaded) return setStatus('Error: Failed to load Razorpay SDK. Check your internet connection.');

          const orderRes = await fetch(`${API_BASE_URL}/api/platform-payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: planPrice, storeId: createdStore._id })
          });
          const orderData = await orderRes.json();
          if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

          const options = {
            key: keyData.razorpayKeyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Galibrand Cloud",
            description: `${selectedPlanObj.name} Plan Subscription`,
            order_id: orderData.id,
            handler: async function (paymentResponse) {
              setStatus('Verifying payment...');
              const verifyRes = await fetch(`${API_BASE_URL}/api/platform-payments/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...paymentResponse, storeId: createdStore._id, planId: newStorePlan })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setStatus('');
                setIsCreatingStore(false);
                setNewStoreName('');
                setNewStoreType('Kirana Stores');
                setNewStoreMeta('');
                setNewStoreEmpId('');
                setCurrentStep(1);
                setStores([...stores, createdStore]);
                showToast('Store created & payment successful!', 'success');
              } else {
                setStatus('Payment verification failed. If money was deducted, please contact support.');
              }
            },
            modal: {
              ondismiss: async function() {
                setStatus('Payment canceled. Cleaning up...');
                try {
                  await fetch(`${API_BASE_URL}/api/store/${createdStore._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                } catch (e) {
                  console.error("Cleanup failed", e);
                }
                setStatus('');
                setIsCreatingStore(false);
                setNewStoreName('');
                setNewStoreType('Kirana Stores');
                setNewStoreMeta('');
          setNewStoreEmpId('');
                setCurrentStep(1);
                showToast('Payment canceled. Store creation aborted.', 'error');
              }
            },
            prefill: { name: newStoreName },
            theme: { color: "#76b900" }
          };

          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
          setStatus('');
        }
      } else {
        setStatus(`Error: ${data.message || 'Failed to create store'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const closeForm = () => {
    setIsCreatingStore(false);
    setStatus('');
    setCurrentStep(1);
  };

  const handleVerifyEmpId = async () => {
    if (!newStoreEmpId) return;
    setVerifyingEmp(true);
    setEmpName('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/store/verify-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ empId: newStoreEmpId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setEmpName(data.name);
      } else {
        setEmpName('Invalid Employee ID');
        showToast(data.message || 'Invalid Employee ID', 'error');
      }
    } catch (err) {
      setEmpName('Verification Error');
    } finally {
      setVerifyingEmp(false);
    }
  };

  const handleResendEmail = async (order) => {
    if (!order.customerEmail) return alert("This order does not have a customer email address associated with it.");
    if (!window.confirm(`Resend the "${order.orderStatus}" email notification to ${order.customerEmail}?`)) return;
    
    setResendingOrderId(order._id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resendEmail: true })
      });

      if (response.ok) {
        alert('Email notification resent successfully!');
      } else {
        alert('Failed to resend email. Please verify your SMTP settings.');
      }
    } catch (err) {
      alert('Network error resending email.');
    } finally {
      setResendingOrderId(null);
    }
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateStore = () => {
    if (activeStores.length >= 1) {
      showToast(`Store limit reached! You can only create 1 store per account.`, 'error');
      return;
    }
    setIsCreatingStore(true);
  };

  // Analytics Calculations
  const deliveredOrders = orders.filter(o => o.orderStatus === 'delivered');
  const totalSales = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const placedOrders = orders.filter(o => o.orderStatus === 'placed').length;
  
  const today = new Date();
  const todaysSales = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate.getDate() === today.getDate() &&
           orderDate.getMonth() === today.getMonth() &&
           orderDate.getFullYear() === today.getFullYear();
  }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const uniqueCustomers = new Set(orders.map(o => o.customerEmail || o.customerPhone).filter(Boolean));
  const totalCustomers = uniqueCustomers.size;
  const averageLifetimeSpend = totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0;

  // Sales Trends (Last 7 Days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const salesData = last7Days.map(date => {
    const daySales = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return o.orderStatus !== 'canceled' && o.orderStatus !== 'returned' &&
             orderDate.getDate() === date.getDate() &&
             orderDate.getMonth() === date.getMonth() &&
             orderDate.getFullYear() === date.getFullYear();
    }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), sales: daySales };
  });
  const maxSales = Math.max(...salesData.map(d => d.sales), 1); // Avoid division by zero

  // Top 5 Selling Products
  const productSales = {};
  orders.filter(o => o.orderStatus !== 'canceled' && o.orderStatus !== 'returned').forEach(order => {
    (order.orderItems || []).forEach(item => {
      if (productSales[item.name]) {
        productSales[item.name].qty += item.qty;
        productSales[item.name].revenue += (item.qty * item.price);
      } else {
        productSales[item.name] = { qty: item.qty, revenue: (item.qty * item.price) };
      }
    });
  });
  const topProducts = Object.entries(productSales)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const maxProductQty = Math.max(...topProducts.map(p => p.qty), 1); // Avoid division by zero

  const handleStoreNameChange = (e) => {
    const val = e.target.value;
    setNewStoreName(val);
    const slug = val.toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .substring(0, 30);
    setNewStoreSlug(slug);
  };

  const starterPlan = plans[0] || { _id: 'free', name: 'Starter', price: 0, limits: { maxProducts: 20 }, features: ['Up to 20 products', 'Basic shop themes', 'Standard subdomain hosting'] };
  const proPlan = plans[1] || { _id: 'pro', name: 'Pro', price: 999, limits: { maxProducts: 100 }, features: ['Up to 100 products', 'WhatsApp support integration', 'Custom store slug option'] };
  const premiumPlan = plans[2] || { _id: 'premium', name: 'Premium', price: 2999, limits: { maxProducts: 1000 }, features: ['Up to 1000 products', 'Dedicated subdomain & external domain support', 'Priority 24/7 client support'] };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Overview Dashboard">
        <main className="w-full px-6 py-10 text-left">

        {status && (
           <div className={`mb-8 p-4 rounded-xl text-sm font-medium ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
             {status}
           </div>
        )}

        {activeStores.length === 0 && !isCreatingStore ? (
          <div 
            onClick={handleOpenCreateStore}
            className="w-full max-w-2xl mx-auto min-h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-3xl hover:border-[#76b900] hover:bg-green-50/50 hover:text-[#76b900] transition-colors cursor-pointer group mt-10"
          >
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#76b900] group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700 group-hover:text-[#76b900] mb-1">Create Your First Store</h3>
            <p className="text-sm text-center px-4">Click here to launch your online ordering system.</p>
          </div>
        ) : activeStores.length > 0 ? (
          <>

            {/* 4 Analytics Metric Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <IndianRupee size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Sales</p>
                  <p className="text-2xl font-extrabold text-slate-800">₹{totalSales}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Sales</p>
                  <p className="text-2xl font-extrabold text-slate-800">₹{todaysSales}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Placed Orders</p>
                  <p className="text-2xl font-extrabold text-slate-800">{placedOrders}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Customers</p>
                  <p className="text-2xl font-extrabold text-slate-800">{totalCustomers}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CreditCard size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Lifetime Spend</p>
                  <p className="text-2xl font-extrabold text-slate-800">₹{averageLifetimeSpend}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Sales Trend Chart */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Sales Trends</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">Last 7 Days</span>
                </div>
                
                <div className="relative w-full h-64 mt-8">
                  {/* SVG Line */}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#76b900"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={salesData.map((d, i) => `${(i / 6) * 100},${100 - 20 - (d.sales / maxSales) * 60}`).join(' ')}
                    />
                  </svg>
                  
                  {/* Data Points and Labels */}
                  {salesData.map((d, i) => {
                    const leftPos = `${(i / 6) * 100}%`;
                    const bottomPos = `${20 + (d.sales / maxSales) * 60}%`;
                    return (
                      <div key={i} className="absolute flex flex-col items-center transform -translate-x-1/2" style={{ left: leftPos, bottom: bottomPos }}>
                        <span className="text-[10px] md:text-xs font-bold text-slate-600 bg-white/80 px-1.5 py-0.5 rounded-md mb-2 shadow-sm border border-slate-100 whitespace-nowrap">₹{d.sales}</span>
                        <div className="w-3 h-3 bg-white border-[3px] border-[#76b900] rounded-full shadow-sm z-10 transform translate-y-1.5"></div>
                      </div>
                    );
                  })}
                  
                  {/* X-Axis Labels */}
                  <div className="absolute bottom-2 w-full flex justify-between px-1">
                    {salesData.map((d, i) => (
                      <div key={i} className="w-0 flex justify-center">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Top Products</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">All Time</span>
                </div>
                
                <div className="space-y-6 mt-4">
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-10">No sales data yet.</p>
                  ) : topProducts.map((prod, i) => (
                    <div key={i} className="relative">
                      <div className="flex justify-between items-end mb-2 z-10 relative">
                        <span className="text-sm font-bold text-slate-700 truncate pr-4">{i + 1}. {prod.name}</span>
                        <span className="text-sm font-bold text-slate-900 shrink-0">{prod.qty} <span className="text-xs text-slate-500 font-medium">sold</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#ff8a00] h-full rounded-full transition-all duration-500" style={{ width: `${(prod.qty / maxProductQty) * 100}%` }}></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 font-medium">Revenue: ₹{prod.revenue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Recent Orders</h3>
                <button 
                  onClick={() => navigate(`/store/${activeStoreStringId}/orders`)}
                  className="text-sm font-bold text-[#76b900] hover:text-[#659e00] bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition-colors"
                >
                  View All Orders
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4 font-bold">Order ID</th>
                      <th className="p-4 font-bold">Customer</th>
                      <th className="p-4 font-bold text-center">Items</th>
                      <th className="p-4 font-bold text-right">Total</th>
                      <th className="p-4 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No recent orders found.</td></tr>
                    ) : (
                      recentOrders.map(order => (
                        <tr key={order._id} onClick={() => setSelectedOrder(order)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" title="Click to view details">
                          <td className="p-4">
                            <div className="text-sm font-bold text-slate-700">#{order._id.slice(-6).toUpperCase()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4 font-semibold text-slate-800">{order.customerName}</td>
                          <td className="p-4 text-center text-slate-600 font-medium">{order.orderItems?.length || 0}</td>
                          <td className="p-4 text-right font-extrabold text-green-600">₹{order.totalAmount}</td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${order.orderStatus === 'delivered' ? 'bg-blue-100 text-blue-700' : order.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-700' : order.orderStatus === 'canceled' ? 'bg-red-100 text-red-700' : order.orderStatus === 'returned' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{order.orderStatus}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Modal Overlay for Store Creation */}
      {isCreatingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-fadeIn">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Create New Store</h3>
                  <p className="text-xs text-slate-500 font-medium">Launch your business in just two simple steps.</p>
                </div>
              </div>
              <button onClick={closeForm} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Horizontal Progress Stepper */}
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-green-600 text-white border-green-600' : 'bg-slate-200 text-slate-500 border-slate-200'}`}>1</div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= 1 ? 'text-green-600' : 'text-slate-400'}`}>Select Plan</span>
                </div>
                <div className={`w-16 h-0.5 rounded-full ${currentStep >= 2 ? 'bg-green-600' : 'bg-slate-200'}`} />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-green-600 text-white border-green-600' : 'bg-slate-200 text-slate-500 border-slate-200'}`}>2</div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= 2 ? 'text-green-600' : 'text-slate-400'}`}>Store Details & Payment</span>
                </div>
              </div>
            </div>

            {/* Two-Column Content Body */}
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN (45%) */}
              <div className="lg:col-span-5 space-y-6">
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800">Step 1: Choose Your Plan</h4>
                    <div className="space-y-4">
                      {[starterPlan, proPlan, premiumPlan].map((plan, idx) => {
                        const isSelected = newStorePlan === plan._id || (plans.length > idx && newStorePlan === plans[idx]._id);
                        const isPro = idx === 1;
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (plans.length > idx) setNewStorePlan(plans[idx]._id);
                              else setNewStorePlan(plan._id);
                            }}
                            className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 ${isSelected ? 'border-green-600 bg-green-50/20 ring-2 ring-green-100 shadow-xl scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg bg-white opacity-80'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                                {plan.name}
                                {isPro && <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>}
                              </div>
                              <input 
                                type="radio" 
                                name="planSelect" 
                                checked={isSelected}
                                onChange={() => {
                                  if (plans.length > idx) setNewStorePlan(plans[idx]._id);
                                  else setNewStorePlan(plan._id);
                                }}
                                className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                              />
                            </div>
                            <div className="flex items-baseline mb-3">
                              <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
                              <span className="text-xs text-slate-500 font-medium ml-1">/month</span>
                            </div>
                            <ul className="space-y-1.5">
                              {(plan.features || []).map((feat, fIdx) => (
                                <li key={fIdx} className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <CheckCircle size={12} className="text-green-600 shrink-0" />
                                  <span>{feat.name || feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold text-slate-800">Confirmed Plan Summary</h4>
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold text-slate-800 text-lg">
                          {plans.find(p => p._id === newStorePlan)?.name || 'Selected Plan'}
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xl text-slate-900">₹{plans.find(p => p._id === newStorePlan)?.price || 0}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">/month</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Includes 7 days free trial. Start date: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}</p>
                    </div>

                    {/* Choose Payment Method */}
                    {plans.find(p => p._id === newStorePlan)?.price > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800">Choose Payment Method</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            onClick={() => setPaymentMethod('razorpay')}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${paymentMethod === 'razorpay' ? 'border-green-600 bg-green-50/40 ring-1 ring-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                          >
                            <CreditCard size={20} className={paymentMethod === 'razorpay' ? 'text-green-600' : 'text-slate-500'} />
                            <span className="text-xs font-bold text-slate-700">Razorpay Pay</span>
                          </div>
                          <div 
                            onClick={() => setPaymentMethod('razorpay')}
                            className="p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer border-slate-200 opacity-60 bg-white"
                          >
                            <Wallet size={20} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-400">UPI / Wallets</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium text-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          Secure transaction powered by Razorpay. Supports Credit/Debit Cards, UPI, Net Banking, and major Wallets.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (55%) */}
              <div className="lg:col-span-7 flex flex-col h-full">
                {currentStep === 1 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
                      <Package size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">Select a Subscription Tier</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-6">Choose a plan that fits your business catalog capacity. You can change your plan or cancel at any time.</p>
                    <div className="w-full space-y-3 text-left max-w-xs">
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>Zero setup fees, activate instantly.</span>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>Includes a 7-day risk-free free trial.</span>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>SSL certificate and basic SEO ready.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-4 pr-1">
                    <h4 className="text-lg font-bold text-slate-800">Step 2: Store Details & Billing</h4>
                    
                    {status && (
                      <div className={`p-4 rounded-xl text-xs font-semibold border ${status.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {status}
                      </div>
                    )}

                    {/* Row 1: Store Name & Subdomain */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Store Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={newStoreName} 
                          onChange={handleStoreNameChange}
                          placeholder="e.g. Fresh Veggies Mart" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                          required 
                          autoFocus 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Store Subdomain URL <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            value={newStoreSlug} 
                            onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="my-store" 
                            className="w-full h-11 pl-4 pr-32 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                            required 
                          />
                          <span className="absolute right-3 text-xs font-bold text-slate-400 select-none">.galibrand.cloud</span>
                        </div>
                      </div>
                    </div>

                    {/* Business Category / Store Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Business Category / Store Type <span className="text-red-500">*</span></label>
                      <select 
                        value={newStoreType} 
                        onChange={(e) => setNewStoreType(e.target.value)} 
                        className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 bg-white transition" 
                        required
                      >
                        {storeTypes.length > 0 ? (
                          storeTypes.map(cat => (
                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                          ))
                        ) : (
                          <option value="Kirana Stores">Kirana Stores</option>
                        )}
                      </select>
                    </div>

                    {/* Row 2.5: Assisted By EmpID (Verified Employee ID) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Assisted By (Employee ID) <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newStoreEmpId} 
                          onChange={(e) => { setNewStoreEmpId(e.target.value); setEmpName(''); }} 
                          placeholder="e.g. GBE0001" 
                          className="flex-1 h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                        <button 
                          type="button" 
                          onClick={handleVerifyEmpId} 
                          disabled={verifyingEmp || !newStoreEmpId} 
                          className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                          {verifyingEmp ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      {empName && (
                        <p className={`text-[10px] font-bold mt-1 ${empName.includes('Invalid') || empName.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                          {empName.includes('Invalid') || empName.includes('Error') ? empName : `Verified Agent: ${empName}`}
                        </p>
                      )}
                    </div>

                    {/* Row 3: Store Description (Meta) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Store Description <span className="text-slate-400 font-normal">(Meta SEO Description)</span></label>
                      <textarea 
                        value={newStoreMeta} 
                        onChange={(e) => setNewStoreMeta(e.target.value)} 
                        placeholder="Describe your shop..." 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 resize-none h-16 transition" 
                      />
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Footer Control Panel */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
              {currentStep > 1 ? (
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(prev => prev - 1)} 
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  &larr; Back
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={closeForm} 
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}

              {currentStep === 1 ? (
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!newStorePlan} 
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm animate-fadeIn"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  form="createStoreForm"
                  disabled={!newStoreName || !newStoreSlug}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm animate-fadeIn"
                >
                  {plans.find(p => p._id === newStorePlan)?.price > 0 ? (
                    <>Proceed for Payment <ArrowRight size={16} /></>
                  ) : (
                    <>Confirm & Create <CheckCircle size={16} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#76b900] text-white'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Order Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedOrder._id}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleResendEmail(selectedOrder)} 
                  disabled={resendingOrderId === selectedOrder._id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
                  title="Resend email notification for current status"
                >
                  <Mail size={16} />
                  {resendingOrderId === selectedOrder._id ? 'Sending...' : 'Resend Email'}
                </button>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                  &times;
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Info</h4>
                  <p className="font-bold text-slate-800 text-lg">{selectedOrder.customerName}</p>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">📞 {selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">✉️ {selectedOrder.customerEmail}</p>}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Address</h4>
                  <p className="text-sm text-slate-800 font-medium">{selectedOrder.address?.addressLine1}</p>
                  {selectedOrder.address?.landmark && <p className="text-sm text-slate-600 mt-1">Landmark: {selectedOrder.address?.landmark}</p>}
                  <p className="text-sm text-slate-600 mt-1">{selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.pincode}</p>
                  {selectedOrder.address?.alternateNumber && <p className="text-xs text-slate-500 mt-2">Alt Phone: {selectedOrder.address?.alternateNumber}</p>}
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Purchased Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-semibold text-slate-600">Product</th>
                      <th className="p-3 font-semibold text-slate-600 text-center">Qty</th>
                      <th className="p-3 font-semibold text-slate-600 text-right">Price</th>
                      <th className="p-3 font-semibold text-slate-600 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.orderItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-800 font-bold">{item.name}</td>
                        <td className="p-3 text-slate-600 text-center">{item.qty}</td>
                        <td className="p-3 text-slate-600 text-right">₹{item.price}</td>
                        <td className="p-3 text-slate-800 font-bold text-right">₹{item.price * item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80 border-t border-slate-200">
                    <tr>
                      <td colSpan="3" className="p-3 text-right font-semibold text-slate-600">Subtotal:</td>
                      <td className="p-3 text-right font-bold text-slate-800">₹{selectedOrder.totalAmount + (selectedOrder.discountAmount || 0)}</td>
                    </tr>
                    {selectedOrder.couponCode && (
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-semibold text-green-600">Discount ({selectedOrder.couponCode}):</td>
                        <td className="p-3 text-right font-bold text-green-600">-₹{selectedOrder.discountAmount}</td>
                      </tr>
                    )}
                    {selectedOrder.shippingCharge > 0 && (
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-semibold text-slate-600">Shipping Charge:</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{selectedOrder.shippingCharge}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="3" className="p-3 text-right font-bold text-slate-800 text-base">Final Total:</td>
                      <td className="p-3 text-right font-extrabold text-slate-900 text-base">₹{selectedOrder.totalAmount}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Mainpanel;