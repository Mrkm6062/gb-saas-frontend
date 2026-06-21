import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Printer, 
  Check, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Maximize2, 
  Minimize2, 
  ClipboardList, 
  HelpCircle,
  Truck,
  XCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const LiveOrderManage = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('placed'); // 'placed' | 'shipped'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState(null);

  // Modals state
  const [confirmDeliveredModal, setConfirmDeliveredModal] = useState({ isOpen: false, order: null });
  const [trackingModal, setTrackingModal] = useState({ isOpen: false, orderId: null });
  const [trackingData, setTrackingData] = useState({ ShippingCompany: '', ShippingTrackingNumber: '' });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  // Fetch orders from backend
  const fetchOrders = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError('Failed to load orders.');
      }
    } catch (err) {
      setError('Network error loading live orders.');
    } finally {
      setLoading(false);
    }
  };

  // Live polling every 5 seconds
  useEffect(() => {
    if (currentStore._id) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStore._id]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Listen to escape key or exit button fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update order status or confirmation state
  const updateOrder = async (orderId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchOrders();
      } else {
        alert('Failed to update order.');
      }
    } catch (err) {
      alert('Network error updating order.');
    }
  };

  // Handle Order Confirmation click
  const handleConfirmOrder = (orderId) => {
    updateOrder(orderId, { orderConfirmed: true });
  };

  // Trigger ship actions
  const handleMarkShipped = (orderId) => {
    setTrackingModal({ isOpen: true, orderId });
    setTrackingData({ ShippingCompany: '', ShippingTrackingNumber: '' });
  };

  const submitShipped = () => {
    updateOrder(trackingModal.orderId, {
      orderStatus: 'shipped',
      ShippingMethod: 'By Shipping Company',
      ShippingCompany: trackingData.ShippingCompany || 'N/A',
      ShippingTrackingNumber: trackingData.ShippingTrackingNumber || 'N/A'
    });
    setTrackingModal({ isOpen: false, orderId: null });
  };

  // Trigger Delivered flow (with confirmation popup)
  const handleMarkDelivered = (order) => {
    setConfirmDeliveredModal({ isOpen: true, order });
  };

  const submitDelivered = () => {
    if (confirmDeliveredModal.order) {
      updateOrder(confirmDeliveredModal.order._id, { orderStatus: 'delivered', paymentStatus: 'paid' });
    }
    setConfirmDeliveredModal({ isOpen: false, order: null });
  };

  // Other status shortcuts
  const handleCancelOrder = (orderId) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      updateOrder(orderId, { orderStatus: 'canceled' });
    }
  };

  const handleReturnOrder = (orderId) => {
    if (window.confirm("Are you sure you want to mark this order as returned?")) {
      updateOrder(orderId, { orderStatus: 'returned' });
    }
  };

  // Bill Printing Logic (matching ManageOrders.jsx exactly)
  const handlePrintBill = async (order) => {
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
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>Discount:</strong></td><td style="padding: 5px 10px; text-align: right;">-₹{{discountAmount}}</td></tr>
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

  // Filter orders by active status tab
  const filteredOrders = orders.filter(order => order.orderStatus === activeTab);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Live Orders Monitor">
      <div className={`w-full px-6 py-8 ${isFullscreen ? 'bg-slate-900 min-h-screen text-white' : ''}`}>
        
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className={`text-2xl font-black ${isFullscreen ? 'text-white' : 'text-slate-800'}`}>Live Order Dashboard</h2>
            <p className={`text-sm ${isFullscreen ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
              Monitoring incoming sales for <span className="font-bold">{currentStore.storeName}</span>
            </p>
          </div>
          
          <button 
            onClick={handleToggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-bold rounded-xl transition shadow-sm text-sm"
          >
            {isFullscreen ? (
              <><Minimize2 size={16} /> Exit Fullscreen</>
            ) : (
              <><Maximize2 size={16} /> Enter Fullscreen</>
            )}
          </button>
        </div>

        {/* Tab Buttons accordingly Status */}
        <div className="flex gap-4 border-b border-slate-200 pb-3 mb-8">
          <button 
            onClick={() => setActiveTab('placed')}
            className={`pb-2 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'placed' ? 'text-blue-600 font-extrabold border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Clock size={16} className={activeTab === 'placed' ? 'text-blue-600 animate-pulse' : 'text-slate-400'} />
            Order Placed (Live)
            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 font-bold rounded-full">
              {orders.filter(o => o.orderStatus === 'placed').length}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('shipped')}
            className={`pb-2 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'shipped' ? 'text-indigo-600 font-extrabold border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Truck size={16} className={activeTab === 'shipped' ? 'text-indigo-600' : 'text-slate-400'} />
            Shipped Orders
            <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 font-bold rounded-full">
              {orders.filter(o => o.orderStatus === 'shipped').length}
            </span>
          </button>
        </div>

        {/* Orders Card Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bold">Connecting to live order feed...</div>
        ) : filteredOrders.length === 0 ? (
          <div className={`text-center py-20 border-2 border-dashed ${isFullscreen ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'} rounded-2xl`}>
            <ClipboardList size={40} className="mx-auto text-slate-400 mb-4" />
            <h4 className="font-bold text-lg">No Orders in this queue</h4>
            <p className="text-sm text-slate-400 mt-1">New incoming orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map(order => {
              const fullAddress = order.address 
                ? `${order.address.addressLine1 || ''}, ${order.address.city || ''}, ${order.address.state || ''} - ${order.address.pincode || ''}`
                : 'No delivery address details provided.';
              
              return (
                <div 
                  key={order._id}
                  className={`flex flex-col h-full rounded-2xl border transition-all ${
                    isFullscreen 
                      ? 'bg-slate-800 border-slate-700 shadow-md shadow-black/10' 
                      : 'bg-white border-slate-200 shadow-sm'
                  } ${!order.orderConfirmed && activeTab === 'placed' ? 'ring-2 ring-amber-500/55' : ''} overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`p-4 border-b flex justify-between items-center ${isFullscreen ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div>
                      <span className="text-xs text-slate-400 font-bold font-mono">ID:</span>
                      <span className="text-sm font-bold font-mono text-blue-600 ml-1">#{order._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Customer Information */}
                  <div className="p-4 flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-700 flex justify-between items-center">
                        <span>{order.customerName}</span>
                        {!order.orderConfirmed ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] uppercase font-bold">Unconfirmed</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] uppercase font-bold">Confirmed</span>
                        )}
                      </h4>
                      
                      <div className="text-xs space-y-1 mt-2 text-slate-500">
                        <p className="flex items-center gap-1.5"><Phone size={12} /> {order.customerPhone}</p>
                        {order.customerEmail && <p className="flex items-center gap-1.5"><Mail size={12} /> {order.customerEmail}</p>}
                        <p className="flex items-start gap-1.5 leading-relaxed mt-1"><MapPin size={12} className="shrink-0 mt-0.5" /> {fullAddress}</p>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Items</h5>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {order.orderItems?.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center text-xs">
                            {item.customImage ? (
                              <img src={item.customImage} alt="thumbnail" className="h-8 w-8 object-cover rounded border border-slate-200 shadow-sm" />
                            ) : (
                              <div className="h-8 w-8 bg-slate-100 text-slate-400 flex items-center justify-center rounded font-bold uppercase text-[10px]">
                                item
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</p>
                              <p className="text-[10px] text-slate-400">Qty: {item.qty} × ₹{item.price}</p>
                            </div>
                            <span className="font-bold text-slate-700 text-right">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Grid */}
                  <div className={`p-4 border-t ${isFullscreen ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-slate-50/20'} space-y-3`}>
                    
                    {/* Order Confirmation button */}
                    {!order.orderConfirmed ? (
                      <button 
                        onClick={() => handleConfirmOrder(order._id)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Confirm Order
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                        <Check size={14} /> Order Confirmed
                      </div>
                    )}

                    {/* Status Options */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button 
                        disabled={!order.orderConfirmed}
                        onClick={() => handleMarkShipped(order._id)}
                        className={`py-2 rounded-xl border flex items-center justify-center gap-1 transition ${
                          !order.orderConfirmed 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        <Truck size={12} /> Mark Shipped
                      </button>

                      <button 
                        disabled={!order.orderConfirmed}
                        onClick={() => handleMarkDelivered(order)}
                        className={`py-2 rounded-xl border flex items-center justify-center gap-1 transition ${
                          !order.orderConfirmed 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                            : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                        }`}
                      >
                        <CheckCircle size={12} /> Mark Delivered
                      </button>

                      <button 
                        disabled={!order.orderConfirmed}
                        onClick={() => handleCancelOrder(order._id)}
                        className={`py-2 rounded-xl border flex items-center justify-center gap-1 transition ${
                          !order.orderConfirmed 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        <XCircle size={12} /> Cancel Order
                      </button>

                      <button 
                        disabled={!order.orderConfirmed}
                        onClick={() => handleReturnOrder(order._id)}
                        className={`py-2 rounded-xl border flex items-center justify-center gap-1 transition ${
                          !order.orderConfirmed 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                            : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
                        }`}
                      >
                        <RotateCcw size={12} /> Mark Returned
                      </button>
                    </div>

                    {/* Bottom side Print Bill Button */}
                    <button 
                      onClick={() => handlePrintBill(order)}
                      disabled={printingOrderId === order._id}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-extrabold text-xs rounded-xl transition border border-slate-200 flex items-center justify-center gap-1.5 mt-1"
                    >
                      <Printer size={13} />
                      {printingOrderId === order._id ? 'Generating...' : 'Print Bill / Invoice'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Delivered Confirmation Modal */}
      {confirmDeliveredModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 pt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border-2 border-green-100">
                <HelpCircle size={28} className="text-[#76b900]" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Mark as Delivered?</h3>
              <p className="text-sm text-slate-500 mb-6 px-2">
                Are you sure order <span className="font-bold">#{confirmDeliveredModal.order?._id.slice(-6).toUpperCase()}</span> has been delivered? This will also update its payment status to paid.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setConfirmDeliveredModal({ isOpen: false, order: null })}
                  className="flex-1 px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitDelivered}
                  className="flex-1 px-4 py-2.5 font-bold text-white bg-[#76b900] hover:bg-[#659e00] rounded-xl transition-colors shadow-lg shadow-green-100"
                >
                  Yes, Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Enter Tracking Information</h3>
              <button 
                onClick={() => setTrackingModal({ isOpen: false, orderId: null })} 
                className="text-slate-400 hover:text-red-500 transition-colors text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Shipping Company</label>
                <input 
                  type="text" 
                  placeholder="e.g. FedEx, DHL, BlueDart"
                  value={trackingData.ShippingCompany}
                  onChange={e => setTrackingData({...trackingData, ShippingCompany: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tracking Number</label>
                <input 
                  type="text" 
                  placeholder="Enter tracking number"
                  value={trackingData.ShippingTrackingNumber}
                  onChange={e => setTrackingData({...trackingData, ShippingTrackingNumber: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setTrackingModal({ isOpen: false, orderId: null })}
                  className="flex-1 px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitShipped}
                  className="flex-1 px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg"
                >
                  Save & Ship
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LiveOrderManage;
