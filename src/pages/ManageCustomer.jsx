import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const ManageCustomer = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchAndProcessCustomers = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const orders = await response.json();
        
        // Group orders by customer email
        const customersMap = {};
        
        orders.forEach(order => {
          // Use phone number as fallback identifier if email is missing
          const identifier = order.customerEmail || order.customerPhone || 'Unknown';
          
          if (!customersMap[identifier]) {
            customersMap[identifier] = {
              email: order.customerEmail || 'No Email',
              name: order.customerName,
              phone: order.customerPhone,
              address: order.address || {},
              orderCount: 0,
              totalValue: 0,
              lastOrderDate: order.createdAt
            };
          }
          
          customersMap[identifier].orderCount += 1;
          customersMap[identifier].totalValue += (order.totalAmount || 0);
          
          // Keep the most recent address and phone number
          if (new Date(order.createdAt) > new Date(customersMap[identifier].lastOrderDate)) {
            customersMap[identifier].address = order.address || {};
            customersMap[identifier].phone = order.customerPhone;
            customersMap[identifier].lastOrderDate = order.createdAt;
          }
        });

        // Convert map back to array and sort by total value descending
        const customersArray = Object.values(customersMap).sort((a, b) => b.totalValue - a.totalValue);
        setCustomers(customersArray);
      } else {
        setError('Failed to load customers data.');
      }
    } catch (err) {
      setError('Network error loading customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchAndProcessCustomers();
    }
  }, [currentStore._id]);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Customers">
      <div className="p-6 mx-auto mt-6">
        <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Customer Directory</h2>
        <p className="text-slate-500 mb-8">View customer details and lifetime value for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Customer Details</th>
                  <th className="p-4 font-bold">Contact</th>
                  <th className="p-4 font-bold">Location</th>
                  <th className="p-4 font-bold text-center">Total Orders</th>
                  <th className="p-4 font-bold text-right">Lifetime Spent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading customers...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No customers found. Share your store link to get started!</td></tr>
                ) : (
                  customers.map((c, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{c.name || 'Anonymous'}</td>
                      <td className="p-4"><div className="text-sm text-slate-700">{c.email}</div><div className="text-xs text-slate-500 mt-1">{c.phone}</div></td>
                      <td className="p-4"><div className="text-sm text-slate-700">{c.address?.city || 'N/A'}, {c.address?.state || 'N/A'}</div><div className="text-xs text-slate-500 mt-1">{c.address?.pincode}</div></td>
                      <td className="p-4 text-center font-bold text-slate-700 bg-slate-50/50">{c.orderCount}</td>
                      <td className="p-4 text-right font-extrabold text-green-600">₹{c.totalValue}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageCustomer;