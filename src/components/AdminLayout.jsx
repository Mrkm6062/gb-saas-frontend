import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Store, 
  Package, 
  ClipboardList, 
  Users, 
  Truck, 
  BarChart3, 
  CreditCard,
  Settings,
  Layers,
  HardDrive,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Ticket,
  Bell,
  ShieldCheck,
  MessageSquare,
  User,
  LogOut,
  Download,
  Volume2,
  VolumeX,
  CheckCheck,
  Smartphone,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import PlatformFooter from './PlatformFooter';
import { playNotificationSound } from '../utils/notificationAudio';
import { 
  isPushNotificationSupported, 
  registerServiceWorker, 
  checkIsSubscribed, 
  subscribeToPushNotifications, 
  triggerTestPushNotification 
} from '../utils/pushNotifications';

const AdminLayout = ({ stores, onLogout, headerTitle = "Overview Dashboard", children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('gb_sidebar_collapsed') === 'true';
  });
  const [platformLogo, setPlatformLogo] = useState("https://storage.googleapis.com/galibrand/superadmin/products/galibrandfullname-logo.png");
  const [platformMiniLogo, setPlatformMiniLogo] = useState("");
  const [policies, setPolicies] = useState([]);

  // Live order notifications & PWA state
  const [liveOrders, setLiveOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking'); // 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported' | 'checking'
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState('');
  const [soundTheme, setSoundTheme] = useState(() => localStorage.getItem('live_order_sound_theme') || 'chime');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  const notificationDropdownRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const knownOrderIdsRef = useRef(new Set());
  const initialFetchDoneRef = useRef(false);

  // Dynamically detect which store we are currently viewing based on the URL
  const pathParts = location.pathname.split('/');
  let activeStoreId = pathParts[1] === 'store' && pathParts[2] 
    ? pathParts[2] 
    : localStorage.getItem('gb_active_store_id');

  const [openMenus, setOpenMenus] = useState(() => {
    return {
      Overview: location.pathname === '/' || location.pathname === `/store/${activeStoreId}`,
      Inventory: location.pathname.includes('/products') || location.pathname.includes('/categories'),
      Orders: location.pathname.includes('/orders') || location.pathname.includes('/live-orders'),
      Settings: location.pathname.includes('/alerts') || location.pathname.includes('/delivery') || location.pathname.includes('/checkout') || location.pathname.includes('/policies') || location.pathname.includes('/seo'),
      Themes: location.pathname.includes('/themes') || location.pathname.includes('/theme-customization'),
      'Website Builder': location.pathname.includes('/custom-pages') || location.pathname.includes('/navigation-menus') || location.pathname.includes('/assets'),
      'Store Configurations': location.pathname.includes('/alerts') || location.pathname.includes('/delivery') || location.pathname.includes('/checkout') || location.pathname.includes('/policies') || location.pathname.includes('/seo')
    };
  });

  useEffect(() => {
    localStorage.setItem('gb_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.mainLogoUrl) setPlatformLogo(data.mainLogoUrl);
          if (data.miniLogoUrl) setPlatformMiniLogo(data.miniLogoUrl);
        }
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  // Fetch policies for the mobile-only legal menu dropdown
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform-policies/public`);
        if (res.ok) {
          const data = await res.json();
          setPolicies(data.filter(p => !p.type.toLowerCase().startsWith('salary') && !p.type.toLowerCase().startsWith('commission')));
        }
      } catch (err) {
        console.error('Failed to load policies in sidebar:', err);
      }
    };
    fetchPolicies();
  }, []);

  // Match store by storeId code or MongoDB _id, falling back to first store
  let matchedStore = stores?.find(s => s.storeId === activeStoreId || s._id === activeStoreId);
  if (!matchedStore && stores?.length > 0) {
    matchedStore = stores[0];
  }
  const currentStoreInfo = matchedStore;
  if (currentStoreInfo && currentStoreInfo.storeId) {
    activeStoreId = currentStoreInfo.storeId;
  }
  let daysLeft = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (currentStoreInfo && currentStoreInfo.planExpiryDate) {
    const diff = new Date(currentStoreInfo.planExpiryDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    daysLeft = days;
    isExpired = days <= 0 || currentStoreInfo.subscriptionStatus === 'expired';
    isExpiringSoon = days > 0 && days <= 3;
  }

  // Redirect to plan page if expired and not already there
  useEffect(() => {
    if (isExpired && activeStoreId && !location.pathname.includes('/plan') && !location.pathname.includes('/login')) {
      navigate(`/store/${activeStoreId}/plan`);
    }
  }, [isExpired, activeStoreId, location.pathname, navigate]);

  const isCustomWebsite = currentStoreInfo?.storeType && (
    currentStoreInfo.storeType === "Custom Website(HTML,CSS,JS)" ||
    currentStoreInfo.storeType.toLowerCase().includes("custom website")
  );

  // Redirect custom website to newsletter page when landing on the root Overview page
  useEffect(() => {
    if (isCustomWebsite && activeStoreId && location.pathname === '/') {
      navigate(`/store/${activeStoreId}/newsletter`);
    }
  }, [isCustomWebsite, activeStoreId, location.pathname, navigate]);

  // -------------------------------------------------------------
  // PWA & Service Worker Initialization
  // -------------------------------------------------------------
  useEffect(() => {
    registerServiceWorker();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsPwaInstalled(true);
    };

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsPwaInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Sync Push Notification Subscription Status
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
      if (isSub) {
        setPushStatus('subscribed');
        if (currentStoreInfo?._id) {
          subscribeToPushNotifications(currentStoreInfo._id).catch(() => {});
        }
      } else {
        setPushStatus('unsubscribed');
      }
    };
    checkPush();
  }, [currentStoreInfo?._id]);

  // -------------------------------------------------------------
  // Live Orders Polling & Notification Audio
  // -------------------------------------------------------------
  const processIncomingOrders = (ordersList, allowAudio = true) => {
    if (!Array.isArray(ordersList)) return;

    // Filter placed orders (live orders queue)
    const placedOrders = ordersList.filter(o => o.orderStatus === 'placed' || o.orderStatus === 'shipped');
    const sorted = [...placedOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let hasBrandNewOrder = false;
    let newestOrder = null;

    if (initialFetchDoneRef.current) {
      for (const ord of sorted) {
        if (!knownOrderIdsRef.current.has(ord._id)) {
          hasBrandNewOrder = true;
          newestOrder = ord;
          break;
        }
      }
    }

    // Populate known orders set
    for (const ord of ordersList) {
      knownOrderIdsRef.current.add(ord._id);
    }

    // Play chime sound and trigger browser notification if not already on live-orders page
    if (hasBrandNewOrder && allowAudio) {
      const isCurrentlyOnLiveOrders = location.pathname.includes('/live-orders');
      if (!isCurrentlyOnLiveOrders) {
        playNotificationSound(soundTheme);

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`🎉 New Live Order #${newestOrder?._id?.toString()?.slice(-6)?.toUpperCase() || ''}`, {
              body: `${newestOrder?.customerName || 'A customer'} placed an order of ₹${newestOrder?.totalAmount || 0}.`,
              icon: '/icon-192x192.png',
              tag: 'live-order-' + (newestOrder?._id || Date.now())
            });
          } catch (e) {}
        }
      }
    }

    initialFetchDoneRef.current = true;
    setLiveOrders(sorted);

    // Calculate unread count based on last viewed timestamp
    const lastReadTime = parseInt(localStorage.getItem('gb_last_read_orders_time') || '0', 10);
    const unread = sorted.filter(o => new Date(o.createdAt).getTime() > lastReadTime).length;
    setUnreadCount(unread);
  };

  // Background polling every 10 seconds for live orders
  useEffect(() => {
    if (!currentStoreInfo?._id) return;

    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders?storeId=${currentStoreInfo._id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          processIncomingOrders(data, true);
        }
      } catch (err) {
        // Silent background fallback
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentStoreInfo?._id, soundTheme, location.pathname]);

  // Synchronize with LiveOrderManage.jsx broadcast events
  useEffect(() => {
    const handleBroadcast = (e) => {
      const { orders: updatedOrders, storeId } = e.detail || {};
      if (storeId && currentStoreInfo?._id && storeId.toString() === currentStoreInfo._id.toString()) {
        processIncomingOrders(updatedOrders, false);
      }
    };
    window.addEventListener('gb_live_orders_updated', handleBroadcast);
    return () => window.removeEventListener('gb_live_orders_updated', handleBroadcast);
  }, [currentStoreInfo?._id]);

  // Click outside listener for notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isNotificationOpen &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(e.target)
      ) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  const handleToggleNotifications = () => {
    const nextState = !isNotificationOpen;
    setIsNotificationOpen(nextState);
    if (nextState) {
      localStorage.setItem('gb_last_read_orders_time', Date.now().toString());
      setUnreadCount(0);
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    localStorage.setItem('gb_last_read_orders_time', Date.now().toString());
    setUnreadCount(0);
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    const newTheme = soundTheme === 'mute' ? 'chime' : 'mute';
    setSoundTheme(newTheme);
    localStorage.setItem('live_order_sound_theme', newTheme);
    if (newTheme !== 'mute') {
      playNotificationSound(newTheme);
    }
  };

  const handleSubscribePush = async (e) => {
    e.stopPropagation();
    if (!currentStoreInfo?._id) return;
    setIsSubscribing(true);
    setTestPushMsg('');
    try {
      await subscribeToPushNotifications(currentStoreInfo._id, null, true);
      setPushStatus('subscribed');
      setTestPushMsg('🎉 Push notifications enabled on this device!');
      setTimeout(() => setTestPushMsg(''), 5000);
    } catch (err) {
      if (Notification.permission === 'denied') {
        setPushStatus('denied');
      }
      setTestPushMsg('❌ ' + (err.message || 'Permission denied'));
      setTimeout(() => setTestPushMsg(''), 5000);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async (e) => {
    e.stopPropagation();
    if (!currentStoreInfo?._id) return;
    setTestPushLoading(true);
    setTestPushMsg('');
    try {
      const data = await triggerTestPushNotification(currentStoreInfo._id);
      setTestPushMsg('🚀 ' + (data.message || 'Test alert sent! Check your notification bar.'));
      setTimeout(() => setTestPushMsg(''), 5000);
    } catch (err) {
      setTestPushMsg('❌ Failed: ' + (err.message || 'Error triggering push'));
      setTimeout(() => setTestPushMsg(''), 6000);
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleInstallApp = async (e) => {
    e.stopPropagation();
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsPwaInstalled(true);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const toggleMenu = (menuName) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  // Reorganized Shopify-style logical menus structure grouped by departments
  const menuGroups = [
    {
      group: 'Dashboard',
      items: [
        { name: 'Overview', icon: <Store size={18} />, path: activeStoreId ? `/store/${activeStoreId}` : '#' },
        ...(!isCustomWebsite ? [{ name: 'Live Dashboard', icon: <LayoutGrid size={18} />, path: '/' }] : [])
      ]
    },
    ...(!isCustomWebsite ? [{
      group: 'Catalog',
      items: [
        { name: 'Products', icon: <Package size={18} />, path: activeStoreId ? `/store/${activeStoreId}/products` : '#' },
        { name: 'Categories', icon: <Layers size={18} />, path: activeStoreId ? `/store/${activeStoreId}/categories` : '#' }
      ]
    }] : []),
    ...(!isCustomWebsite ? [{
      group: 'Sales & Orders',
      items: [
        { name: 'Manage Orders', icon: <ClipboardList size={18} />, path: activeStoreId ? `/store/${activeStoreId}/orders` : '#' },
        { name: 'Live Monitor', icon: <Bell size={18} />, path: activeStoreId ? `/store/${activeStoreId}/live-orders` : '#' }
      ]
    }] : []),
    ...(!isCustomWebsite ? [{
      group: 'Customers',
      items: [
        { name: 'Customers List', icon: <Users size={18} />, path: activeStoreId ? `/store/${activeStoreId}/customers` : '#' },
        { name: 'Reviews', icon: <MessageSquare size={18} />, path: activeStoreId ? `/store/${activeStoreId}/reviews` : '#' }
      ]
    }] : []),
    {
      group: 'Marketing',
      items: [
        ...(!isCustomWebsite ? [{ name: 'Coupons & Offers', icon: <Ticket size={18} />, path: activeStoreId ? `/store/${activeStoreId}/coupons` : '#' }] : []),
        { name: 'Newsletter & Leads', icon: <Bell size={18} />, path: activeStoreId ? `/store/${activeStoreId}/newsletter` : '#' }
      ]
    },
    {
      group: 'Online Store',
      items: [
        ...(!isCustomWebsite ? [
          { name: 'Theme Gallery', icon: <Layers size={18} />, path: activeStoreId ? `/store/${activeStoreId}/themes` : '#' },
          { name: 'Customize Theme', icon: <Settings size={18} />, path: activeStoreId ? `/store/${activeStoreId}/theme-customization` : '#' }
        ] : []),
        ...(isCustomWebsite ? [
          { name: 'Custom Pages', icon: <Globe size={18} />, path: activeStoreId ? `/store/${activeStoreId}/custom-pages` : '#' },
          { name: 'Menu Builder', icon: <Layers size={18} />, path: activeStoreId ? `/store/${activeStoreId}/navigation-menus` : '#' },
          { name: 'Asset Manager', icon: <HardDrive size={18} />, path: activeStoreId ? `/store/${activeStoreId}/assets` : '#' }
        ] : []),
        { name: 'Domains', icon: <Globe size={18} />, path: activeStoreId ? `/store/${activeStoreId}/domains` : '#' },
        { name: 'Storage / Media', icon: <HardDrive size={18} />, path: activeStoreId ? `/store/${activeStoreId}/storage` : '#' }
      ]
    },
    {
      group: 'Analytics',
      items: [
        { name: 'Store Analytics', icon: <BarChart3 size={18} />, path: '#' }
      ]
    },
    {
      group: 'Settings',
      items: [
        { 
          name: 'Configurations', icon: <Settings size={18} />, 
          subItems: isCustomWebsite ? [
            { name: 'Alerts & Emails', path: activeStoreId ? `/store/${activeStoreId}/alerts` : '#' },
            { name: 'SEO & AI Settings', path: activeStoreId ? `/store/${activeStoreId}/seo` : '#' }
          ] : [
            { name: 'Alerts & Emails', path: activeStoreId ? `/store/${activeStoreId}/alerts` : '#' },
            { name: 'Delivery Settings', path: activeStoreId ? `/store/${activeStoreId}/delivery` : '#' },
            { name: 'Checkout & Payments', path: activeStoreId ? `/store/${activeStoreId}/checkout` : '#' },
            { name: 'Legal Policies', path: activeStoreId ? `/store/${activeStoreId}/policies` : '#' },
            { name: 'SEO & AI Settings', path: activeStoreId ? `/store/${activeStoreId}/seo` : '#' }
          ]
        }
      ]
    },
    {
      group: 'Billing',
      items: [
        { name: 'Plan & Billing', icon: <CreditCard size={18} />, path: activeStoreId ? `/store/${activeStoreId}/plan` : '#' }
      ]
    },
    // Mobile Only Platform Legal Policies
    ...(policies.length > 0 ? [{
      group: 'Platform Legal',
      isMobileOnly: true,
      items: [
        {
          name: 'Legal Policies',
          icon: <ShieldCheck size={18} />,
          subItems: policies.map(p => ({
            name: p.title,
            path: `/policies/${p.type}`
          }))
        }
      ]
    }] : [])
  ];

  const hasStore = stores && stores.length > 0;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 w-full overflow-hidden text-left">
      {/* Mobile Menu Overlay */}
      {hasStore && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      {hasStore && (
        <div className={`fixed md:relative inset-y-0 left-0 z-50 w-64 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} min-h-screen bg-white border-r border-gray-100 flex flex-col p-4 shrink-0 transform transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`mb-6 px-2 flex items-center ${isSidebarCollapsed ? 'md:justify-center' : 'justify-between'}`}>
          <img 
            src={platformLogo} 
            alt="GB Galibrand Logo" 
            className={`h-10 w-auto transition-opacity ${isSidebarCollapsed ? 'md:hidden' : ''}`}
          />
          {platformMiniLogo ? (
            <img 
              src={platformMiniLogo} 
              alt="GB Mini Logo" 
              className={`hidden h-8 w-auto object-contain shrink-0 ${isSidebarCollapsed ? 'md:block' : ''}`}
            />
          ) : (
            <div className={`hidden h-8 w-8 bg-gradient-to-br from-[#76b900] to-[#5a8d00] text-white rounded-xl items-center justify-center font-black text-lg shadow-md shrink-0 ${isSidebarCollapsed ? 'md:flex' : ''}`}>
              GB
            </div>
          )}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-slate-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-3.5 overflow-y-auto pb-4 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.group} className={`space-y-1 ${group.isMobileOnly ? 'md:hidden' : ''}`}>
              {!isSidebarCollapsed && (
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1 mt-1">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                if (item.subItems) {
                  const isSubMenuOpen = openMenus[item.name];
                  const isAnyChildActive = item.subItems.some(sub => sub.path !== '#' && location.pathname === sub.path);
                  
                  return (
                    <div key={item.name} className="px-1">
                      <button
                        onClick={() => toggleMenu(item.name)}
                        title={isSidebarCollapsed ? item.name : undefined}
                        className={`w-full flex items-center justify-between py-1.5 rounded-lg transition-all duration-200 ${isSidebarCollapsed ? 'md:justify-center px-1 md:px-0' : 'px-2.5'} ${
                          isAnyChildActive && !isSubMenuOpen
                            ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`${isAnyChildActive ? "text-[#76b900]" : "text-gray-400"} shrink-0`}>
                            {item.icon}
                          </span>
                          <span className={`text-[12px] tracking-wide truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
                        </div>
                        {!isSidebarCollapsed && (
                          <span className={`text-gray-400 transition-transform duration-300 ${isSubMenuOpen ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} />
                          </span>
                        )}
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubMenuOpen && !isSidebarCollapsed ? 'max-h-64 opacity-100 mt-0.5' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-1 pl-8 pr-1 pb-1">
                          {item.subItems.map(subItem => {
                            const isActive = subItem.path !== '#' && location.pathname === subItem.path;
                            return (
                              <button
                                key={subItem.name}
                                onClick={() => {
                                  if (subItem.path !== '#') {
                                    navigate(subItem.path);
                                    setIsMobileMenuOpen(false);
                                  }
                                }}
                                className={`w-full text-left py-1 px-2.5 rounded-md text-[11px] transition-all duration-200 ${
                                  isActive 
                                    ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                              >
                                {subItem.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                const isActive = item.path !== '#' && location.pathname === item.path;
                
                return (
                  <div key={item.name} className="px-1">
                    <button
                      onClick={() => {
                        if (item.path !== '#') {
                          navigate(item.path);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      title={isSidebarCollapsed ? item.name : undefined}
                      className={`w-full flex items-center gap-2.5 py-1.5 rounded-lg transition-all duration-200 ${isSidebarCollapsed ? 'md:justify-center px-1 md:px-0' : 'px-2.5'} ${
                        isActive 
                          ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span className={`${isActive ? "text-[#76b900]" : "text-gray-400"} shrink-0`}>
                        {item.icon}
                      </span>
                      <span className={`text-[12px] tracking-wide truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Desktop Collapse Button */}
        <div className="mt-2 pt-2 border-t border-slate-100 hidden md:block">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            {hasStore && (
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 text-slate-600 hover:bg-slate-100 rounded-md md:hidden transition-colors">
                <Menu size={24} />
              </button>
            )}
            <span className="text-base font-semibold text-slate-700">{headerTitle}</span>

            {/* Subscription/Trial Banner */}
            {daysLeft !== null && (currentStoreInfo?.isTrialActive || isExpiringSoon || isExpired) && (
              <div className={`ml-4 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!isExpired ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {currentStoreInfo?.isTrialActive 
                    ? (isExpired ? 'Trial Expired' : 'Free Trial') 
                    : (isExpired ? 'Plan Expired' : 'Expiring Soon')}
                </span>
                {!isExpired && <span className="text-sm font-extrabold">{daysLeft} Days Left</span>}
                {isExpired && <span className="text-sm font-extrabold">Kindly Purchase</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 relative">
            {/* Install PWA Button (Desktop & Mobile) */}
            {installPrompt && !isPwaInstalled && (
              <button
                onClick={handleInstallApp}
                title="Install Galibrand PWA App on your device"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#76b900]/10 hover:bg-[#76b900]/20 text-[#76b900] text-xs font-bold rounded-full border border-[#76b900]/30 transition"
              >
                <Download size={14} />
                <span>Install App</span>
              </button>
            )}

            {/* Notification Bell with Badge and Dropdown */}
            <div className="relative">
              <button 
                ref={notificationButtonRef}
                onClick={handleToggleNotifications} 
                title="Live Orders Notifications"
                className={`relative p-2 rounded-full transition duration-200 ${
                  isNotificationOpen 
                    ? 'bg-[#76b900]/15 text-[#76b900]' 
                    : 'text-slate-500 hover:text-[#76b900] hover:bg-slate-100'
                }`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotificationOpen && (
                <>
                  {/* Backdrop for mobile view */}
                  <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 sm:hidden"
                    onClick={() => setIsNotificationOpen(false)}
                  />

                  <div 
                    ref={notificationDropdownRef}
                    className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-12 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-none bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
                  >
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">Live Order Alerts</span>
                      {liveOrders.length > 0 && (
                        <span className="px-2 py-0.5 bg-[#76b900]/15 text-[#76b900] text-[11px] font-bold rounded-full">
                          {liveOrders.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleSound}
                        title={soundTheme === 'mute' ? 'Sound is Muted (Click to Unmute)' : `Sound Alert: ${soundTheme} (Click to Mute)`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                      >
                        {soundTheme === 'mute' ? <VolumeX size={16} className="text-red-500" /> : <Volume2 size={16} className="text-[#76b900]" />}
                      </button>
                      <button
                        onClick={handleMarkAllRead}
                        title="Mark all as read"
                        className="p-1.5 text-slate-400 hover:text-[#76b900] hover:bg-slate-200/60 rounded-lg transition"
                      >
                        <CheckCheck size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Closed-App Push Notification Status Card */}
                  {pushStatus === 'subscribed' ? (
                    <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full -ml-4.5"></span>
                          <span className="text-xs font-bold text-emerald-800">Closed-App Push Active</span>
                        </div>
                        <button
                          onClick={handleTestPush}
                          disabled={testPushLoading}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition shadow-xs"
                        >
                          {testPushLoading ? 'Testing...' : 'Send Test'}
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        You'll receive live order alerts on your device even when this app is closed.
                      </p>
                    </div>
                  ) : pushStatus === 'denied' ? (
                    <div className="mx-3 mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-2">
                      <X size={15} className="text-red-500 shrink-0 mt-0.5" />
                      <span>Notifications are blocked in your browser. Please allow notifications in site settings to receive closed-app alerts.</span>
                    </div>
                  ) : (
                    <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                      <div className="flex items-start gap-2.5">
                        <Smartphone size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-amber-900">Enable Closed-App Alerts</h4>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                            Get instant push alerts on your phone or PC when new orders arrive, even when the browser is closed!
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={handleSubscribePush}
                              disabled={isSubscribing}
                              className="px-2.5 py-1 bg-gradient-to-r from-[#76b900] to-[#68a500] hover:from-[#68a500] hover:to-[#578b00] text-white text-[11px] font-bold rounded-lg shadow-sm transition"
                            >
                              {isSubscribing ? 'Enabling...' : 'Enable Push Alerts'}
                            </button>
                            {installPrompt && !isPwaInstalled && (
                              <button
                                onClick={handleInstallApp}
                                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-lg border border-amber-300 transition flex items-center gap-1"
                              >
                                <Download size={12} /> Install PWA
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback Message */}
                  {testPushMsg && (
                    <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-center animate-in fade-in">
                      {testPushMsg}
                    </div>
                  )}

                  {/* Orders List */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-2 mt-1">
                    {liveOrders.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <ClipboardList size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No live orders yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">New incoming orders will appear here automatically.</p>
                      </div>
                    ) : (
                      liveOrders.slice(0, 6).map((order) => (
                        <div
                          key={order._id}
                          onClick={() => {
                            setIsNotificationOpen(false);
                            navigate(activeStoreId ? `/store/${activeStoreId}/live-orders` : '#');
                          }}
                          className="p-2.5 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#76b900]">
                                #{order._id.slice(-6).toUpperCase()}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                order.orderStatus === 'placed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.orderStatus === 'placed' ? 'Placed' : 'Shipped'}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                              {order.customerName || 'Customer'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTimeAgo(order.createdAt)}
                              </span>
                              <span>•</span>
                              <span className="uppercase font-semibold">{order.paymentMethod || 'COD'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-slate-800">
                              ₹{order.totalAmount}
                            </span>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(activeStoreId ? `/store/${activeStoreId}/live-orders` : '#');
                      }}
                      className="w-full py-1.5 px-3 bg-[#76b900] hover:bg-[#68a500] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Open Live Orders Monitor</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              </>
              )}
            </div>

            <button 
              onClick={() => navigate(activeStoreId ? `/store/${activeStoreId}/profile` : '#')} 
              title="Profile"
              className="p-2 text-slate-500 hover:text-[#76b900] hover:bg-slate-100 rounded-full transition duration-200"
            >
              <User size={18} />
            </button>
            <button 
              onClick={onLogout} 
              title="Logout"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-full transition duration-200"
            >
              <LogOut size={18} />
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <main className="w-full flex-1 overflow-y-auto">
          {children}
        </main>
        <PlatformFooter />
      </div>
    </div>
  );
};

export default AdminLayout;