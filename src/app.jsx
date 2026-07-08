import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './api';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Mainpanel from './pages/Mainpanel';
import ManageStore from './pages/ManageStore';
import ManageProduct from './pages/ManageProduct';
import UpgradePlan from './pages/UpgradePlan';
import ManageOrders from './pages/ManageOrders';
import LiveOrderManage from './pages/LiveOrderManage';
import ManagePolicy from './pages/ManagePolicy';
import ManageCustomer from './pages/ManageCustomer';
import ManageCategory from './pages/ManageCategory';
import ManageStorage from './pages/ManageStorage';
import PlatformPolicy from './pages/PlatformPolicy';
import ManageDomain from './pages/ManageDomain';
import ManageCoupon from './pages/ManageCoupon';
import ManageAlerts from './pages/ManageAlerts';
import ManageDelivery from './pages/ManageDelivery';
import ManageCheckout from './pages/ManageCheckout';
import ManageTheme from './pages/ManageTheme';
import ManageThemeCustomization from './pages/ManageThemeCustomization';
import ManageReviews from './pages/ManageReviews';
import SeoSetting from './pages/SeoSetting';
import ManageNewsletter from './pages/ManageNewsletter';
import ManageProfile from './pages/ManageProfile';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [stores, setStores] = useState([]);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/store-owner/auth/google/config`);
        if (response.ok) {
          const data = await response.json();
          if (data.clientId) {
            setGoogleClientId(data.clientId);
          }
        }
      } catch (e) {
        console.error("Failed to load Google OAuth config:", e);
      } finally {
        setGoogleConfigLoaded(true);
      }
    };
    fetchGoogleConfig();
  }, []);

  const handleLoginSuccess = (newToken, userStores) => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
    setStores(userStores || []);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setStores([]);
  };

  // Fetch stores on initial load if logged in
  useEffect(() => {
    const fetchMyStores = async () => {
      if (isLoggedIn && stores.length === 0) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/store/me`);
          if (response.ok) {
            const data = await response.json();
            setStores(data.stores || []);
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error("Failed to fetch stores", error);
          handleLogout();
        }
      }
    };
    fetchMyStores();
  }, [isLoggedIn]);

  if (!googleConfigLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f1f8e9] via-white to-[#fff8e1] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeClientId = googleClientId || "445781559811-dummygoogleclientidplaceholder.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={activeClientId}>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={!isLoggedIn ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/policies/:type" 
            element={<PlatformPolicy />} 
          />
          <Route 
            path="/" 
            element={isLoggedIn ? <Mainpanel token="dummy-token" stores={stores} setStores={setStores} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId" 
            element={isLoggedIn ? <ManageStore token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/products" 
            element={isLoggedIn ? <ManageProduct token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/categories" 
            element={isLoggedIn ? <ManageCategory token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/domains" 
            element={isLoggedIn ? <ManageDomain token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/storage" 
            element={isLoggedIn ? <ManageStorage token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/themes" 
            element={isLoggedIn ? <ManageTheme token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/theme-customization" 
            element={isLoggedIn ? <ManageThemeCustomization token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/customers" 
            element={isLoggedIn ? <ManageCustomer token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/coupons" 
            element={isLoggedIn ? <ManageCoupon token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/alerts" 
            element={isLoggedIn ? <ManageAlerts token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
        <Route 
            path="/store/:storeId/reviews" 
            element={isLoggedIn ? <ManageReviews token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
        <Route 
          path="/store/:storeId/delivery" 
          element={isLoggedIn ? <ManageDelivery token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/checkout" 
          element={isLoggedIn ? <ManageCheckout token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
          <Route 
            path="/store/:storeId/plan" 
            element={isLoggedIn ? <UpgradePlan token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/orders" 
            element={isLoggedIn ? <ManageOrders token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/live-orders" 
            element={isLoggedIn ? <LiveOrderManage token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/policies" 
            element={isLoggedIn ? <ManagePolicy token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/seo" 
            element={isLoggedIn ? <SeoSetting token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/newsletter" 
            element={isLoggedIn ? <ManageNewsletter token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/:storeId/profile" 
            element={isLoggedIn ? <ManageProfile token="dummy-token" onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="*" 
            element={<Navigate to={isLoggedIn ? "/" : "/login"} />} 
          />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;