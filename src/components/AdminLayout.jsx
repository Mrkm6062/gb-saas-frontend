import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
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
  User
} from 'lucide-react';
import PlatformFooter from './PlatformFooter';

const AdminLayout = ({ stores, onLogout, headerTitle = "Overview Dashboard", children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('gb_sidebar_collapsed') === 'true';
  });
  const [platformLogo, setPlatformLogo] = useState("https://storage.googleapis.com/galibrand/superadmin/products/galibrandfullname-logo.png");
  const [platformMiniLogo, setPlatformMiniLogo] = useState("");

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
      Themes: location.pathname.includes('/themes') || location.pathname.includes('/theme-customization')
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


  // Fallback to first store if localStorage has invalid/old ID format
  const isValidStore = stores?.some(s => s.storeId === activeStoreId);
  if (!isValidStore && stores?.length > 0) {
    activeStoreId = stores[0].storeId;
  }

  useEffect(() => {
    if (activeStoreId) {
      localStorage.setItem('gb_active_store_id', activeStoreId);
    }
  }, [activeStoreId]);

  // Calculate plan days remaining for the active store
  const currentStoreInfo = stores?.find(s => s.storeId === activeStoreId);
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

  const toggleMenu = (menuName) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const menuItems = [
    { 
      name: 'Overview', icon: <LayoutGrid size={20} />, 
      subItems: [
        { name: 'Live Dashboard', path: '/' },
        { name: 'Manage Store', path: activeStoreId ? `/store/${activeStoreId}` : '#' }
      ]
    },
    { 
      name: 'Inventory', icon: <Package size={20} />, 
      subItems: [
        { name: 'Categories', path: activeStoreId ? `/store/${activeStoreId}/categories` : '#' },
        { name: 'Products', path: activeStoreId ? `/store/${activeStoreId}/products` : '#' }
      ]
    },
    { 
      name: 'Orders', icon: <ClipboardList size={20} />, 
      subItems: [
        { name: 'Manage Orders', path: activeStoreId ? `/store/${activeStoreId}/orders` : '#' },
        { name: 'Live Orders Monitor', path: activeStoreId ? `/store/${activeStoreId}/live-orders` : '#' }
      ]
    },
    { name: 'Customers', icon: <Users size={20} />, path: activeStoreId ? `/store/${activeStoreId}/customers` : '#' },
    { name: 'Coupons & Offers', icon: <Ticket size={20} />, path: activeStoreId ? `/store/${activeStoreId}/coupons` : '#' },
    { name: 'Newsletter', icon: <Bell size={20} />, path: activeStoreId ? `/store/${activeStoreId}/newsletter` : '#' },
    ...((currentStoreInfo?.planDetails?.features?.customDomain === true || 
         (currentStoreInfo?.planId && typeof currentStoreInfo.planId === 'object' && currentStoreInfo.planId?.features?.customDomain === true)) ? [
      { name: 'Domains', icon: <Globe size={20} />, path: activeStoreId ? `/store/${activeStoreId}/domains` : '#' }
    ] : []),
    { name: 'Storage', icon: <HardDrive size={20} />, path: activeStoreId ? `/store/${activeStoreId}/storage` : '#' },
    { 
      name: 'Themes', icon: <Layers size={20} />, 
      subItems: [
        { name: 'Theme Gallery', path: activeStoreId ? `/store/${activeStoreId}/themes` : '#' },
        { name: 'Customize Theme', path: activeStoreId ? `/store/${activeStoreId}/theme-customization` : '#' }
      ]
    },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '#' },
    { name: 'Reviews', icon: <MessageSquare size={20} />, path: activeStoreId ? `/store/${activeStoreId}/reviews` : '#' },
    { 
      name: 'Settings', icon: <Settings size={20} />, 
      subItems: [
        { name: 'Alerts & Emails', path: activeStoreId ? `/store/${activeStoreId}/alerts` : '#' },
        { name: 'Delivery', path: activeStoreId ? `/store/${activeStoreId}/delivery` : '#' },
        { name: 'Checkout & Payment', path: activeStoreId ? `/store/${activeStoreId}/checkout` : '#' },
        { name: 'Store Policy', path: activeStoreId ? `/store/${activeStoreId}/policies` : '#' },
        { name: 'SEO & AI Settings', path: activeStoreId ? `/store/${activeStoreId}/seo` : '#' }
      ]
    },
    { name: 'Plan & Billing', icon: <CreditCard size={20} />, path: activeStoreId ? `/store/${activeStoreId}/plan` : '#' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 w-full overflow-hidden text-left">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative inset-y-0 left-0 z-50 w-64 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} min-h-screen bg-white border-r border-gray-100 flex flex-col p-4 shrink-0 transform transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`mb-10 px-2 flex items-center ${isSidebarCollapsed ? 'md:justify-center' : 'justify-between'}`}>
          <img 
            src={platformLogo} 
            alt="GB Galibrand Logo" 
            className={`h-12 w-auto transition-opacity ${isSidebarCollapsed ? 'md:hidden' : ''}`}
          />
          {platformMiniLogo ? (
            <img 
              src={platformMiniLogo} 
              alt="GB Mini Logo" 
              className={`hidden h-10 w-auto object-contain shrink-0 ${isSidebarCollapsed ? 'md:block' : ''}`}
            />
          ) : (
            <div className={`hidden h-10 w-10 bg-gradient-to-br from-[#76b900] to-[#5a8d00] text-white rounded-xl items-center justify-center font-black text-xl shadow-md shrink-0 ${isSidebarCollapsed ? 'md:flex' : ''}`}>
              GB
            </div>
          )}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-slate-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          {menuItems.map((item) => {
            if (item.subItems) {
              const isSubMenuOpen = openMenus[item.name];
              const isAnyChildActive = item.subItems.some(sub => sub.path !== '#' && location.pathname === sub.path);
              
              return (
                <div key={item.name} className="px-2 pb-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    title={isSidebarCollapsed ? item.name : undefined}
                    className={`w-full flex items-center justify-between py-2.5 rounded-xl transition-all duration-200 ${isSidebarCollapsed ? 'md:justify-center px-2 md:px-0' : 'px-3'} ${
                      isAnyChildActive && !isSubMenuOpen
                        ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${isAnyChildActive ? "text-[#76b900]" : "text-gray-400"} shrink-0`}>
                        {item.icon}
                      </span>
                      <span className={`text-sm tracking-wide truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
                    </div>
                    {!isSidebarCollapsed && (
                      <span className={`text-gray-400 transition-transform duration-300 ${isSubMenuOpen ? 'rotate-90' : ''}`}>
                        <ChevronRight size={16} />
                      </span>
                    )}
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubMenuOpen && !isSidebarCollapsed ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-1 pl-9 pr-2 pb-1">
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
                            className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-all duration-200 ${
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
              <div key={item.name} className="px-2 pb-1">
                <button
                  onClick={() => {
                    if (item.path !== '#') {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${isSidebarCollapsed ? 'md:justify-center px-2 md:px-0' : 'px-3'} ${
                    isActive 
                      ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={`${isActive ? "text-[#76b900]" : "text-gray-400"} shrink-0`}>
                    {item.icon}
                  </span>
                  <span className={`text-sm tracking-wide truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Desktop Collapse Button */}
        <div className="mt-4 pt-4 border-t border-slate-100 hidden md:block">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 text-slate-600 hover:bg-slate-100 rounded-md md:hidden transition-colors">
              <Menu size={24} />
            </button>
            <span className="text-xl font-bold text-slate-800">{headerTitle}</span>

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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(activeStoreId ? `/store/${activeStoreId}/profile` : '#')} 
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 hover:text-[#76b900] hover:bg-[#f1f8e9] rounded-full transition duration-200"
            >
              <User size={18} />
              Profile
            </button>
            <button onClick={onLogout} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition duration-200">
              Logout
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