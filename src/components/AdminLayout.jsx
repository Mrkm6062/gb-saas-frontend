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
  Globe,
  Ticket,
  Bell
} from 'lucide-react';
import PlatformFooter from './PlatformFooter';

const AdminLayout = ({ stores, onLogout, headerTitle = "Overview Dashboard", children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('gb_sidebar_collapsed') === 'true';
  });
  const [platformLogo, setPlatformLogo] = useState("https://galibrand.cloud/public/Name.png");

  useEffect(() => {
    localStorage.setItem('gb_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/platform-settings`);
        if (res.ok) setPlatformLogo((await res.json()).mainLogoUrl);
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  // Dynamically detect which store we are currently viewing based on the URL
  const pathParts = location.pathname.split('/');
  let activeStoreId = pathParts[1] === 'store' && pathParts[2] 
    ? pathParts[2] 
    : localStorage.getItem('gb_active_store_id');

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

  const menuItems = [
    { name: 'Overview', icon: <LayoutGrid size={20} />, path: '/' },
    { name: 'Manage Store', icon: <Store size={20} />, path: activeStoreId ? `/store/${activeStoreId}` : '#' },
    { name: 'Products', icon: <Package size={20} />, path: activeStoreId ? `/store/${activeStoreId}/products` : '#' },
    { name: 'Categories', icon: <Layers size={20} />, path: activeStoreId ? `/store/${activeStoreId}/categories` : '#' },
    { name: 'Domains', icon: <Globe size={20} />, path: activeStoreId ? `/store/${activeStoreId}/domains` : '#' },
    { name: 'Storage', icon: <HardDrive size={20} />, path: activeStoreId ? `/store/${activeStoreId}/storage` : '#' },
    { name: 'Orders', icon: <ClipboardList size={20} />, path: activeStoreId ? `/store/${activeStoreId}/orders` : '#' },
    { name: 'Customers', icon: <Users size={20} />, path: activeStoreId ? `/store/${activeStoreId}/customers` : '#' },
    { name: 'Coupons&Offers', icon: <Ticket size={20} />, path: activeStoreId ? `/store/${activeStoreId}/coupons` : '#' },
    { name: 'Alerts & Emails', icon: <Bell size={20} />, path: activeStoreId ? `/store/${activeStoreId}/alerts` : '#' },
    { name: 'Delivery', icon: <Truck size={20} />, path: '#' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '#' },
    { name: 'Store Policy', icon: <ClipboardList size={20} />, path: activeStoreId ? `/store/${activeStoreId}/policies` : '#' },
    { name: 'Plan & Billing', icon: <CreditCard size={20} />, path: activeStoreId ? `/store/${activeStoreId}/plan` : '#' },
    { name: 'Settings', icon: <Settings size={20} />, path: '#' },
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
          <div className={`hidden h-10 w-10 bg-gradient-to-br from-[#76b900] to-[#5a8d00] text-white rounded-xl items-center justify-center font-black text-xl shadow-md shrink-0 ${isSidebarCollapsed ? 'md:flex' : ''}`}>
            GB
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-slate-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            // Highlight the menu item based on current URL path
            const isActive = item.path !== '#' && location.pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.path !== '#') {
                    navigate(item.path);
                    setIsMobileMenuOpen(false); // Close menu on mobile after navigating
                  }
                }}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all duration-200 ${isSidebarCollapsed ? 'md:justify-center px-4 md:px-0' : 'px-4'} ${
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
            
            {/* Store Switcher Dropdown */}
            {stores && stores.length > 0 && activeStoreId && (
              <div className="ml-4 flex items-center gap-2 border-l border-slate-200 pl-4 hidden sm:flex">
                <span className="text-sm font-medium text-slate-500">Store:</span>
                <select
                  value={activeStoreId}
                  onChange={(e) => {
                    const newStoreId = e.target.value;
                    localStorage.setItem('gb_active_store_id', newStoreId);
                    if (location.pathname === '/') {
                      window.location.reload();
                    } else {
                      const currentSubPath = pathParts.slice(3).join('/'); // Preserves current sub-route like /products
                      navigate(`/store/${newStoreId}${currentSubPath ? `/${currentSubPath}` : ''}`);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-[#76b900] focus:border-[#76b900] block py-1.5 px-3 outline-none font-semibold cursor-pointer max-w-[200px] truncate"
                >
                  {stores.map(store => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition duration-200">
            Logout
          </button>
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