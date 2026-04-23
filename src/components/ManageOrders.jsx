import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const ManageOrders = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchOrders = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError('Failed to load orders.');
      }
    } catch (err) {
      setError('Network error loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchOrders();
    }
  }, [currentStore._id]);

  const handleStatusChange = async (orderId, type, newValue) => {
    try {
      const payload = type === 'order' ? { orderStatus: newValue } : { paymentStatus: newValue };
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchOrders(); // Refresh the list
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Network error updating status');
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Orders">
      <div className="p-6 max-w-7xl mx-auto mt-6">
        <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Order Management</h2>
        <p className="text-slate-500 mb-8">View and process incoming orders for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Date / ID</th>
                  <th className="p-4 font-bold">Customer</th>
                  <th className="p-4 font-bold">Items</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Payment</th>
                  <th className="p-4 font-bold">Order Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No orders received yet.</td></tr>
                ) : (
                  orders.map(order => (
                    <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">{order._id.slice(-6).toUpperCase()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.customerPhone}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={`${order.address?.addressLine1}, ${order.address?.city}`}>
                          {order.address?.addressLine1}, {order.address?.city}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div>{order.orderItems?.length || 0} items</div>
                        <button onClick={() => setSelectedOrder(order)} className="mt-1 text-blue-600 font-bold hover:text-blue-800 transition-colors underline decoration-blue-300 underline-offset-2">View Details</button>
                      </td>
                      <td className="p-4 font-extrabold text-green-600">₹{order.totalAmount}</td>
                      <td className="p-4">
                        <select value={order.paymentStatus} onChange={(e) => handleStatusChange(order._id, 'payment', e.target.value)} className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border cursor-pointer ${order.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <select value={order.orderStatus} onChange={(e) => handleStatusChange(order._id, 'order', e.target.value)} className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border cursor-pointer ${order.orderStatus === 'delivered' ? 'bg-blue-50 text-blue-700 border-blue-200' : order.orderStatus === 'shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          <option value="placed">Placed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Order Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedOrder._id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                  &times;
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Info</h4>
                    <p className="font-bold text-slate-800 text-lg">{selectedOrder.customerName}</p>
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">📞 {selectedOrder.customerPhone}</p>
                    {selectedOrder.customerEmail && <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">✉️ {selectedOrder.customerEmail}</p>}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Address</h4>
                    <p className="text-sm text-slate-800 font-medium">{selectedOrder.address?.addressLine1}</p>
                    {selectedOrder.address?.landmark && <p className="text-sm text-slate-600 mt-1">Landmark: {selectedOrder.address?.landmark}</p>}
                    <p className="text-sm text-slate-600 mt-1">{selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.pincode}</p>
                    {selectedOrder.address?.alternateNumber && <p className="text-xs text-slate-500 mt-2">Alt Phone: {selectedOrder.address?.alternateNumber}</p>}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Purchased Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold text-slate-600">Product</th>
                        <th className="p-3 font-semibold text-slate-600 text-center">Qty</th>
                        <th className="p-3 font-semibold text-slate-600 text-right">Price</th>
                        <th className="p-3 font-semibold text-slate-600 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.orderItems?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-800 font-bold">{item.name}</td>
                          <td className="p-3 text-slate-600 text-center">{item.qty}</td>
                          <td className="p-3 text-slate-600 text-right">₹{item.price}</td>
                          <td className="p-3 text-slate-800 font-bold text-right">₹{item.price * item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageOrders;