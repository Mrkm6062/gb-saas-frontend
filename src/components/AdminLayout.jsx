import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Store, 
  Package, 
  ClipboardList, 
  Users, 
  Truck, 
  BarChart3, 
  Settings 
} from 'lucide-react';

const AdminLayout = ({ stores, onLogout, headerTitle = "Overview Dashboard", children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Dynamically detect which store we are currently viewing based on the URL
  const pathParts = location.pathname.split('/');
  const activeStoreId = pathParts[1] === 'store' && pathParts[2] 
    ? pathParts[2] 
    : (stores?.length > 0 ? stores[0].storeId : null);

  const menuItems = [
    { name: 'Overview', icon: <LayoutGrid size={20} />, path: '/' },
    { name: 'Manage Store', icon: <Store size={20} />, path: activeStoreId ? `/store/${activeStoreId}` : '#' },
    { name: 'Products', icon: <Package size={20} />, path: activeStoreId ? `/store/${activeStoreId}/products` : '#' },
    { name: 'Orders', icon: <ClipboardList size={20} />, path: '#' },
    { name: 'Customers', icon: <Users size={20} />, path: '#' },
    { name: 'Delivery', icon: <Truck size={20} />, path: '#' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '#' },
    { name: 'Settings', icon: <Settings size={20} />, path: '#' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 w-full overflow-hidden text-left">
      {/* Sidebar */}
      <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col p-4 shrink-0">
        <div className="mb-10 px-2">
          <img 
            src="https://galibrand.cloud/public/Name.png" 
            alt="GB Galibrand Logo" 
            className="h-12 w-auto"
          />
        </div>
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            // Highlight the menu item based on current URL path
            const isActive = item.path !== '#' && location.pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.path !== '#') navigate(item.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-[#f1f8e9] text-[#76b900] font-semibold" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className={isActive ? "text-[#76b900]" : "text-gray-400"}>
                  {item.icon}
                </span>
                <span className="text-sm tracking-wide">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-slate-800">{headerTitle}</span>
            
            {/* Store Switcher Dropdown (hidden on Overview page) */}
            {stores && stores.length > 0 && activeStoreId && location.pathname !== '/' && (
              <div className="ml-4 flex items-center gap-2 border-l border-slate-200 pl-4 hidden sm:flex">
                <span className="text-sm font-medium text-slate-500">Store:</span>
                <select
                  value={activeStoreId}
                  onChange={(e) => {
                    const newStoreId = e.target.value;
                    const currentSubPath = pathParts.slice(3).join('/'); // Preserves current sub-route like /products
                    navigate(`/store/${newStoreId}${currentSubPath ? `/${currentSubPath}` : ''}`);
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
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;