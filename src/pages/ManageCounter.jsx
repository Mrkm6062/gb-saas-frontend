import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { generateReceiptPdf, downloadReceiptPdf, sendWhatsAppWithReceiptPdf } from '../utils/receiptPdf';
import { 
  CreditCard, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Clock, 
  User, 
  LogOut, 
  CheckCircle, 
  Printer,
  QrCode,
  Download,
  FileText, 
  Send, 
  Phone, 
  Mail, 
  X, 
  MessageCircle, 
  Smartphone, 
  Tag, 
  Layers,
  Utensils,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Receipt,
  Lock,
  Store as StoreIcon,
  ChefHat,
  Truck,
  AlertTriangle,
  Check,
  Eye,
  MapPin,
  ExternalLink
} from 'lucide-react';

const ManageCounter = () => {
  const { storeId: urlStoreId } = useParams();
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // Staff Auth State
  // -------------------------------------------------------------
  const [staffToken, setStaffToken] = useState(() => localStorage.getItem('gb_pos_staff_token') || '');
  const [staffData, setStaffData] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_pos_staff_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Login form state
  const [loginStaffId, setLoginStaffId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const defaultStoreCode = urlStoreId || localStorage.getItem('gb_active_store_id') || localStorage.getItem('gb_pos_store_code') || '';
  const [loginStoreCode, setLoginStoreCode] = useState(defaultStoreCode);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (urlStoreId) {
      setLoginStoreCode(urlStoreId);
    }
  }, [urlStoreId]);

  // -------------------------------------------------------------
  // Multi-View Navigation (Counter POS vs Kitchen Area vs Delivery)
  // -------------------------------------------------------------
  const [activeView, setActiveView] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_pos_staff_data');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed?.role === 'kitchen') return 'kitchen';
      if (parsed?.role === 'delivery') return 'delivery';
    } catch (e) {}
    return 'counter'; // 'counter' | 'kitchen' | 'delivery'
  });

  // Kitchen Area (KDS) & Delivery State
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const [kitchenFilter, setKitchenFilter] = useState('active'); // 'active' | 'placed' | 'preparing' | 'wasted'
  const [deliveryStaffList, setDeliveryStaffList] = useState([]);
  const [shippingModal, setShippingModal] = useState({
    isOpen: false,
    order: null,
    deliveryStaffId: '',
    DeliveryPersonName: '',
    DeliveryPersonPhone: ''
  });
  const kitchenOrderIdsRef = useRef(new Set());

  // Delivery Staff Assigned Orders State
  const [myAssignedOrders, setMyAssignedOrders] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState(null);
  const [upiModal, setUpiModal] = useState({
    isOpen: false,
    order: null,
    loading: false,
    successMsg: '',
    errorMsg: '',
    manualUtr: ''
  });

  // Play Kitchen Notification Tone
  const playKitchenTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {}
  };

  // -------------------------------------------------------------
  // POS & Catalog State
  // -------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Live Clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState('0');
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'upi' | 'card'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Digital Bill Modal State
  const [completedOrder, setCompletedOrder] = useState(null);
  const [billDeliveryMethod, setBillDeliveryMethod] = useState('whatsapp'); // 'whatsapp' | 'email'
  const [billCustomerEmail, setBillCustomerEmail] = useState('');
  const [billCustomerPhone, setBillCustomerPhone] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState({ text: '', type: '' });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waStatusMsg, setWaStatusMsg] = useState({ text: '', type: '' });

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeStore = staffData?.store || {};
  const currentStoreId = activeStore._id || activeStore.storeId || urlStoreId;

  // Fetch store checkout & payment settings (to check if online payment / Razorpay is enabled)
  useEffect(() => {
    if (!currentStoreId) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/checkout-settings/public`, {
          headers: { 'x-store-id': currentStoreId }
        });
        if (res.ok) {
          const data = await res.json();
          setCheckoutSettings(data);
        }
      } catch (err) {
        console.warn('Failed to load checkout settings:', err);
      }
    };
    fetchSettings();
  }, [currentStoreId]);

  const isOnlinePaymentEnabled = Boolean(checkoutSettings?.razorpayEnabled);

  // -------------------------------------------------------------
  // Staff Login Handler
  // -------------------------------------------------------------
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!loginStaffId || !loginPassword) {
      setLoginError('Staff ID and password are required.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: loginStaffId.trim(),
          password: loginPassword,
          storeCode: loginStoreCode.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('gb_pos_staff_token', data.token);
        localStorage.setItem('gb_pos_staff_data', JSON.stringify(data.staff));
        if (data.staff?.store?.storeId) {
          localStorage.setItem('gb_pos_store_code', data.staff.store.storeId);
        }
        setStaffToken(data.token);
        setStaffData(data.staff);
        setLoginPassword('');
        if (data.staff?.role === 'kitchen') {
          setActiveView('kitchen');
        } else if (data.staff?.role === 'delivery') {
          setActiveView('delivery');
        } else {
          setActiveView('counter');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoginError(err.message || 'Network error logging in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('gb_pos_staff_token');
    localStorage.removeItem('gb_pos_staff_data');
    setStaffToken('');
    setStaffData(null);
    setCart([]);
  };

  // -------------------------------------------------------------
  // Fetch Kitchen Orders & Active Delivery Staff
  // -------------------------------------------------------------
  const fetchKitchenData = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/kitchen-orders?storeId=${currentStoreId}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = data.orders || [];

        // Check for new incoming orders to play tone
        if (kitchenOrderIdsRef.current.size > 0) {
          const hasNew = incoming.some(o => !kitchenOrderIdsRef.current.has(o._id) && ['placed', 'preparing'].includes(o.orderStatus));
          if (hasNew) playKitchenTone();
        }
        kitchenOrderIdsRef.current = new Set(incoming.map(o => o._id));
        setKitchenOrders(incoming);
      }
    } catch (err) {
      console.warn('Error fetching kitchen orders:', err);
    }
  };

  const fetchDeliveryStaff = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/delivery-staff?storeId=${currentStoreId}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveryStaffList(data.deliveryStaff || []);
      }
    } catch (err) {}
  };

  // Fetch Delivery Staff assigned orders (when role is delivery or view is delivery)
  const fetchMyAssignedOrders = async () => {
    if (!staffToken) return;
    setDeliveryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/orders`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyAssignedOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Error fetching assigned orders:', err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  // Polling for Kitchen Orders (every 5 seconds)
  useEffect(() => {
    if (currentStoreId) {
      fetchKitchenData();
      fetchDeliveryStaff();
      const interval = setInterval(fetchKitchenData, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStoreId]);

  // Polling for Delivery Staff orders (every 6 seconds if delivery role)
  useEffect(() => {
    if (staffToken && (staffData?.role === 'delivery' || activeView === 'delivery')) {
      fetchMyAssignedOrders();
      const interval = setInterval(fetchMyAssignedOrders, 6000);
      return () => clearInterval(interval);
    }
  }, [staffToken, activeView, staffData?.role]);

  // Kitchen Actions: Start Preparing, Mark Wasted, Finish
  const handleStartPreparing = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/kitchen-orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'preparing' })
      });
      if (res.ok) fetchKitchenData();
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    }
  };

  const handleMarkWasted = async (orderId) => {
    const reason = window.prompt("Reason for marking this order as Wasted / Damaged:", "Food damaged / prepared & wasted");
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/kitchen-orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'wasted', wastedReason: reason || 'Damaged / Wasted' })
      });
      if (res.ok) fetchKitchenData();
    } catch (err) {
      alert(`Failed to mark wasted: ${err.message}`);
    }
  };

  // Finish Kitchen Order:
  // Dine-in -> Delivered
  // Delivery -> Shipped (opens modal to select delivery staff or confirms)
  const handleFinishKitchenOrder = (order) => {
    const isDineIn = order.orderType && order.orderType.toLowerCase() === 'dine-in';
    if (isDineIn) {
      submitFinishOrder(order._id, true);
    } else {
      // Delivery order -> open modal to assign delivery staff
      const defaultStaff = deliveryStaffList.length > 0 ? deliveryStaffList[0] : null;
      setShippingModal({
        isOpen: true,
        order,
        deliveryStaffId: defaultStaff?._id || '',
        DeliveryPersonName: defaultStaff?.name || order.DeliveryPersonName || 'Store Delivery Staff',
        DeliveryPersonPhone: defaultStaff?.phone || order.DeliveryPersonPhone || ''
      });
    }
  };

  const submitFinishOrder = async (orderId, isDineIn, payload = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/kitchen-orders/${orderId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchKitchenData();
        setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' });
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to finish order');
      }
    } catch (err) {
      alert(`Error finishing order: ${err.message}`);
    }
  };

  // Delivery Staff: Mark Assigned Order as Delivered
  const handleMarkDeliveryDelivered = async (orderId) => {
    if (!window.confirm("Confirm you have delivered this order to the customer?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({ orderStatus: 'delivered' })
      });
      if (res.ok) {
        fetchMyAssignedOrders();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update order');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Fetch Products & Categories for Store
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentStoreId) return;

    const fetchStoreData = async () => {
      setLoadingProducts(true);
      try {
        const catalogUrl = `${API_BASE_URL}/api/store-staff/pos-catalog?storeId=${currentStoreId}`;
        const prodRes = await fetch(catalogUrl);
        if (prodRes.ok) {
          const catalogData = await prodRes.json();
          setProducts(catalogData.products || []);
          setCategories(catalogData.categories || []);
          if (catalogData.store) {
            setStaffData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                store: {
                  ...prev.store,
                  ...catalogData.store,
                  tables: catalogData.store.tables && catalogData.store.tables.length > 0
                    ? catalogData.store.tables
                    : (prev.store?.tables || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
                }
              };
            });
          }
        } else {
          console.error('Failed to load POS catalog:', prodRes.status);
        }
      } catch (err) {
        console.error('Error fetching POS catalog:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchStoreData();
  }, [staffToken, currentStoreId]);

  // -------------------------------------------------------------
  // Cart Actions
  // -------------------------------------------------------------
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          price: Number(product.price) || 0,
          qty: 1,
          image: product.images && product.images[0] ? product.images[0] : null
        }
      ];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponMessage({ text: '', type: '' });
  };

  // -------------------------------------------------------------
  // Coupon Handling
  // -------------------------------------------------------------
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponMessage({ text: 'Validating coupon...', type: 'info' });

    try {
      const res = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': currentStoreId
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          cartTotal: rawSubtotal,
          storeId: currentStoreId
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        setDiscountAmount(data.discountAmount || 0);
        setCouponMessage({ text: `✓ Coupon applied! Saved ₹${data.discountAmount}`, type: 'success' });
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage({ text: data.message || 'Invalid or expired coupon', type: 'error' });
      }
    } catch (e) {
      setCouponMessage({ text: 'Failed to validate coupon', type: 'error' });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponMessage({ text: '', type: '' });
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'ALL' ||
      (p.category && (
        p.category._id === selectedCategory || 
        p.category === selectedCategory || 
        String(p.category) === String(selectedCategory)
      )) ||
      (p.categoryName && p.categoryName === selectedCategory);
    const matchesSearch =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  // -------------------------------------------------------------
  // Submit Order (Counter Sale)
  // -------------------------------------------------------------
  const handleCreateCounterOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const orderItems = cart.map((item) => ({
        product: item._id,
        name: item.name,
        price: item.price,
        qty: item.qty
      }));

      const isDineIn = selectedTable && selectedTable !== '0';

      const orderPayload = {
        storeId: currentStoreId,
        customerName: customerPhone ? `Customer (${customerPhone})` : 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerEmail: '',
        orderItems,
        totalAmount: finalTotal,
        discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        shippingCharge: 0,
        paymentMethod: paymentType, // 'cash' | 'upi' | 'card'
        orderSource: 'counter',
        orderType: isDineIn ? 'Dine-in' : 'delivery',
        tableNumber: selectedTable || '0',
        orderBy: staffData?.staffId ? `${staffData.name} (${staffData.staffId})` : (staffData?.name || 'Counter Staff'),
        paymentStatus: 'paid',
        orderStatus: 'placed'
      };

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': currentStoreId
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok) {
        const created = data.order || data;
        setCompletedOrder(created);
        setBillCustomerPhone(customerPhone || '');
        setBillCustomerEmail('');
        setEmailStatusMsg({ text: '', type: '' });
        setWaStatusMsg({ text: '', type: '' });

        // Reset cart for next order
        setCart([]);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponCode('');
        setCustomerPhone('');
        setSelectedTable('0');
      } else {
        alert(data.message || 'Failed to complete order.');
      }
    } catch (err) {
      alert(`Network error creating order: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // -------------------------------------------------------------
  // Digital Bill Sending (Email / WhatsApp / Print)
  // -------------------------------------------------------------
  const handleSendBillEmail = async () => {
    if (!billCustomerEmail || !billCustomerEmail.includes('@')) {
      setEmailStatusMsg({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMsg({ text: 'Sending digital invoice email...', type: 'info' });

    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/send-digital-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: completedOrder._id,
          customerEmail: billCustomerEmail.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEmailStatusMsg({ text: `✓ Digital invoice sent to ${billCustomerEmail}!`, type: 'success' });
      } else {
        setEmailStatusMsg({ text: data.message || 'Failed to send email.', type: 'error' });
      }
    } catch (err) {
      setEmailStatusMsg({ text: err.message || 'Network error sending invoice.', type: 'error' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenWhatsAppBill = async () => {
    if (!completedOrder) return;
    setIsGeneratingPdf(true);
    setWaStatusMsg({ text: '', type: '' });
    try {
      const receiptUrl = `${API_BASE_URL}/api/orders/receipt/${completedOrder._id}`;
      const res = await sendWhatsAppWithReceiptPdf({
        order: completedOrder,
        store: activeStore,
        staff: staffData,
        targetPhone: billCustomerPhone,
        receiptUrl
      });
      if (res?.message) {
        setWaStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
      }
    } catch (err) {
      console.error('Error sharing receipt:', err);
      setWaStatusMsg({ text: `Failed to share receipt: ${err.message}`, type: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  
  // Razorpay Dynamic Loader for UPI collection
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'Razorpay' in window) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOpenUpiModal = (order) => {
    setUpiModal({
      isOpen: true,
      order,
      loading: false,
      successMsg: '',
      errorMsg: '',
      manualUtr: ''
    });
  };

  const handleCollectUpiRazorpay = async () => {
    const order = upiModal.order;
    if (!order) return;

    setUpiModal((prev) => ({ ...prev, loading: true, errorMsg: '', successMsg: '' }));
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      // Create Razorpay order via backend
      const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': currentStoreId
        },
        body: JSON.stringify({
          amount: order.totalAmount,
          storeId: currentStoreId,
          orderId: order._id
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to initialize payment gateway.');
      }

      const rzpOrder = await res.json();
      const razorpayKey = rzpOrder.keyId || checkoutSettings?.razorpayKeyId;

      if (!razorpayKey) {
        throw new Error('Razorpay API Key is not configured by the store owner.');
      }

      const options = {
        key: razorpayKey,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        name: activeStore.storeName || 'Store Payment',
        description: `Order #${order._id.slice(-6).toUpperCase()} Payment (Delivery)`,
        order_id: rzpOrder.id,
        prefill: {
          name: order.customerName || 'Customer',
          contact: order.customerPhone || ''
        },
        theme: {
          color: '#4f46e5'
        },
        handler: async function (paymentResponse) {
          try {
            // 1. Verify Razorpay signature
            await fetch(`${API_BASE_URL}/api/orders/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...paymentResponse, orderId: order._id })
            });

            // 2. Update staff order status to mark as paid via UPI
            await fetch(`${API_BASE_URL}/api/store-staff/orders/${order._id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`
              },
              body: JSON.stringify({
                paymentStatus: 'paid',
                paymentMethod: 'upi',
                paymentId: paymentResponse.razorpay_payment_id
              })
            });

            fetchMyAssignedOrders();
            setUpiModal((prev) => ({
              ...prev,
              loading: false,
              successMsg: `✓ Payment of ₹${order.totalAmount} received successfully via UPI!`
            }));
          } catch (verifyErr) {
            setUpiModal((prev) => ({
              ...prev,
              loading: false,
              errorMsg: `Payment succeeded but verification failed: ${verifyErr.message}`
            }));
          }
        },
        modal: {
          ondismiss: function () {
            setUpiModal((prev) => ({ ...prev, loading: false }));
          }
        }
      };

      const paymentObj = new window.Razorpay(options);
      paymentObj.open();
    } catch (err) {
      setUpiModal((prev) => ({ ...prev, loading: false, errorMsg: err.message }));
    }
  };

  const handleManualUpiConfirm = async () => {
    const order = upiModal.order;
    if (!order) return;

    setUpiModal((prev) => ({ ...prev, loading: true, errorMsg: '', successMsg: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/store-staff/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: 'upi',
          paymentId: upiModal.manualUtr ? `UPI-${upiModal.manualUtr.trim()}` : `UPI-${Date.now()}`
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update order payment.');
      }

      fetchMyAssignedOrders();
      setUpiModal((prev) => ({
        ...prev,
        loading: false,
        successMsg: `✓ Confirmed! Order #${order._id.slice(-6).toUpperCase()} marked as PAID via UPI.`
      }));
    } catch (err) {
      setUpiModal((prev) => ({ ...prev, loading: false, errorMsg: err.message }));
    }
  };

  const handleSendUpiWhatsAppLink = () => {
    const order = upiModal.order;
    if (!order) return;
    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const orderNo = order._id.slice(-6).toUpperCase();
    const storeName = activeStore.storeName || 'Our Store';

    let text = `👋 Hello ${order.customerName || 'Customer'},\n\n`;
    text += `Your order *#${orderNo}* from *${storeName}* is out for delivery with our delivery executive *${staffData?.name || 'Staff'}*.\n\n`;
    text += `💵 *Total Amount Due:* ₹${order.totalAmount}\n\n`;
    text += `Please have your UPI app ready or pay when our delivery executive arrives.\n`;
    text += `Thank you!`;

    const encoded = encodeURIComponent(text);
    const waUrl = phoneWithCountry
      ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
  };

  const handleDownloadReceiptPdf = () => {
    if (!completedOrder) return;
    try {
      downloadReceiptPdf(completedOrder, activeStore, staffData);
      setWaStatusMsg({ text: '✓ PDF Receipt downloaded successfully!', type: 'success' });
    } catch (err) {
      alert(`Could not download PDF: ${err.message}`);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) {
      alert('Please allow popups to print receipts.');
      return;
    }

    const storeName = activeStore.storeName || 'Store Receipt';
    const orderNo = completedOrder._id ? completedOrder._id.slice(-6).toUpperCase() : '';
    const items = completedOrder.orderItems || [];

    const itemsHtml = items
      .map(
        (i) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
        <span>${i.qty}x ${i.name}</span>
        <span style="font-weight:bold;">₹${i.price * i.qty}</span>
      </div>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${orderNo}</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 15px; margin: 0; color: #000; width: 280px; }
          .center { text-align: center; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin:0 0 5px;">${storeName}</h2>
          <p style="margin:0; font-size:11px;">${activeStore.locationAddress || 'Thank you for your visit'}</p>
          <div class="divider"></div>
          <p style="margin:2px 0; font-size:12px;">RECEIPT #${orderNo}</p>
          <p style="margin:2px 0; font-size:11px;">${new Date().toLocaleString()}</p>
          ${completedOrder.tableNumber && completedOrder.tableNumber !== '0' ? `<p class="bold" style="margin:2px 0; font-size:12px;">TABLE: ${completedOrder.tableNumber}</p>` : ''}
          <p style="margin:2px 0; font-size:10px;">Staff: ${completedOrder.orderBy || staffData?.name}</p>
        </div>
        <div class="divider"></div>
        <div>
          ${itemsHtml}
        </div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:14px;" class="bold">
          <span>TOTAL:</span>
          <span>₹${completedOrder.totalAmount}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px;">
          <span>Payment:</span>
          <span style="text-transform:uppercase;">${completedOrder.paymentMethod || 'CASH'} (PAID)</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size:11px; margin-top:10px;">
          <p style="margin:0;">Thank you! Visit again.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  // -------------------------------------------------------------
  // 1. RENDER STAFF LOGIN VIEW IF NOT LOGGED IN
  // -------------------------------------------------------------
  if (!staffToken || !staffData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
              <CreditCard size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Counter POS Login</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Enter your Staff ID and Password to start your billing shift
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold uppercase text-slate-700">
                  Store ID / Code
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200">
                  <Lock size={10} className="text-slate-400" /> Locked
                </span>
              </div>
              <div className="relative">
                <StoreIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={loginStoreCode || 'Default Store'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono font-bold text-sm cursor-not-allowed select-none focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Staff ID (Username) *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP01"
                  value={loginStaffId}
                  onChange={(e) => setLoginStaffId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono font-bold text-sm text-slate-900 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>Login to Counter POS →</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
            Contact your store owner if you need your Staff ID or password reset.
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. RENDER MAIN COUNTER SALE POS VIEW (70% Left / 30% Right)
  // -------------------------------------------------------------
  const tables = activeStore.tables || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Resolve Store Custom ID (e.g. GBS006) - NEVER show raw MongoDB ObjectId
  const rawIdCandidate = activeStore?.storeId || staffData?.store?.storeId || urlStoreId || '';
  const storeCustomId = (/^[0-9a-fA-F]{24}$/.test(rawIdCandidate))
    ? (activeStore?.storeSlug || staffData?.store?.storeSlug || 'STORE')
    : (rawIdCandidate || activeStore?.storeSlug || '');

  // Strict Role-Based Access Control: Staff can only access their assigned role's view
  const userRole = (staffData?.role || 'counter').toLowerCase();
  const isManager = userRole === 'manager';
  const canAccessCounter = isManager || ['counter', 'cashier', 'waiter'].includes(userRole);
  const canAccessKitchen = isManager || userRole === 'kitchen';
  const canAccessDelivery = isManager || userRole === 'delivery';

  // Force active view strictly to role-permitted terminal
  const effectiveView = (() => {
    if (userRole === 'kitchen') return 'kitchen';
    if (userRole === 'delivery') return 'delivery';
    if (!canAccessCounter && canAccessKitchen) return 'kitchen';
    if (!canAccessCounter && canAccessDelivery) return 'delivery';
    if (isManager) return activeView;
    return 'counter';
  })();

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none">
      
      {/* ========================================================= */}
      {/* TOP HEADER: Responsive on Mobile & Desktop                */}
      {/* ========================================================= */}
      <header className="min-h-16 bg-slate-900 text-white px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
            {effectiveView === 'kitchen' ? <ChefHat size={20} /> : effectiveView === 'delivery' ? <Truck size={20} /> : <CreditCard size={18} />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs md:text-base font-black truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs leading-tight">
              {activeStore.storeName || 'Counter POS'}
            </h1>
            {storeCustomId && (
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-mono text-[9px] md:text-[10px] font-black border border-orange-500/30">
                ID: {storeCustomId}
              </span>
            )}
          </div>
        </div>

        {/* View Switcher: Manager can switch; non-managers only see their assigned role terminal */}
        {isManager ? (
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView('counter')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                effectiveView === 'counter'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CreditCard size={14} />
              <span>Counter POS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('kitchen')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 relative ${
                effectiveView === 'kitchen'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Utensils size={14} />
              <span>Kitchen Area</span>
              {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black leading-none animate-pulse">
                  {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('delivery')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                effectiveView === 'delivery'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Truck size={14} />
              <span>Delivery Orders</span>
              {myAssignedOrders.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-400 text-slate-900 text-[10px] font-black leading-none">
                  {myAssignedOrders.length}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            {canAccessKitchen && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shadow-xs">
                <ChefHat size={16} />
                <span>Kitchen Display Terminal (KDS)</span>
                {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black leading-none animate-pulse">
                    {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length}
                  </span>
                )}
              </div>
            )}
            {canAccessDelivery && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black shadow-xs">
                <Truck size={16} />
                <span>Delivery Staff Terminal</span>
                {myAssignedOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-400 text-slate-900 text-[10px] font-black leading-none">
                    {myAssignedOrders.length}
                  </span>
                )}
              </div>
            )}
            {canAccessCounter && !canAccessKitchen && !canAccessDelivery && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-black shadow-xs">
                <CreditCard size={16} />
                <span>Counter Sale POS Terminal</span>
              </div>
            )}
          </div>
        )}

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-amber-400">
          <Clock size={14} className="text-amber-400" />
          <span>
            {currentDateTime.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
            {' • '}
            {currentDateTime.toLocaleTimeString('en-IN', { hour12: true })}
          </span>
        </div>

        {/* Staff Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-black text-slate-100 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{staffData.name}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                {staffData.staffId}
              </span>
              <span className="capitalize text-[10px] text-slate-400">
                {staffData.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleStaffLogout}
            title="Log Out / End Shift"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. VIEW: MAIN COUNTER POS                                 */}
      {/* ========================================================= */}
      {effectiveView === 'counter' && canAccessCounter && (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ------------------------------------------------------- */}
        {/* LEFT COLUMN: Full width on mobile, 70% on desktop       */}
        {/* ------------------------------------------------------- */}
        <div className="w-full md:w-[68%] lg:w-[70%] xl:w-[72%] flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden pb-16 md:pb-0">
          
          {/* Top Catalog Toolbar: Staff Name/ID & Search */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Live POS Staff:</span>
              <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 font-extrabold text-xs">
                👤 {staffData.name} ({staffData.staffId})
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
                {currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative w-72 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search products or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategory(c._id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  selectedCategory === c._id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingProducts ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                Loading products catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Search size={36} className="mb-2 text-slate-300" />
                <p className="font-bold text-sm">No products found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {filteredProducts.map((p) => {
                  const inCartItem = cart.find((i) => i._id === p._id);
                  const img = p.images && p.images[0] ? p.images[0] : null;

                  return (
                    <div
                      key={p._id}
                      onClick={() => addToCart(p)}
                      className={`group relative bg-white rounded-2xl border transition-all duration-150 p-2.5 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md ${
                        inCartItem
                          ? 'border-orange-500 ring-2 ring-orange-400/40'
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      {inCartItem && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                          {inCartItem.qty}
                        </span>
                      )}

                      <div className="h-28 w-full bg-slate-50 rounded-xl overflow-hidden mb-2 relative flex items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                        ) : (
                          <div className="text-slate-300 font-bold text-xs uppercase">No Img</div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-xs text-slate-800 line-clamp-2 leading-tight mb-1">
                          {p.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black text-emerald-700">
                            ₹{p.price}
                          </span>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white flex items-center justify-center transition font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* RIGHT COLUMN: 30% Cart & Checkout                       */}
        {/* ------------------------------------------------------- */}
        <div className="w-[32%] lg:w-[30%] xl:w-[28%] flex flex-col bg-white overflow-hidden shadow-lg">
          
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-orange-600" />
              <h2 className="font-black text-slate-900 text-sm">
                Cart Items ({cart.reduce((sum, i) => sum + i.qty, 0)})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <ShoppingCart size={40} className="text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click on products from the left to add items to this sale.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item._id}
                  className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">P</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] font-extrabold text-orange-600">
                        ₹{item.price * item.qty} <span className="text-slate-400 font-normal">(@₹{item.price})</span>
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateCartQty(item._id, -1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100 text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-black text-xs text-slate-900">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item._id, 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100 text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-500 hover:text-red-700 ml-1 p-1"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Selector (Optional for restaurant counter orders) */}
          <div className="px-4 py-2 border-t border-slate-200 bg-orange-50/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Utensils size={14} className="text-orange-600" />
              <span>Dining Table:</span>
            </div>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="px-2.5 py-1 text-xs font-extrabold border border-orange-200 rounded-lg bg-white text-slate-800 focus:outline-none"
            >
              <option value="0">Takeaway / Counter</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  Table {t} (Dine-in)
                </option>
              ))}
            </select>
          </div>

          {/* Coupon Code Section */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 shrink-0 space-y-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Coupon Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={appliedCoupon !== null}
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-orange-500 disabled:bg-slate-100"
                />
              </div>
              {appliedCoupon ? (
                <button
                  onClick={handleRemoveCoupon}
                  className="px-3 py-1.5 bg-red-100 text-red-700 font-bold text-xs rounded-lg hover:bg-red-200"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim()}
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 disabled:opacity-50"
                >
                  Apply
                </button>
              )}
            </div>
            {couponMessage.text && (
              <p className={`text-[10px] font-bold ${couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                {couponMessage.text}
              </p>
            )}
          </div>

          {/* Bottom Checkout Section */}
          <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3">
            
            {/* Customer Mobile Number (Optional) */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                Customer Mobile Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit mobile for digital bill"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1 text-xs text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">₹{rawSubtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-extrabold">
                  <span>Coupon Discount:</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-emerald-700">₹{finalTotal}</span>
              </div>
            </div>

            {/* Payment Type Tabs: Cash, UPI, Card */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                Payment Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`py-2 rounded-xl text-xs font-black transition border ${
                    paymentType === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('upi')}
                  className={`py-2 rounded-xl text-xs font-black transition border ${
                    paymentType === 'upi'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📱 UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('card')}
                  className={`py-2 rounded-xl text-xs font-black transition border ${
                    paymentType === 'card'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💳 Card
                </button>
              </div>
            </div>

            {/* Dynamic Button: Cash Collected OR Payment Received */}
            <button
              type="button"
              onClick={handleCreateCounterOrder}
              disabled={cart.length === 0 || isSubmittingOrder}
              className={`w-full py-3.5 rounded-xl text-white font-black text-sm uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                paymentType === 'cash'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : paymentType === 'upi'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
              }`}
            >
              {isSubmittingOrder ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Processing...
                </>
              ) : paymentType === 'cash' ? (
                <>
                  <CheckCircle size={18} /> Cash Collected & Send to Kitchen (₹{finalTotal})
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Payment Received & Send to Kitchen (₹{finalTotal})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIEW: KITCHEN AREA (KDS - Kitchen Display System)      */}
      {/* ========================================================= */}
      {effectiveView === 'kitchen' && canAccessKitchen && (
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {/* Kitchen Sub-Toolbar */}
          <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
                <Utensils size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Kitchen Display System (KDS)</h2>
                <p className="text-xs text-slate-500">Live incoming counter & table orders for preparation</p>
              </div>
            </div>

            {/* Kitchen Status Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setKitchenFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  kitchenFilter === 'active'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Active Orders</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-xs font-black">
                  {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKitchenFilter('placed')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  kitchenFilter === 'placed'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Placed</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-xs font-black">
                  {kitchenOrders.filter(o => o.orderStatus === 'placed').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKitchenFilter('preparing')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  kitchenFilter === 'preparing'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🍳 Cooking</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-xs font-black">
                  {kitchenOrders.filter(o => o.orderStatus === 'preparing').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKitchenFilter('wasted')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  kitchenFilter === 'wasted'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚠️ Wasted / Damaged</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-xs font-black">
                  {kitchenOrders.filter(o => o.orderStatus === 'wasted').length}
                </span>
              </button>
            </div>
          </div>

          {/* Kitchen Orders Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {(() => {
              const filtered = kitchenOrders.filter(order => {
                if (kitchenFilter === 'active') return ['placed', 'preparing'].includes(order.orderStatus);
                return order.orderStatus === kitchenFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                      <Utensils size={32} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800">No Orders in this Kitchen Queue</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      New orders placed from Counter POS or storefront will appear here automatically.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map(order => {
                    const isDineIn = order.orderType && order.orderType.toLowerCase() === 'dine-in';
                    const isPreparing = order.orderStatus === 'preparing';
                    const isWasted = order.orderStatus === 'wasted';

                    return (
                      <div
                        key={order._id}
                        className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition ${
                          isPreparing
                            ? 'border-amber-400 ring-2 ring-amber-400/30'
                            : isWasted
                            ? 'border-rose-300 opacity-80'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Order Card Header */}
                        <div className={`p-3.5 border-b flex items-center justify-between ${
                          isDineIn ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900">
                              #{order._id.slice(-6).toUpperCase()}
                            </span>
                            {isDineIn ? (
                              <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                                🍽️ Table {order.tableNumber || '1'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                                🛵 Delivery
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Order Details & Customer */}
                        <div className="p-4 flex-1 flex flex-col space-y-3">
                          <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-2">
                            <div>
                              <p className="font-extrabold text-slate-800">{order.customerName || 'Walk-in Guest'}</p>
                              {order.customerPhone && (
                                <p className="text-[11px] text-slate-400 font-mono">📞 {order.customerPhone}</p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isPreparing
                                ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                : isWasted
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </div>

                          {/* Product Items List (Big Bold Kitchen View) */}
                          <div className="flex-1 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Kitchen Items ({order.orderItems?.length || 0})
                            </span>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {order.orderItems?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 font-black flex items-center justify-center text-xs shrink-0">
                                      {item.qty}×
                                    </span>
                                    <span className="font-extrabold text-slate-800 leading-tight">
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-500 font-mono text-[11px]">
                                    ₹{item.price * item.qty}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.wastedReason && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                              <strong>Damage/Waste Note:</strong> {order.wastedReason}
                            </div>
                          )}
                        </div>

                        {/* Order Card Action Buttons */}
                        {!isWasted && (
                          <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-2">
                            {order.orderStatus === 'placed' && (
                              <button
                                type="button"
                                onClick={() => handleStartPreparing(order._id)}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                              >
                                <Utensils size={13} /> 👨‍🍳 Start Preparing
                              </button>
                            )}

                            {/* Prominent Bottom FINISH Button */}
                            <button
                              type="button"
                              onClick={() => handleFinishKitchenOrder(order)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle size={15} /> Finish ({isDineIn ? 'Served / Deliver' : 'Ship to Customer'})
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMarkWasted(order._id)}
                              className="w-full py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition text-center"
                            >
                              ⚠️ Mark Damaged / Wasted
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VIEW: DELIVERY MONITOR (For Store Delivery Staff)       */}
      {/* ========================================================= */}
      {effectiveView === 'delivery' && canAccessDelivery && (
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">My Assigned Delivery Orders</h2>
                <p className="text-xs text-slate-500">
                  Showing shipped orders assigned to <span className="font-extrabold text-slate-700">{staffData?.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={fetchMyAssignedOrders}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
            >
              <RefreshCw size={13} className={deliveryLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {myAssignedOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                  <Truck size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">No Assigned Deliveries</h3>
                <p className="text-xs text-slate-400 mt-1">
                  When the store or kitchen assigns a shipped order to you, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myAssignedOrders.map(order => {
                  const addr = order.address || {};
                  const fullAddress = [addr.addressLine1, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
                  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : '';

                  return (
                    <div key={order._id} className="bg-white rounded-2xl border border-indigo-200 shadow-sm flex flex-col overflow-hidden">
                      <div className="p-3.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
                        <span className="font-mono font-black text-indigo-950">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-black uppercase">
                          Shipped
                        </span>
                      </div>

                      <div className="p-4 flex-1 space-y-3 text-xs">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{order.customerName || 'Customer'}</p>
                          {order.customerPhone && (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold flex items-center gap-1 hover:bg-green-100"
                              >
                                📞 Call {order.customerPhone}
                              </a>
                              <a
                                href={`https://wa.me/91${order.customerPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-700"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {fullAddress && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                            <p className="font-bold text-slate-700 flex items-center gap-1 mb-0.5">
                              <MapPin size={12} className="text-red-500" /> Delivery Address:
                            </p>
                            <p className="leading-relaxed">{fullAddress}</p>
                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-1"
                              >
                                Open in Google Maps →
                              </a>
                            )}
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-2 space-y-1">
                          <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Items:</p>
                          {order.orderItems?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700">
                              <span>{item.qty}× {item.name}</span>
                              <span className="font-mono">₹{item.price * item.qty}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-black">
                          <span className="text-slate-600">Payment Status:</span>
                          {order.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
                              ✓ PAID (₹{order.totalAmount} • {String(order.paymentMethod || 'UPI').toUpperCase()})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-extrabold flex items-center gap-1">
                              PENDING (₹{order.totalAmount} • {String(order.paymentMethod || 'COD').toUpperCase()})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                        {/* Collect UPI Payment Button (Available ONLY if store owner enabled online payment & order is not yet paid) */}
                        {isOnlinePaymentEnabled && order.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleOpenUpiModal(order)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2"
                          >
                            <QrCode size={15} /> Collect UPI Payment (₹{order.totalAmount})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMarkDeliveryDelivered(order._id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle size={15} /> {order.paymentStatus === 'paid' ? 'Mark Delivered ✓' : 'Mark Delivered & Paid ✓'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: ASSIGN DELIVERY STAFF (Kitchen -> Shipped)      */}
      {/* ========================================================= */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">Assign Delivery Staff & Ship</h3>
              </div>
              <button
                onClick={() => setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Order <span className="font-bold text-slate-800">#{shippingModal.order?._id.slice(-6).toUpperCase()}</span> is finished in kitchen and ready to be shipped. Choose the delivery person to assign:
              </p>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Select Store Delivery Staff
                </label>
                <select
                  value={shippingModal.deliveryStaffId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const staff = deliveryStaffList.find(s => s._id === selId);
                    setShippingModal({
                      ...shippingModal,
                      deliveryStaffId: selId,
                      DeliveryPersonName: staff ? staff.name : shippingModal.DeliveryPersonName,
                      DeliveryPersonPhone: staff ? (staff.phone || '') : shippingModal.DeliveryPersonPhone
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="">-- Select Registered Delivery Staff --</option>
                  {deliveryStaffList.map(staff => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} {staff.phone ? `(${staff.phone})` : `[${staff.staffId}]`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Delivery Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={shippingModal.DeliveryPersonName}
                  onChange={(e) => setShippingModal({ ...shippingModal, DeliveryPersonName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Delivery Person Phone
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={shippingModal.DeliveryPersonPhone}
                  onChange={(e) => setShippingModal({ ...shippingModal, DeliveryPersonPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitFinishOrder(shippingModal.order._id, false, {
                      deliveryStaffId: shippingModal.deliveryStaffId || null,
                      DeliveryPersonName: shippingModal.DeliveryPersonName || 'Store Delivery Staff',
                      DeliveryPersonPhone: shippingModal.DeliveryPersonPhone || ''
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow transition"
                >
                  Confirm & Mark Shipped →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. DIGITAL BILL SCREEN / MODAL (After Order Creation)     */}
      {/* ========================================================= */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Top Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center relative">
              <button
                onClick={() => setCompletedOrder(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-md mb-2 font-black">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-black">Payment Received & Order Created!</h2>
              <p className="text-xs text-emerald-100 mt-1 font-semibold">
                Receipt #{completedOrder._id.slice(-6).toUpperCase()} • ₹{completedOrder.totalAmount} ({String(completedOrder.paymentMethod || 'cash').toUpperCase()})
              </p>
            </div>

            {/* Bill Delivery Options */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Select Digital Bill Delivery Option:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillDeliveryMethod('whatsapp')}
                    className={`py-3 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition ${
                      billDeliveryMethod === 'whatsapp'
                        ? 'border-[#25D366] bg-green-50 text-green-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone size={16} className="text-[#25D366]" />
                    Mobile (WhatsApp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDeliveryMethod('email')}
                    className={`py-3 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition ${
                      billDeliveryMethod === 'email'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail size={16} className="text-blue-600" />
                    Customer Email
                  </button>
                </div>
              </div>

              {/* Delivery Option 1: Mobile (SMS & WhatsApp) */}
              {billDeliveryMethod === 'whatsapp' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="tel"
                        maxLength="10"
                        placeholder="Enter 10-digit customer mobile"
                        value={billCustomerPhone}
                        onChange={(e) => setBillCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-green-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Download PDF Option */}
                    <button
                      type="button"
                      onClick={handleDownloadReceiptPdf}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Download size={14} className="text-slate-600" /> Download PDF Bill
                    </button>

                    {/* WhatsApp Option: Enabled with Attached PDF */}
                    <button
                      type="button"
                      onClick={handleOpenWhatsAppBill}
                      disabled={isGeneratingPdf}
                      className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition disabled:opacity-50"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Preparing PDF...
                        </>
                      ) : (
                        <>
                          <MessageCircle size={16} /> Send on WhatsApp
                        </>
                      )}
                    </button>
                  </div>

                  {waStatusMsg.text && (
                    <div
                      className={`text-xs font-bold p-2.5 rounded-xl flex items-center gap-1.5 ${
                        waStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      <CheckCircle size={14} className="shrink-0" />
                      <span>{waStatusMsg.text}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Option 2: Email */}
              {billDeliveryMethod === 'email' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="email"
                        placeholder="customer@example.com"
                        value={billCustomerEmail}
                        onChange={(e) => setBillCustomerEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Sends invoice using store's configured email alerts SMTP.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendBillEmail}
                    disabled={isSendingEmail || !billCustomerEmail}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Sending Invoice...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send Invoice Email
                      </>
                    )}
                  </button>

                  {emailStatusMsg.text && (
                    <p
                      className={`text-xs font-bold ${
                        emailStatusMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {emailStatusMsg.text}
                    </p>
                  )}
                </div>
              )}

              {/* Option 3: Print Bill Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print Receipt / Bill
                </button>
              </div>

              {/* Next Sale Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletedOrder(null)}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider rounded-xl border border-emerald-200 transition"
                >
                  ✓ Start New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL: COLLECT UPI PAYMENT (For Delivery Staff)           */}
      {/* ========================================================= */}
      {upiModal.isOpen && upiModal.order && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-6 relative">
              <button
                onClick={() => setUpiModal({ isOpen: false, order: null, loading: false, successMsg: '', errorMsg: '', manualUtr: '' })}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white mx-auto flex items-center justify-center mb-2 font-black">
                <QrCode size={26} />
              </div>
              <h2 className="text-lg font-black text-center">Collect UPI Payment</h2>
              <p className="text-xs text-indigo-100 text-center font-bold mt-0.5">
                Order #{upiModal.order._id.slice(-6).toUpperCase()} • Amount: ₹{upiModal.order.totalAmount}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer details pill */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">{upiModal.order.customerName || 'Customer'}</p>
                  <p className="text-slate-500 font-mono">{upiModal.order.customerPhone || 'No Phone'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due</span>
                  <span className="text-base font-black text-indigo-700">₹{upiModal.order.totalAmount}</span>
                </div>
              </div>

              {/* Status messages */}
              {upiModal.successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                  <span>{upiModal.successMsg}</span>
                </div>
              )}

              {upiModal.errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0 text-red-500" />
                  <span>{upiModal.errorMsg}</span>
                </div>
              )}

              {/* Action 1: Open Razorpay QR / UPI Flow */}
              {!upiModal.successMsg && (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={upiModal.loading}
                    onClick={handleCollectUpiRazorpay}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {upiModal.loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Initializing UPI Gateway...
                      </>
                    ) : (
                      <>
                        <QrCode size={18} /> Show Customer UPI QR / Apps
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or verify shop QR</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Manual UPI reference confirmation */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Customer Paid to Store QR? (Optional UTR / Ref)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12-digit UPI Ref / UTR (Optional)"
                      value={upiModal.manualUtr}
                      onChange={(e) => setUpiModal(prev => ({ ...prev, manualUtr: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={upiModal.loading}
                      onClick={handleManualUpiConfirm}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Confirm UPI Received
                    </button>
                  </div>

                  {/* Send payment reminder on WhatsApp */}
                  {upiModal.order.customerPhone && (
                    <button
                      type="button"
                      onClick={handleSendUpiWhatsAppLink}
                      className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} className="text-green-600" /> Send Amount Reminder on WhatsApp
                    </button>
                  )}
                </div>
              )}

              {/* Close / Done */}
              <button
                type="button"
                onClick={() => setUpiModal({ isOpen: false, order: null, loading: false, successMsg: '', errorMsg: '', manualUtr: '' })}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                {upiModal.successMsg ? '✓ Close & Return' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageCounter;
