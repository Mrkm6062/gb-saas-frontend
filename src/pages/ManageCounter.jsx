import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
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
  Lock
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
  const [loginStoreCode, setLoginStoreCode] = useState(urlStoreId || '');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeStore = staffData?.store || {};
  const currentStoreId = activeStore._id || activeStore.storeId || urlStoreId;

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
        setStaffToken(data.token);
        setStaffData(data.staff);
        setLoginPassword('');
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
        orderStatus: 'delivered'
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

  const handleOpenWhatsAppBill = () => {
    if (!completedOrder) return;
    const cleanPhone = billCustomerPhone ? billCustomerPhone.replace(/[^0-9]/g, '') : '';
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const storeName = activeStore.storeName || 'Our Store';
    const orderNo = completedOrder._id ? completedOrder._id.slice(-6).toUpperCase() : '';

    let text = `🧾 *Digital Bill - ${storeName}*\n\n`;
    text += `*Order #:* ${orderNo}\n`;
    text += `*Date:* ${new Date(completedOrder.createdAt || Date.now()).toLocaleString('en-IN')}\n`;
    if (completedOrder.tableNumber && completedOrder.tableNumber !== '0') {
      text += `*Table:* Table ${completedOrder.tableNumber} (Dine-in)\n`;
    }
    text += `*Billed by:* ${completedOrder.orderBy || staffData?.name || 'Counter'}\n\n`;
    text += `*Items:*\n`;
    (completedOrder.orderItems || []).forEach((item) => {
      text += `• ${item.name} x ${item.qty} = ₹${item.price * item.qty}\n`;
    });
    text += `\n*Total Amount:* ₹${completedOrder.totalAmount}\n`;
    text += `*Payment:* ${String(completedOrder.paymentMethod || 'cash').toUpperCase()} (PAID ✓)\n\n`;
    text += `Thank you for visiting ${storeName}! Visit us again soon.`;

    const encoded = encodeURIComponent(text);
    const waUrl = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
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
              <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Store ID / Code
              </label>
              <input
                type="text"
                placeholder="e.g. GBS001"
                value={loginStoreCode}
                onChange={(e) => setLoginStoreCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-sm text-slate-900"
              />
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none">
      
      {/* ========================================================= */}
      {/* TOP HEADER: Store Info, Staff Details, Live Clock         */}
      {/* ========================================================= */}
      <header className="h-16 bg-slate-900 text-white px-4 md:px-6 flex items-center justify-between border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black truncate max-w-[200px] md:max-w-xs">
              {activeStore.storeName || 'Counter POS'}
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Store: {activeStore.storeId || currentStoreId}
            </p>
          </div>
        </div>

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
      {/* MAIN TWO-COLUMN SPLIT UI: 70% Left Catalog / 30% Right Cart */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ------------------------------------------------------- */}
        {/* LEFT COLUMN: 70% Product Catalog & Search               */}
        {/* ------------------------------------------------------- */}
        <div className="w-[68%] lg:w-[70%] xl:w-[72%] flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden">
          
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
                  <CheckCircle size={18} /> Cash Collected (₹{finalTotal})
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Payment Received (₹{finalTotal})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. DIGITAL BILL SCREEN / MODAL (After Order Creation)     */}
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
                      Customer Mobile Number
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
                    {/* SMS Option: Disabled as requested */}
                    <button
                      type="button"
                      disabled={true}
                      title="SMS Gateway is currently disabled"
                      className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                    >
                      <MessageCircle size={14} /> SMS (Disabled)
                    </button>

                    {/* WhatsApp Option: Enabled */}
                    <button
                      type="button"
                      onClick={handleOpenWhatsAppBill}
                      className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition"
                    >
                      <MessageCircle size={16} /> Send on WhatsApp
                    </button>
                  </div>
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

    </div>
  );
};

export default ManageCounter;
