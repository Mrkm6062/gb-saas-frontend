import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Mainpanel from './pages/Mainpanel';
import ManageStore from './pages/ManageStore';
import ManageProduct from './pages/ManageProduct';
import UpgradePlan from './pages/UpgradePlan';
import ManageOrders from './pages/ManageOrders';
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


function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [stores, setStores] = useState([]);

  const handleLoginSuccess = (newToken, userStores) => {
    setToken(newToken);
    setStores(userStores || []);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setStores([]);
  };

  // Fetch stores on initial load if token exists
  useEffect(() => {
    const fetchMyStores = async () => {
      if (token && stores.length === 0) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const response = await fetch(`${API_BASE_URL}/api/store/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setStores(data.stores || []);
          } else {
            handleLogout(); // Invalid token
          }
        } catch (error) {
          console.error("Failed to fetch stores", error);
          handleLogout();
        }
      }
    };
    fetchMyStores();
  }, [token]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/policies/:type" 
          element={<PlatformPolicy />} 
        />
        <Route 
          path="/" 
          element={token ? <Mainpanel token={token} stores={stores} setStores={setStores} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId" 
          element={token ? <ManageStore token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/products" 
          element={token ? <ManageProduct token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/categories" 
          element={token ? <ManageCategory token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/domains" 
          element={token ? <ManageDomain token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/storage" 
          element={token ? <ManageStorage token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/customers" 
          element={token ? <ManageCustomer token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/coupons" 
          element={token ? <ManageCoupon token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/alerts" 
          element={token ? <ManageAlerts token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
      <Route 
        path="/store/:storeId/delivery" 
        element={token ? <ManageDelivery token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/store/:storeId/checkout" 
        element={token ? <ManageCheckout token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
      />
        <Route 
          path="/store/:storeId/plan" 
          element={token ? <UpgradePlan token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/orders" 
          element={token ? <ManageOrders token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId/policies" 
          element={token ? <ManagePolicy token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={token ? "/" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;