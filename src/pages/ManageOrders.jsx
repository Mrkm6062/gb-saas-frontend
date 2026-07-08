import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AlertCircle, HelpCircle, Mail, Search, ChevronLeft, ChevronRight, Printer, Copy, Download, X, Truck } from 'lucide-react';

const ManageOrders = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: '', pendingData: null });
  const [trackingModal, setTrackingModal] = useState({ isOpen: false, orderId: null, ShippingMethod: 'By Shipping Company', ShippingCompany: '', ShippingTrackingNumber: '', DeliveryPersonName: '', DeliveryPersonPhone: '' });
  const [resendingOrderId, setResendingOrderId] = useState(null);
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [soundTheme, setSoundTheme] = useState(localStorage.getItem('live_order_sound_theme') || 'chime');
  const orderIdsRef = useRef(new Set());

  const playNotificationSound = (themeName = soundTheme) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const playTone = (freq, duration, type = 'sine', delay = 0) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      switch (themeName) {
        case 'chime':
          playTone(587.33, 0.2, 'sine', 0); // D5
          playTone(880, 0.3, 'sine', 0.15); // A5
          break;
        case 'beep':
          playTone(987.77, 0.25, 'triangle', 0); // B5
          break;
        case 'doorbell':
          playTone(659.25, 0.35, 'sine', 0); // E5
          playTone(523.25, 0.5, 'sine', 0.22); // C5
          break;
        case 'arcade':
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.35);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.35);
          break;
        case 'mute':
        default:
          break;
      }
    } catch (err) {
      console.warn('Audio play warning:', err);
    }
  };

  const handleSoundThemeChange = (newTheme) => {
    setSoundTheme(newTheme);
    localStorage.setItem('live_order_sound_theme', newTheme);
    playNotificationSound(newTheme);
  };

  

  const fetchOrders = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Play notification sound on new order
        if (orderIdsRef.current.size > 0) {
          const hasNewOrder = data.some(order => !orderIdsRef.current.has(order._id));
          if (hasNewOrder) {
            playNotificationSound();
          }
        }
        orderIdsRef.current = new Set(data.map(order => order._id));

        setOrders(data);
      } else {
        setError('Failed to load orders.');
      }
    } catch (err) {
      setError('Network error loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000); // Poll orders every 5 seconds for live updates
      return () => clearInterval(interval);
    }
  }, [currentStore._id]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter]);

  const executeStatusChange = async (orderId, type, newValue, additionalPayload = {}) => {
    try {
      let payload = { ...additionalPayload };
      if (type === 'order') {
        payload.orderStatus = newValue;
      } else {
        payload.paymentStatus = newValue;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        fetchOrders(); // Refresh the list
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Network error updating status');
    }
  };

  const handleStatusChange = (orderId, type, newValue, order) => {
    if (type === 'order') {
      if (newValue === 'canceled') {
        setConfirmModal({
          isOpen: true,
          title: 'Cancel Order',
          message: 'Are you sure you want to cancel this order? This action cannot be undone.',
          confirmText: 'Yes, Cancel Order',
          cancelText: 'Keep Order',
          confirmColor: 'bg-red-600 hover:bg-red-700 shadow-red-100 text-white',
          icon: <AlertCircle size={28} className="text-red-500" />,
          pendingData: { orderId, type, newValue, subType: 'cancel' }
        });
        return;
      }

      if (newValue === 'shipped') {
        setTrackingModal({
          isOpen: true,
          orderId,
          ShippingMethod: 'By Shipping Company',
          ShippingCompany: '',
          ShippingTrackingNumber: '',
          DeliveryPersonName: '',
          DeliveryPersonPhone: ''
        });
        return;
      }

      if (newValue === 'delivered' && order.paymentStatus !== 'paid') {
        setConfirmModal({
          isOpen: true,
          title: 'Payment Received?',
          message: 'Has the payment been received for this order?',
          confirmText: 'Yes, Mark as Paid',
          cancelText: 'No, Keep Pending',
          confirmColor: 'bg-[#76b900] hover:bg-[#659e00] shadow-green-100 text-white',
          icon: <HelpCircle size={28} className="text-[#76b900]" />,
          pendingData: { orderId, type, newValue, subType: 'payment_check' }
        });
        return;
      }
    }

    executeStatusChange(orderId, type, newValue);
  };

  const handleModalConfirm = () => {
    const { orderId, type, newValue, subType } = confirmModal.pendingData;
    let additionalPayload = {};
    if (subType === 'payment_check') additionalPayload.paymentStatus = 'paid';
    executeStatusChange(orderId, type, newValue, additionalPayload);
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleModalCancel = () => {
    const { orderId, type, newValue, subType } = confirmModal.pendingData;
    if (subType === 'payment_check') executeStatusChange(orderId, type, newValue);
    else if (subType === 'cancel') setOrders([...orders]); // Re-render to reset dropdown UI
    setConfirmModal({ ...confirmModal, isOpen: false });
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

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('Custom text copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text.');
    });
  };

  const handleDownloadImage = (url) => {
      try {
          const downloadUrl = `${API_BASE_URL}/api/upload/download?url=${encodeURIComponent(url)}`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (error) {
          alert('Failed to download image. You can try right-clicking the preview to save it.');
      }
  };

  const handlePrintBill = async (order) => {
    // Open window immediately to prevent browser popup blockers
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print bills.');
      return;
    }
    setPrintingOrderId(order._id);
    try {
      let templateBody = '';
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const billTemplate = data.templates?.find(t => t.eventType === 'bill_receipt' && t.isActive);
        if (billTemplate) {
          templateBody = billTemplate.body;
        }
      }

      if (!templateBody) {
        templateBody = `<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; color: #333;">INVOICE</h1>
    <h2 style="margin: 5px 0; color: #76b900;">{{storeName}}</h2>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
    <div>
      <p style="margin: 2px 0;"><strong>Billed To:</strong></p>
      <p style="margin: 2px 0;">{{customerName}}</p>
      <p style="margin: 2px 0;">{{customerPhone}}</p>
      <p style="margin: 2px 0;">{{customerEmail}}</p>
      <p style="margin: 2px 0;">{{customerAddress}}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 2px 0;"><strong>Invoice #:</strong> {{orderId}}</p>
      <p style="margin: 2px 0;"><strong>Date:</strong> {{orderDate}}</p>
    </div>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">Item</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">Qty</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Price</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{billItems}}
    </tbody>
  </table>
  <div style="width: 100%; display: flex; justify-content: flex-end;">
    <table style="width: 300px; border-collapse: collapse;">
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>Subtotal:</strong></td><td style="padding: 5px 10px; text-align: right;">₹{{subTotal}}</td></tr>
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>{{discountLabel}}:</strong></td><td style="padding: 5px 10px; text-align: right;">-₹{{discountAmount}}</td></tr>
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>Shipping:</strong></td><td style="padding: 5px 10px; text-align: right;">₹{{shippingCharge}}</td></tr>
      <tr><td style="padding: 10px; text-align: left; font-size: 18px; border-top: 2px solid #333;"><strong>Total:</strong></td><td style="padding: 10px; text-align: right; font-size: 18px; border-top: 2px solid #333;"><strong>₹{{totalAmount}}</strong></td></tr>
    </table>
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #777;"><p>Thank you for your business!</p></div>
</div>`;
      }

      const orderItemsTable = order.orderItems?.map(item => `<tr><td style="padding:8px; border-bottom:1px solid #ddd;">${item.qty}x ${item.name}</td><td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹${item.price * item.qty}</td></tr>`).join('');
      const billItemsHtml = order.orderItems?.map(item => `<tr><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${item.name}</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.qty}</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price}</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price * item.qty}</td></tr>`).join('');
      const subTotal = (order.totalAmount || 0) + (order.discountAmount || 0) - (order.shippingCharge || 0);
      const fullAddress = order.address ? `${order.address.addressLine1 || ''} ${order.address.city || ''}, ${order.address.state || ''} ${order.address.pincode || ''}` : '';
      const discountLabel = order.discountType ? `Discount (${order.discountType === 'percentage' ? 'Percentage' : 'Flat'})` : 'Discount';

      const finalHtml = templateBody
        .replace(/{{storeName}}/g, currentStore.storeName || "")
        .replace(/{{customerName}}/g, order.customerName || "")
        .replace(/{{customerPhone}}/g, order.customerPhone || "")
        .replace(/{{customerEmail}}/g, order.customerEmail || "")
        .replace(/{{customerAddress}}/g, fullAddress)
        .replace(/{{orderDate}}/g, new Date(order.createdAt).toLocaleDateString())
        .replace(/{{orderId}}/g, order._id.toString().slice(-6).toUpperCase())
        .replace(/{{orderItems}}/g, `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">${orderItemsTable}</table>`)
        .replace(/{{billItems}}/g, billItemsHtml)
        .replace(/{{subTotal}}/g, subTotal)
        .replace(/{{totalAmount}}/g, order.totalAmount || 0)
        .replace(/{{discountLabel}}/g, discountLabel)
        .replace(/{{discountType}}/g, order.discountType || "")
        .replace(/{{discountAmount}}/g, order.discountAmount || 0)
        .replace(/{{shippingCharge}}/g, order.shippingCharge || 0);

      printWindow.document.write(`<html><head><title>Invoice - ${order._id.toString().slice(-6).toUpperCase()}</title><style>@media print { body { -webkit-print-color-adjust: exact; } }</style></head><body>${finalHtml}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (err) {
      if (printWindow) printWindow.close();
      alert('Failed to generate bill.');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (order.customerName || '').toLowerCase().includes(searchLower) ||
                          (order.customerEmail || '').toLowerCase().includes(searchLower) ||
                          (order._id || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Orders">
      <div className="w-full px-6 py-10">
        {/* <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Order Management</h2>
        <p className="text-slate-500 mb-8">View and process incoming orders for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p> */}

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by customer name, email, or Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm transition"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm text-sm">
              <span className="text-xs text-slate-500 font-bold">🔊 Alert:</span>
              <select 
                value={soundTheme} 
                onChange={e => handleSoundThemeChange(e.target.value)}
                className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
              >
                <option value="chime">Sweet Chime</option>
                <option value="doorbell">Ding Dong</option>
                <option value="beep">Alert Beep</option>
                <option value="arcade">Retro Arcade</option>
                <option value="mute">Muted</option>
              </select>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white font-medium text-slate-700">
              <option value="all">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="canceled">Canceled</option>
              <option value="returned">Returned</option>
            </select>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white font-medium text-slate-700">
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Date / ID</th>
                  <th className="p-4 font-bold">Customer</th>
                  <th className="p-4 font-bold">Items</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Payment</th>
                  <th className="p-4 font-bold">Order Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No orders received yet.</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No orders match your search and filters.</td></tr>
                ) : (
                  paginatedOrders.map(order => (
                    <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">{order._id.slice(-6).toUpperCase()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.customerPhone}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={`${order.address?.addressLine1}, ${order.address?.city}`}>
                          {order.address?.addressLine1}, {order.address?.city}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div>{order.orderItems?.length || 0} items</div>
                        <button onClick={() => setSelectedOrder(order)} className="mt-1 text-blue-600 font-bold hover:text-blue-800 transition-colors underline decoration-blue-300 underline-offset-2">View Details</button>
                      </td>
                      <td className="p-4 font-extrabold text-green-600">₹{order.totalAmount}</td>
                      <td className="p-4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {order.paymentMethod === 'whatsapp' || order.WhasAppOrder ? (
                            <span className="text-[#76b900] bg-green-50 px-2 py-0.5 rounded border border-green-100">WhatsApp Order</span>
                          ) : order.paymentMethod === 'razorpay' ? 'Online' : 'COD'}
                        </div>
                        <select value={order.paymentStatus} onChange={(e) => handleStatusChange(order._id, 'payment', e.target.value, order)} className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border cursor-pointer ${order.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <select value={order.orderStatus} onChange={(e) => handleStatusChange(order._id, 'order', e.target.value, order)} className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border cursor-pointer ${order.orderStatus === 'delivered' ? 'bg-blue-50 text-blue-700 border-blue-200' : order.orderStatus === 'shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : order.orderStatus === 'canceled' ? 'bg-red-50 text-red-700 border-red-200' : order.orderStatus === 'returned' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            <option value="placed" disabled={order.orderStatus !== 'placed'}>Placed</option>
                            <option value="shipped" disabled={order.orderStatus !== 'placed'}>Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="canceled">Canceled</option>
                            <option value="returned">Returned</option>
                          </select>
                          {order.orderStatus === 'shipped' && (
                            <button 
                              onClick={() => {
                                const isOwn = order.ShippingMethod && !order.ShippingMethod.startsWith('By Shipping Company');
                                setTrackingModal({
                                  isOpen: true,
                                  orderId: order._id,
                                  ShippingMethod: isOwn ? 'By Store Name' : 'By Shipping Company',
                                  ShippingCompany: order.ShippingCompany || '',
                                  ShippingTrackingNumber: order.ShippingTrackingNumber || '',
                                  DeliveryPersonName: order.DeliveryPersonName || '',
                                  DeliveryPersonPhone: order.DeliveryPersonPhone || ''
                                });
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"
                              title="Edit Tracking Details"
                            >
                              <Truck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 gap-4">
              <div className="text-sm text-slate-500 flex items-center gap-2">
                Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-slate-800">{filteredOrders.length}</span> orders
                <select 
                  value={itemsPerPage} 
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                  className="ml-2 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#76b900]"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-sm font-medium text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  {currentPage} / {totalPages || 1}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl w-full  overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Order Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedOrder._id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handlePrintBill(selectedOrder)} 
                    disabled={printingOrderId === selectedOrder._id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
                    title="Print Bill / Invoice"
                  >
                    <Printer size={16} />
                    {printingOrderId === selectedOrder._id ? 'Generating...' : 'Print Bill'}
                  </button>
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
                  {(selectedOrder.orderStatus === 'shipped' || selectedOrder.ShippingMethod || selectedOrder.ShippingTrackingNumber || selectedOrder.DeliveryPersonName) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracking Information</h4>
                        {selectedOrder.orderStatus === 'shipped' && (
                          <button 
                            onClick={() => {
                              const isOwn = selectedOrder.ShippingMethod && !selectedOrder.ShippingMethod.startsWith('By Shipping Company');
                              setTrackingModal({
                                isOpen: true,
                                orderId: selectedOrder._id,
                                ShippingMethod: isOwn ? 'By Store Name' : 'By Shipping Company',
                                ShippingCompany: selectedOrder.ShippingCompany || '',
                                ShippingTrackingNumber: selectedOrder.ShippingTrackingNumber || '',
                                DeliveryPersonName: selectedOrder.DeliveryPersonName || '',
                                DeliveryPersonPhone: selectedOrder.DeliveryPersonPhone || ''
                              });
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-100"
                            title="Edit Tracking Details"
                          >
                            <Truck size={12} /> Edit Tracking
                          </button>
                        )}
                      </div>
                      {selectedOrder.ShippingMethod && <p className="text-sm text-slate-800 font-medium mb-3">Method: <span className="bg-slate-200 px-2 py-1 rounded text-xs ml-1">{selectedOrder.ShippingMethod}</span></p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-100">
                        {selectedOrder.ShippingMethod && !selectedOrder.ShippingMethod.startsWith('By Shipping Company') ? (
                          <>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Delivery Person</p>
                              <p className="text-sm font-bold text-slate-700">{selectedOrder.DeliveryPersonName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                              <p className="text-sm font-bold text-slate-700">{selectedOrder.DeliveryPersonPhone || 'N/A'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Shipping Company</p>
                              <p className="text-sm font-bold text-slate-700">{selectedOrder.ShippingCompany || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Tracking Number</p>
                              {selectedOrder.ShippingTrackingNumber && selectedOrder.ShippingTrackingNumber !== 'N/A' ? (
                                <a 
                                  href={`https://www.google.com/search?q=${encodeURIComponent((selectedOrder.ShippingCompany || '') + ' tracking ' + selectedOrder.ShippingTrackingNumber)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                                  title="Track via Google Search"
                                >
                                  {selectedOrder.ShippingTrackingNumber}
                                </a>
                              ) : (
                                <p className="text-sm font-bold text-slate-700">N/A</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
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
                          <td className="p-3 text-slate-800 font-bold">
                            {item.name}
                            {item.customImage && (
                              <div className="mt-2 flex items-center gap-3">
                                <button onClick={() => setImagePreviewUrl(item.customImage)} className="shrink-0 group" title="Click to preview image">
                                  <img src={item.customImage} alt="Custom print" className="h-12 w-12 object-cover rounded-lg border border-slate-200 shadow-sm group-hover:scale-110 transition-transform cursor-pointer" />
                                </button>
                                <button onClick={() => handleDownloadImage(item.customImage)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition" title="Download Image">
                                  <Download size={16} />
                                </button>
                              </div>
                            )}
                            {item.customText && (
                              <div className="mt-2 flex items-center gap-3">
                                <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <span className="font-semibold text-slate-500">Text:</span>
                                  <span className="ml-2 font-mono bg-white px-1 rounded">{item.customText}</span>
                                </div>
                                <button onClick={() => handleCopyText(item.customText)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition" title="Copy Text">
                                  <Copy size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 text-center">{item.qty}</td>
                          <td className="p-3 text-slate-600 text-right">₹{item.price}</td>
                          <td className="p-3 text-slate-800 font-bold text-right">₹{item.price * item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 border-t border-slate-200">
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-semibold text-slate-600">Subtotal:</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{selectedOrder.totalAmount + (selectedOrder.discountAmount || 0) - (selectedOrder.shippingCharge || 0)}</td>
                      </tr>
                      {selectedOrder.discountAmount > 0 && (
                        <tr>
                          <td colSpan="3" className="p-3 text-right font-semibold text-green-600">
                            Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''} 
                            {selectedOrder.discountType ? ` [${selectedOrder.discountType === 'percentage' ? 'Percentage' : 'Flat'}]` : ''}:
                          </td>
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
                        <td colSpan="3" className="p-3 text-right font-semibold text-slate-600">Payment Method:</td>
                        <td className="p-3 text-right font-bold text-slate-800 uppercase">{(selectedOrder.paymentMethod === 'whatsapp' || selectedOrder.WhasAppOrder) ? 'WhatsApp' : selectedOrder.paymentMethod === 'razorpay' ? 'Online' : 'COD'}</td>
                      </tr>
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
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100 opacity-100">
            <div className="p-6 pt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-slate-100">
                {confirmModal.icon}
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 mb-6 px-2">{confirmModal.message}</p>
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <button 
                  onClick={handleModalCancel}
                  className="flex-1 px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  {confirmModal.cancelText}
                </button>
                <button 
                  onClick={handleModalConfirm}
                  className={`flex-1 px-6 py-3 font-bold rounded-xl transition-colors shadow-lg ${confirmModal.confirmColor}`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Details Modal */}
      {trackingModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Tracking Information</h3>
              <button onClick={() => { setTrackingModal({...trackingModal, isOpen: false}); setOrders([...orders]); }} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Shipping Method</label>
                  <select 
                    value={trackingModal.ShippingMethod} 
                    onChange={e => setTrackingModal({...trackingModal, ShippingMethod: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white"
                  >
                    <option value="By Shipping Company">By Shipping Company</option>
                    <option value="By Store Name">By Store Name (Own Delivery)</option>
                  </select>
                </div>
                
                {trackingModal.ShippingMethod === 'By Shipping Company' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Shipping Company</label>
                      <input 
                        type="text" 
                        placeholder="e.g., FedEx, BlueDart"
                        value={trackingModal.ShippingCompany}
                        onChange={e => setTrackingModal({...trackingModal, ShippingCompany: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tracking Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter tracking number"
                        value={trackingModal.ShippingTrackingNumber}
                        onChange={e => setTrackingModal({...trackingModal, ShippingTrackingNumber: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Person Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., John Doe"
                        value={trackingModal.DeliveryPersonName}
                        onChange={e => setTrackingModal({...trackingModal, DeliveryPersonName: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter phone number"
                        value={trackingModal.DeliveryPersonPhone}
                        onChange={e => setTrackingModal({...trackingModal, DeliveryPersonPhone: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 pt-4 mt-2">
                  <button 
                    onClick={() => { setTrackingModal({...trackingModal, isOpen: false}); setOrders([...orders]); }}
                    className="flex-1 px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const finalShippingMethod = trackingModal.ShippingMethod === 'By Store Name' 
                        ? `By ${currentStore.storeName || 'Store'}` 
                        : trackingModal.ShippingMethod;

                      executeStatusChange(trackingModal.orderId, 'order', 'shipped', {
                        ShippingMethod: finalShippingMethod,
                        ShippingCompany: trackingModal.ShippingCompany,
                        ShippingTrackingNumber: trackingModal.ShippingTrackingNumber,
                        DeliveryPersonName: trackingModal.DeliveryPersonName,
                        DeliveryPersonPhone: trackingModal.DeliveryPersonPhone
                      });
                      setTrackingModal({...trackingModal, isOpen: false});
                    }}
                    className="flex-1 px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-100"
                  >
                    Save & Ship
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageOrders;