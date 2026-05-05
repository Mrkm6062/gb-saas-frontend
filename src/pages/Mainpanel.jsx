import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, TrendingUp, ShoppingBag, Users, IndianRupee, Mail } from 'lucide-react';

const Mainpanel = ({ token, stores, setStores, onLogout }) => {
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState('Kirana Stores');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [status, setStatus] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resendingOrderId, setResendingOrderId] = useState(null);
  const navigate = useNavigate();

  const activeStoreIdLocal = localStorage.getItem('gb_active_store_id');
  const currentStore = stores.find(s => s.storeId === activeStoreIdLocal) || stores[0] || {};
  const activeStoreObjId = currentStore._id;
  const activeStoreStringId = currentStore.storeId;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStatus('Creating store...');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newStoreName,
          category: newStoreCategory,
          metaDescription: newStoreMeta,
          planId: newStorePlan
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('');
        setIsCreatingStore(false);
        setNewStoreName('');
        setNewStoreCategory('Kirana Stores');
        setNewStoreMeta('');
        setCurrentStep(1);
        // Add the new store to the local list
        setStores([...stores, data.store || { storeId: 'GBS-NEW', storeName: newStoreName, status: 'active', category: newStoreCategory }]);
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

  const handleResendEmail = async (order) => {
    if (!order.customerEmail) return alert("This order does not have a customer email address associated with it.");
    if (!window.confirm(`Resend the "${order.orderStatus}" email notification to ${order.customerEmail}?`)) return;
    
    setResendingOrderId(order._id);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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
    let maxStoresAllowed = 1;
    
    stores.forEach(s => {
      const plan = plans.find(p => p._id === s.planId);
      if (plan && plan.features?.storeLimit) {
        if (plan.features.storeLimit > maxStoresAllowed) {
          maxStoresAllowed = plan.features.storeLimit;
        }
      }
    });

    if (stores.length >= maxStoresAllowed) {
      showToast(`Store limit reached! Your current plans allow up to ${maxStoresAllowed} store(s). Please upgrade to create more.`, 'error');
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

  // Recent Orders (Top 5)
  const recentOrders = orders.slice(0, 5);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Overview Dashboard">
        <main className="w-full px-6 py-10 text-left">

        {status && (
           <div className={`mb-8 p-4 rounded-xl text-sm font-medium ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
             {status}
           </div>
        )}

        {stores.length === 0 && !isCreatingStore ? (
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
        ) : stores.length > 0 ? (
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

      {/* Modal Overlay for Store Creation */}
      {isCreatingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-extrabold text-slate-800">Launch New Store</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stepper Header */}
            <div className="px-8 pt-6">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
                <div className="absolute left-0 top-1/2 h-1 bg-[#76b900] -z-10 transform -translate-y-1/2 transition-all duration-500" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
                
                {[1, 2, 3].map(step => (
                  <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep >= step ? 'bg-[#76b900] border-[#76b900] text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                    {step}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">
                <span>Details</span>
                <span>Plan</span>
                <span>Payment</span>
              </div>
            </div>

            {/* Modal Body & Form */}
            <div className="p-8 overflow-y-auto flex-1">
              <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-6">
                
                {/* STEP 1: Store Details */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Store Name <span className="text-red-500">*</span></label>
                      <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. Fresh Veggies Mart" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900" required autoFocus />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Store Category <span className="text-red-500">*</span></label>
                      <select value={newStoreCategory} onChange={(e) => setNewStoreCategory(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 bg-white" required>
                        {["Vegetable Shop", "Bakery Shop", "Cafe Shop", "Kirana Stores", "Cake Shop", "Clothes Shop", "Multi-Ecommerce Shop", "Education Webapp", "Nasta Corner", "Appointment&Contact Webapp"].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Meta Description</label>
                      <textarea value={newStoreMeta} onChange={(e) => setNewStoreMeta(e.target.value)} placeholder="Brief description for SEO..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 resize-none h-24" />
                    </div>
                  </div>
                )}

                {/* STEP 2: Select Plan */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Select a Subscription Plan <span className="text-red-500">*</span></p>
                    {plans.length === 0 ? (
                      <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">No plans configured. Please contact support.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {plans.map(plan => (
                          <label key={plan._id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${newStorePlan === plan._id ? 'border-[#76b900] bg-green-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                            <div className="flex items-center gap-4">
                              <input type="radio" name="planSelection" value={plan._id} checked={newStorePlan === plan._id} onChange={() => setNewStorePlan(plan._id)} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900] cursor-pointer" />
                              <div>
                                <div className="font-bold text-slate-800 text-lg">{plan.name}</div>
                                <div className="text-sm text-slate-500">Up to {plan.features.maxProducts} products</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-xl text-slate-900">₹{plan.price}</div>
                              <div className="text-xs text-slate-500 font-medium">/month</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Payment Checkout Placeholder */}
                {currentStep === 3 && (
                  <div className="text-center py-6 animate-fadeIn">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CreditCard size={40} />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800 mb-2">Complete Payment</h4>
                    <p className="text-slate-500 mb-6">You have selected the <span className="font-bold text-slate-700">{plans.find(p => p._id === newStorePlan)?.name}</span> plan for <span className="font-bold text-slate-700">₹{plans.find(p => p._id === newStorePlan)?.price}/mo</span>.</p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mb-4">
                      * Payment gateway integration placeholder. Clicking "Confirm & Create" will activate your store immediately.
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
              {currentStep > 1 ? (
                <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  &larr; Back
                </button>
              ) : (
                <button type="button" onClick={closeForm} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  Cancel
                </button>
              )}
              
              {currentStep < 3 ? (
                <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} disabled={(currentStep === 1 && !newStoreName) || (currentStep === 2 && !newStorePlan)} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next Step &rarr;
                </button>
              ) : (
                <button type="submit" form="createStoreForm" className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100">
                  Confirm & Create
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