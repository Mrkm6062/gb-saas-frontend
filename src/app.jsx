import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login.jsx';
import Mainpanel from './pages/Mainpanel.jsx';
import ManageStore from './pages/ManageStore.jsx';

function App() {
  const [status, setStatus] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [stores, setStores] = useState([]);



  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);

    setStores([]);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            token ? <Navigate to="/" /> : 
            <Login onLoginSuccess={(newToken, userStores) => { setToken(newToken); setStores(userStores); }} />
          } 
        />
        
        <Route 
          path="/" 
          element={
            token ? <Mainpanel token={token} stores={stores} setStores={setStores} onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />

        <Route 
          path="/store/:storeId" 
          element={
            token ? <ManageStore token={token} stores={stores} onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;