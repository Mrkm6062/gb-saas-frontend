import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Printer, 
  Check, 
  Utensils, 
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
  AlertCircle,
  Volume2,
  VolumeX,
  Smartphone,
  BellRing,
  ChefHat,
  AlertTriangle,
  SendHorizontal
} from 'lucide-react';
import { 
  isPushNotificationSupported, 
  checkIsSubscribed, 
  subscribeToPushNotifications, 
  triggerTestPushNotification 
} from '../utils/pushNotifications';

const LiveOrderManage = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const navigate = useNavigate();

  // Find store by storeId code (e.g. GBS006) OR MongoDB _id
  const currentStore = stores.find(s => s.storeId === storeId || s._id === storeId) || 
    (stores.length > 0 && !stores.some(s => s.storeId === storeId) ? stores[0] : {});

  // Show Start Preparing only if store type is cafe, restaurant, cloud kitchen, or nasta corner
  const isKitchenStore = Boolean(
    currentStore.isRestaurant || 
    (currentStore.storeType && /restaurant|cafe|nasta|nashta|cloud\s*kitchen/i.test(currentStore.storeType))
  );

  // If the notification or link opened with MongoDB _id, normalize to friendly storeId (e.g. GBS006)
  useEffect(() => {
    if (currentStore && currentStore.storeId && storeId === currentStore._id) {
      navigate(`/store/${currentStore.storeId}/live-orders`, { replace: true });
    }
  }, [currentStore, storeId, navigate]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('placed'); // 'placed' | 'preparing' | 'shipped' | 'wasted'

  // If store is not a kitchen store and active tab is set to preparing, fallback to placed queue
  useEffect(() => {
    if (!isKitchenStore && activeTab === 'preparing') {
      setActiveTab('placed');
    }
  }, [isKitchenStore, activeTab]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const fullscreenRef = useRef(null);
  const [soundTheme, setSoundTheme] = useState(localStorage.getItem('live_order_sound_theme') || 'chime');
  const orderIdsRef = useRef(new Set());
  const [deliveryStaffList, setDeliveryStaffList] = useState([]);

  // Modals state
  const [confirmDeliveredModal, setConfirmDeliveredModal] = useState({ isOpen: false, order: null });
  const [confirmCancelModal, setConfirmCancelModal] = useState({ isOpen: false, orderId: null });
  const [trackingModal, setTrackingModal] = useState({
    isOpen: false,
    orderId: null,
    ShippingMethod: 'By Store Delivery Staff',
    ShippingCompany: '',
    ShippingTrackingNumber: '',
    deliveryStaff: '',
    DeliveryPersonName: '',
    DeliveryPersonPhone: ''
  });

  // Closed-app PWA Push notifications state
  const [pushStatus, setPushStatus] = useState('checking'); // 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported' | 'checking'
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  useEffect(() => {
    const checkPush = async () => {
      if (!isPushNotificationSupported()) {
        setPushStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setPushStatus('denied');
        return;
      }
      const isSub = await checkIsSubscribed();
      setPushStatus(isSub ? 'subscribed' : 'unsubscribed');
    };
    checkPush();
  }, [currentStore._id]);

  const handleSubscribePush = async () => {
    if (!currentStore._id) return;
    setIsSubscribing(true);
    setPushMsg('');
    try {
      await subscribeToPushNotifications(currentStore._id, token, true);
      setPushStatus('subscribed');
      setPushMsg('✅ Closed-app push alerts enabled!');
      setTimeout(() => setPushMsg(''), 4000);
    } catch (err) {
      if (Notification.permission === 'denied') setPushStatus('denied');
      setPushMsg('❌ ' + (err.message || 'Error enabling notifications'));
      setTimeout(() => setPushMsg(''), 4000);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    if (!currentStore._id) return;
    setTestPushLoading(true);
    setPushMsg('');
    try {
      const data = await triggerTestPushNotification(currentStore._id, token);
      setPushMsg('🚀 ' + (data.message || 'Test alert sent! Check your device.'));
      setTimeout(() => setPushMsg(''), 5000);
    } catch (err) {
      setPushMsg('❌ ' + (err.message || 'Test failed'));
      setTimeout(() => setPushMsg(''), 6000);
    } finally {
      setTestPushLoading(false);
    }
  };

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

  // Cycles through sound themes on mobile click
  const cycleSoundTheme = () => {
    const themes = ['chime', 'doorbell', 'beep', 'arcade', 'mute'];
    const currentIndex = themes.indexOf(soundTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    handleSoundThemeChange(themes[nextIndex]);
  };

  // Fetch orders from backend
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

        // Broadcast to AdminLayout header
        window.dispatchEvent(new CustomEvent('gb_live_orders_updated', {
          detail: { orders: data, storeId: currentStore._id }
        }));
      } else {
        setError('Failed to load orders.');
      }
    } catch (err) {
      setError('Network error loading live orders.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch delivery staff for store
  useEffect(() => {
    if (!currentStore._id) return;
    const fetchDeliveryStaff = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/store-staff/delivery-staff?storeId=${currentStore._id}`);
        if (res.ok) {
          const data = await res.json();
          setDeliveryStaffList(data.deliveryStaff || []);
        }
      } catch (err) {
        console.warn('Failed to fetch delivery staff:', err);
      }
    };
    fetchDeliveryStaff();
  }, [currentStore._id]);

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
      if (fullscreenRef.current) {
        fullscreenRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error("Fullscreen error:", err));
      }
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
      
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        fetchOrders();
      } else {
        alert(`Failed to update order: ${data.message || response.statusText || 'Unknown Error'}`);
      }
    } catch (err) {
      alert(`Network error updating order: ${err.message}`);
    }
  };

  // Handle Order Confirmation click
  const handleConfirmOrder = (orderId) => {
    updateOrder(orderId, { orderConfirmed: true });
  };

  // Trigger ship actions
  const handleMarkShipped = (orderId) => {
    setTrackingModal({
      isOpen: true,
      orderId,
      ShippingMethod: 'By Store Delivery Staff',
      ShippingCompany: '',
      ShippingTrackingNumber: '',
      deliveryStaff: '',
      DeliveryPersonName: '',
      DeliveryPersonPhone: ''
    });
  };

  const submitShipped = () => {
    const isOwnDelivery = trackingModal.ShippingMethod === 'By Store Delivery Staff' || trackingModal.ShippingMethod === 'By Store Name';
    const finalShippingMethod = isOwnDelivery
      ? `By ${currentStore.storeName || 'Store'} Delivery Staff` 
      : trackingModal.ShippingMethod;

    updateOrder(trackingModal.orderId, {
      orderStatus: 'shipped',
      ShippingMethod: finalShippingMethod,
      ShippingCompany: isOwnDelivery ? (currentStore.storeName || 'Store Staff') : (trackingModal.ShippingCompany || 'N/A'),
      ShippingTrackingNumber: isOwnDelivery ? 'INTERNAL-DISPATCH' : (trackingModal.ShippingTrackingNumber || 'N/A'),
      deliveryStaff: trackingModal.deliveryStaff || null,
      DeliveryPersonName: trackingModal.DeliveryPersonName || 'Store Delivery Staff',
      DeliveryPersonPhone: trackingModal.DeliveryPersonPhone || ''
    });
    setTrackingModal({ 
      isOpen: false, 
      orderId: null, 
      ShippingMethod: 'By Store Delivery Staff',
      ShippingCompany: '',
      ShippingTrackingNumber: '',
      deliveryStaff: '',
      DeliveryPersonName: '',
      DeliveryPersonPhone: ''
    });
  };

  // Kitchen Area Actions (Preparing / Wasted / Finish)
  const handleMarkPreparing = (orderId) => {
    updateOrder(orderId, { orderStatus: 'preparing' });
  };

  const handleMarkWasted = (orderId) => {
    const reason = window.prompt("Reason for marking this order as Wasted / Damaged:", "Food damaged / prepared & wasted");
    if (reason !== null) {
      updateOrder(orderId, { orderStatus: 'wasted', wastedReason: reason || 'Damaged / Wasted' });
    }
  };

  const handleFinishKitchenOrder = (order) => {
    const isDineIn = order.orderType && order.orderType.toLowerCase() === 'dine-in';
    if (isDineIn) {
      updateOrder(order._id, { orderStatus: 'delivered', paymentStatus: 'paid' });
    } else {
      handleMarkShipped(order._id);
    }
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
    setConfirmCancelModal({ isOpen: true, orderId });
  };

  const submitCancel = () => {
    if (confirmCancelModal.orderId) {
      updateOrder(confirmCancelModal.orderId, { orderStatus: 'canceled' });
    }
    setConfirmCancelModal({ isOpen: false, orderId: null });
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
      <div 
        ref={fullscreenRef}
        className="w-full bg-slate-50 text-slate-900 h-screen overflow-hidden"
      >
        {/* Mobile: Row container. Left is w-14 icon-only bar, Right is flex-1 main panel */}
        <div className="flex flex-row gap-4 p-4 h-full overflow-hidden">
          
          {/* Left Column: Sound Alert, Fullscreen Controls & Queue Selector */}
          <div className="w-14 md:w-60 shrink-0 bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center md:items-stretch gap-4 h-full md:overflow-y-auto">
            {/* Header Title (Hidden on Mobile) */}
            <div className="hidden md:block">
              <h2 className="text-xl font-black text-slate-800">Live order Feed</h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitoring incoming sales for <span className="font-bold text-slate-700">{currentStore.storeName}</span>
              </p>
            </div>

            {/* Sound Selector widget (Desktop View) */}
            <div className="hidden md:flex flex-col gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm text-sm">
              <span className="text-xs text-slate-500 font-bold">🔊 Sound Alert</span>
              <select 
                value={soundTheme} 
                onChange={e => handleSoundThemeChange(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 outline-none cursor-pointer bg-white border border-slate-200 p-2 rounded-lg"
              >
                <option value="chime">Sweet Chime</option>
                <option value="doorbell">Ding Dong</option>
                <option value="beep">Alert Beep</option>
                <option value="arcade">Retro Arcade</option>
                <option value="mute">Muted</option>
              </select>
            </div>

            {/* Sound Cycling Button (Mobile View - Icon Only) */}
            <button 
              onClick={cycleSoundTheme}
              title={`Cycle Sound (Current: ${soundTheme})`}
              className="md:hidden p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              {soundTheme === 'mute' ? <VolumeX size={20} className="text-red-500" /> : <Volume2 size={20} className="text-blue-500" />}
            </button>

            {/* Fullscreen control button (Desktop View) */}
            <button 
              onClick={handleToggleFullscreen}
              className="hidden md:flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-bold rounded-xl transition shadow-sm text-xs"
            >
              {isFullscreen ? (
                <><Minimize2 size={15} /> Exit Fullscreen</>
              ) : (
                <><Maximize2 size={15} /> Enter Fullscreen</>
              )}
            </button>

            {/* Fullscreen control button (Mobile View - Icon Only) */}
            <button 
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen"
              className="md:hidden p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* Closed-App Push Alerts Widget (Desktop View) */}
            <div className="hidden md:flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#76b900]" /> Closed-App Alerts
                </span>
                {pushStatus === 'subscribed' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>

              {pushStatus === 'subscribed' ? (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    ✓ Device will alert even when app is closed
                  </span>
                  <button
                    onClick={handleTestPush}
                    disabled={testPushLoading}
                    className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 text-[10px] transition"
                  >
                    {testPushLoading ? 'Testing...' : 'Send Test Alert'}
                  </button>
                </div>
              ) : pushStatus === 'denied' ? (
                <span className="text-[10px] text-red-600 font-medium">
                  Notifications blocked in browser settings.
                </span>
              ) : (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Get sound & push alerts when app/browser is closed.
                  </p>
                  <button
                    onClick={handleSubscribePush}
                    disabled={isSubscribing}
                    className="w-full py-1.5 px-2 bg-[#76b900] hover:bg-[#68a500] text-white font-bold rounded-lg text-[11px] transition shadow-xs"
                  >
                    {isSubscribing ? 'Enabling...' : 'Enable Push Alerts'}
                  </button>
                </div>
              )}

              {pushMsg && (
                <span className="text-[10px] font-semibold text-center text-slate-700 mt-1">
                  {pushMsg}
                </span>
              )}
            </div>

            {/* Closed-App Push Icon Button (Mobile View - Icon Only) */}
            <button 
              onClick={pushStatus === 'subscribed' ? handleTestPush : handleSubscribePush}
              title={pushStatus === 'subscribed' ? 'Push Alerts Active (Click to test)' : 'Enable Closed-App Push Alerts'}
              className="md:hidden p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-600 cursor-pointer relative"
            >
              <Smartphone size={20} className={pushStatus === 'subscribed' ? 'text-[#76b900]' : 'text-slate-400'} />
              {pushStatus === 'subscribed' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              )}
            </button>

            {/* Order status queues */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 w-full">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 hidden md:block">Queue Selector</span>
              
              {/* Placed Queue Button */}
              <button 
                onClick={() => setActiveTab('placed')}
                title="Order Placed (Live)"
                className={`w-full py-2.5 px-2 md:px-4 text-xs font-bold transition-all rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-between gap-1.5 md:gap-2 border ${activeTab === 'placed' ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <Clock size={18} className={activeTab === 'placed' ? 'text-blue-600 animate-pulse' : 'text-slate-400'} />
                  <span className="hidden md:inline">Placed (Live)</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] md:text-xs bg-blue-100 text-blue-700 font-bold rounded-full">
                  {orders.filter(o => o.orderStatus === 'placed').length}
                </span>
              </button>
              
              {/* Preparing (Kitchen) Queue Button - Only shown for cafe, restaurant, cloud kitchen, nasta corner */}
              {isKitchenStore && (
                <button 
                  onClick={() => setActiveTab('preparing')}
                  title="Preparing in Kitchen"
                  className={`w-full py-2.5 px-2 md:px-4 text-xs font-bold transition-all rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-between gap-1.5 md:gap-2 border ${activeTab === 'preparing' ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <ChefHat size={18} className={activeTab === 'preparing' ? 'text-amber-600 animate-bounce' : 'text-slate-400'} />
                    <span className="hidden md:inline">Preparing (Kitchen)</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] md:text-xs bg-amber-100 text-amber-800 font-bold rounded-full">
                    {orders.filter(o => o.orderStatus === 'preparing').length}
                  </span>
                </button>
              )}

              {/* Shipped Queue Button */}
              <button 
                onClick={() => setActiveTab('shipped')}
                title="Shipped Orders"
                className={`w-full py-2.5 px-2 md:px-4 text-xs font-bold transition-all rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-between gap-1.5 md:gap-2 border ${activeTab === 'shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <Truck size={18} className={activeTab === 'shipped' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="hidden md:inline">Shipped Orders</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] md:text-xs bg-indigo-100 text-indigo-700 font-bold rounded-full">
                  {orders.filter(o => o.orderStatus === 'shipped').length}
                </span>
              </button>

              {/* Wasted / Damaged Queue Button */}
              <button 
                onClick={() => setActiveTab('wasted')}
                title="Wasted / Damaged Orders"
                className={`w-full py-2.5 px-2 md:px-4 text-xs font-bold transition-all rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-between gap-1.5 md:gap-2 border ${activeTab === 'wasted' ? 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={activeTab === 'wasted' ? 'text-rose-600' : 'text-slate-400'} />
                  <span className="hidden md:inline">Wasted / Damaged</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] md:text-xs bg-rose-100 text-rose-800 font-bold rounded-full">
                  {orders.filter(o => o.orderStatus === 'wasted').length}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Scrollable Orders Grid Panel */}
          <div className="flex-1 overflow-y-auto h-full pr-1 pb-10">
            {loading ? (
              <div className="text-center py-20 text-slate-500 font-bold">Connecting to live order feed...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 bg-white rounded-2xl">
                <ClipboardList size={40} className="mx-auto text-slate-400 mb-4" />
                <h4 className="font-bold text-lg">No Orders in this queue</h4>
                <p className="text-sm text-slate-400 mt-1">New incoming orders will appear here automatically.</p>
              </div>
            ) : (
              /* Mobile: 1 col, Tablets: 3 cols, Desktops: 4 cols */
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredOrders.map(order => {
                  const fullAddress = order.address 
                    ? `${order.address.addressLine1 || ''}, ${order.address.city || ''}, ${order.address.state || ''} - ${order.address.pincode || ''}`
                    : 'No delivery address details provided.';
                  
                  return (
                    <div 
                      key={order._id}
                      className={`flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-all ${!order.orderConfirmed && activeTab === 'placed' ? 'ring-2 ring-amber-500/55' : ''} overflow-hidden`}
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-400 font-bold font-mono">ID:</span>
                          <span className="text-sm font-bold font-mono text-blue-600">#{order._id.slice(-6).toUpperCase()}</span>
                          {order.orderType === 'Dine-in' || (order.tableNumber && order.tableNumber !== '0') ? (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-black text-[10px] border border-orange-200">
                              🍽️ Table {order.tableNumber || '1'}
                            </span>
                          ) : order.orderSource === 'counter' ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-black text-[10px] border border-purple-200">
                              🏪 Counter POS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                              🛵 Delivery
                            </span>
                          )}
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
                            <p className="flex items-center gap-1.5"><Phone size={12} /> {order.customerPhone || 'Walk-in Guest'}</p>
                            {order.customerEmail && <p className="flex items-center gap-1.5"><Mail size={12} /> {order.customerEmail}</p>}
                            {order.orderType === 'Dine-in' || (order.tableNumber && order.tableNumber !== '0') ? (
                              <p className="flex items-center gap-1.5 font-black text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-200 mt-1">
                                <Utensils size={12} /> Dine-in: Table {order.tableNumber || '1'} {order.orderBy ? `(Staff: ${order.orderBy})` : ''}
                              </p>
                            ) : order.orderSource === 'counter' ? (
                              <p className="flex items-center gap-1.5 font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 mt-1">
                                🏪 Counter POS {order.orderBy ? `(Staff: ${order.orderBy})` : ''}
                              </p>
                            ) : (
                              <p className="flex items-start gap-1.5 leading-relaxed mt-1"><MapPin size={12} className="shrink-0 mt-0.5" /> {fullAddress}</p>
                            )}
                          </div>

                          {/* Shipped Delivery Person Name Banner */}
                          {order.orderStatus === 'shipped' && (order.DeliveryPersonName || order.deliveryStaff) && (
                            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs mt-2">
                              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                                <span>🛵 Delivery Staff:</span>
                                <span className="font-extrabold text-indigo-700 underline decoration-indigo-300">{order.DeliveryPersonName || (typeof order.deliveryStaff === 'object' ? order.deliveryStaff.name : 'Store Staff')}</span>
                              </div>
                              {order.DeliveryPersonPhone && (
                                <a href={`tel:${order.DeliveryPersonPhone}`} className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                  <Phone size={11} /> {order.DeliveryPersonPhone}
                                </a>
                              )}
                            </div>
                          )}

                          {/* Preparing Kitchen Banner */}
                          {order.orderStatus === 'preparing' && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-2 text-xs text-amber-900 font-bold mt-2">
                              <ChefHat size={16} className="text-amber-600 animate-bounce" />
                              <span>🍳 Cooking in Kitchen</span>
                            </div>
                          )}

                          {/* Wasted / Damaged Banner */}
                          {order.orderStatus === 'wasted' && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-900 font-bold mt-2">
                              <AlertTriangle size={16} className="text-rose-600" />
                              <span>⚠️ Food Damaged / Wasted {order.wastedReason ? `(${order.wastedReason})` : ''}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Items</h5>
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {order.orderItems?.map((item, idx) => {
                              const imgUrl = item.customImage || (item.product?.images && item.product.images[0]);
                              return (
                                <div key={idx} className="flex gap-2 items-center text-xs">
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={item.name} className="h-8 w-8 object-cover rounded border border-slate-200 shadow-sm" />
                                  ) : (
                                    <div className="h-8 w-8 bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center rounded font-bold uppercase text-[10px]" title={item.name}>
                                      {item.name ? item.name.charAt(0) : 'P'}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</p>
                                    <p className="text-[10px] text-slate-400">Qty: {item.qty} × ₹{item.price}</p>
                                  </div>
                                  <span className="font-bold text-slate-700 text-right">₹{item.price * item.qty}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Actions & Status Grid */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50/20 space-y-3">
                        
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
                        <div className="space-y-2 text-xs font-bold">
                          {/* If in Kitchen Preparing status: show Finish Button */}
                          {order.orderStatus === 'preparing' ? (
                            <button
                              onClick={() => handleFinishKitchenOrder(order)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle size={14} /> Finish ({order.orderType === 'Dine-in' ? 'Serve to Table' : 'Ready to Ship'})
                            </button>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2">
                            {order.orderStatus === 'placed' && isKitchenStore && (
                              <button 
                                onClick={() => handleMarkPreparing(order._id)}
                                className="py-2 rounded-xl border flex items-center justify-center gap-1 transition bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 font-extrabold"
                              >
                                <ChefHat size={13} /> Start Preparing
                              </button>
                            )}

                            {order.orderStatus === 'shipped' ? (
                              <button 
                                onClick={() => {
                                  const isOwn = order.ShippingMethod && !order.ShippingMethod.startsWith('By Shipping Company');
                                  setTrackingModal({
                                    isOpen: true,
                                    orderId: order._id,
                                    ShippingMethod: isOwn ? 'By Store Delivery Staff' : 'By Shipping Company',
                                    ShippingCompany: order.ShippingCompany || '',
                                    ShippingTrackingNumber: order.ShippingTrackingNumber || '',
                                    deliveryStaff: order.deliveryStaff?._id || order.deliveryStaff || '',
                                    DeliveryPersonName: order.DeliveryPersonName || '',
                                    DeliveryPersonPhone: order.DeliveryPersonPhone || ''
                                  });
                                }}
                                className="py-2 rounded-xl border flex items-center justify-center gap-1 transition bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                              >
                                <Truck size={12} /> Edit Tracking / Staff
                              </button>
                            ) : order.orderStatus !== 'preparing' && order.orderStatus !== 'wasted' ? (
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
                            ) : null}

                            {order.orderStatus !== 'wasted' && (
                              <button 
                                disabled={!order.orderConfirmed}
                                onClick={() => handleMarkDelivered(order)}
                                className={`py-2 rounded-xl border flex items-center justify-center gap-1 transition ${
                                  !order.orderConfirmed 
                                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                                    : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                                }`}
                              >
                                <CheckCircle size={12} /> {order.orderType === 'Dine-in' ? 'Mark Served' : 'Mark Delivered'}
                              </button>
                            )}

                            {['placed', 'preparing'].includes(order.orderStatus) && (
                              <button 
                                onClick={() => handleMarkWasted(order._id)}
                                className="py-2 rounded-xl border flex items-center justify-center gap-1 transition bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                              >
                                <AlertTriangle size={12} /> Mark Wasted
                              </button>
                            )}

                            {order.orderStatus !== 'wasted' && (
                              <button 
                                onClick={() => handleCancelOrder(order._id)}
                                className="py-2 rounded-xl border flex items-center justify-center gap-1 transition bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              >
                                <XCircle size={12} /> Cancel Order
                              </button>
                            )}

                            {order.orderStatus === 'shipped' && (
                              <button 
                                disabled={!order.orderConfirmed}
                                onClick={() => handleReturnOrder(order._id)}
                                className="py-2 rounded-xl border flex items-center justify-center gap-1 transition bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                              >
                                <RotateCcw size={12} /> Mark Returned
                              </button>
                            )}
                          </div>
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

      {/* Cancel Confirmation Modal */}
      {confirmCancelModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 pt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border-2 border-red-100">
                <AlertCircle size={28} className="text-red-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Cancel Order?</h3>
              <p className="text-sm text-slate-500 mb-6 px-2">
                Do you really want to cancel this order? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setConfirmCancelModal({ isOpen: false, orderId: null })}
                  className="flex-1 px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  No, Keep
                </button>
                <button 
                  onClick={submitCancel}
                  className="flex-1 px-4 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Cancel
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
              <h3 className="text-lg font-bold text-slate-800">Tracking Information</h3>
              <button 
                onClick={() => setTrackingModal({ ...trackingModal, isOpen: false })} 
                className="text-slate-400 hover:text-red-500 transition-colors text-2xl"
              >
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
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tracking Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter tracking number"
                        value={trackingModal.ShippingTrackingNumber}
                        onChange={e => setTrackingModal({...trackingModal, ShippingTrackingNumber: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Select Store Delivery Staff</label>
                      <select
                        value={trackingModal.deliveryStaff || ''}
                        onChange={e => {
                          const selectedId = e.target.value;
                          const found = deliveryStaffList.find(s => s._id === selectedId);
                          setTrackingModal({
                            ...trackingModal,
                            deliveryStaff: selectedId,
                            DeliveryPersonName: found ? found.name : trackingModal.DeliveryPersonName,
                            DeliveryPersonPhone: found ? (found.phone || '') : trackingModal.DeliveryPersonPhone
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white mb-3"
                      >
                        <option value="">-- Choose Registered Delivery Staff --</option>
                        {deliveryStaffList.map(staff => (
                          <option key={staff._id} value={staff._id}>
                            {staff.name} {staff.phone ? `(${staff.phone})` : `[${staff.staffId}]`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Person Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Ramesh Kumar"
                        value={trackingModal.DeliveryPersonName}
                        onChange={e => setTrackingModal({...trackingModal, DeliveryPersonName: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter 10-digit phone number"
                        value={trackingModal.DeliveryPersonPhone}
                        onChange={e => setTrackingModal({...trackingModal, DeliveryPersonPhone: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 pt-4 mt-2">
                  <button 
                    onClick={() => setTrackingModal({ ...trackingModal, isOpen: false })}
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
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default LiveOrderManage;
