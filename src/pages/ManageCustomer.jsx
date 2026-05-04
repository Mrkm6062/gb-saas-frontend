import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';

const ManageCustomer = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState('');
  const [sortBy, setSortBy] = useState('highestSpend');

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
              identifier,
              email: order.customerEmail || 'No Email',
              name: order.customerName,
              phone: order.customerPhone,
              address: order.address || {},
              orderCount: 0,
              totalValue: 0,
              lastOrderDate: order.createdAt,
              ordersList: []
            };
          }
          
          customersMap[identifier].orderCount += 1;
          customersMap[identifier].totalValue += (order.totalAmount || 0);
          customersMap[identifier].ordersList.push(order);
          
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

  // Reset pagination to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    setAdminNote('');
    setNoteStatus('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/notes?storeId=${currentStore._id}&identifier=${encodeURIComponent(customer.identifier)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminNote(data.note || '');
      }
    } catch (err) {
      console.error("Failed to load note:", err);
    }
  };

  const saveAdminNote = async () => {
    setSavingNote(true);
    setNoteStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeId: currentStore._id, identifier: selectedCustomer.identifier, note: adminNote })
      });
      if (response.ok) {
        setNoteStatus('Saved!');
        setTimeout(() => setNoteStatus(''), 3000);
      } else {
        setNoteStatus('Failed to save.');
      }
    } catch (err) {
      setNoteStatus('Network error.');
    } finally {
      setSavingNote(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (c.name || '').toLowerCase().includes(searchLower) ||
           (c.email || '').toLowerCase().includes(searchLower) ||
           (c.phone || '').toLowerCase().includes(searchLower);
  }).sort((a, b) => {
    if (sortBy === 'highestSpend') return b.totalValue - a.totalValue;
    if (sortBy === 'mostRecent') return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
    if (sortBy === 'mostOrders') return b.orderCount - a.orderCount;
    return 0;
  });

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      alert('No customers to export.');
      return;
    }

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return 'N/A';
      const text = String(str);
      if (text.includes(',') || text.includes('\n') || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headers = ['Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Total Orders', 'Lifetime Spent (INR)'];
    
    const csvRows = filteredCustomers.map(c => [
      escapeCsv(c.name || 'Anonymous'), escapeCsv(c.email), escapeCsv(c.phone),
      escapeCsv(c.address?.addressLine1), escapeCsv(c.address?.city), escapeCsv(c.address?.state),
      escapeCsv(c.address?.pincode), c.orderCount, c.totalValue
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Customers">
      <div className="p-6 mx-auto mt-6">
        <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Customer Directory</h2>
        <p className="text-slate-500 mb-8">View customer details and lifetime value for <span className="font-bold text-slate-700">{currentStore.storeName}</span></p>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

        {/* Search & Export Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-auto flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search customers by name, email, or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm transition"
            />
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white font-medium text-slate-700 w-full sm:w-auto cursor-pointer"
            >
              <option value="highestSpend">Highest Spend</option>
              <option value="mostRecent">Most Recent</option>
              <option value="mostOrders">Most Orders</option>
            </select>
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto whitespace-nowrap shadow-sm"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

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
                ) : filteredCustomers.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No customers match your search.</td></tr>
                ) : (
                  paginatedCustomers.map((c, idx) => (
                    <tr key={idx} onClick={() => handleCustomerClick(c)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" title="Click to view details">
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

          {/* Pagination Controls */}
          {filteredCustomers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 gap-4">
              <div className="text-sm text-slate-500 flex items-center gap-2">
                Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-slate-800">{filteredCustomers.length}</span> customers
                <select 
                  value={itemsPerPage} 
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                  className="ml-2 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#76b900]"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-sm font-medium text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  {currentPage} / {totalPages || 1}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Customer Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">{selectedCustomer.name || 'Anonymous'}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                  &times;
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Info</h4>
                    <p className="font-bold text-slate-800 text-lg">{selectedCustomer.name || 'Anonymous'}</p>
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">📞 {selectedCustomer.phone}</p>
                    {selectedCustomer.email !== 'No Email' && <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">✉️ {selectedCustomer.email}</p>}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location</h4>
                    <p className="text-sm text-slate-800 font-medium">{selectedCustomer.address?.addressLine1 || 'N/A'}</p>
                    {selectedCustomer.address?.landmark && <p className="text-sm text-slate-600 mt-1">Landmark: {selectedCustomer.address?.landmark}</p>}
                    <p className="text-sm text-slate-600 mt-1">{selectedCustomer.address?.city || 'N/A'}, {selectedCustomer.address?.state || 'N/A'} {selectedCustomer.address?.pincode}</p>
                  </div>
                </div>

                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">📝 Private Admin Notes</h4>
                    {noteStatus && <span className="text-xs font-bold text-amber-600 animate-pulse">{noteStatus}</span>}
                  </div>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add private notes about this customer (e.g., VIP customer, prefers morning delivery, complaints)..."
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none shadow-inner"
                    rows="3"
                  ></textarea>
                  <div className="flex justify-end mt-3">
                    <button onClick={saveAdminNote} disabled={savingNote} className="px-5 py-2 bg-amber-500 text-white font-bold text-sm rounded-lg hover:bg-amber-600 transition shadow-sm disabled:opacity-50">
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order History ({selectedCustomer.ordersList.length})</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold text-slate-600">Date / ID</th>
                        <th className="p-3 font-semibold text-slate-600">Items</th>
                        <th className="p-3 font-semibold text-slate-600">Status</th>
                        <th className="p-3 font-semibold text-slate-600 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomer.ordersList.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((order, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{new Date(order.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{order._id.slice(-6).toUpperCase()}</div>
                          </td>
                          <td className="p-3 text-slate-600">{order.orderItems?.length || 0} items</td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${order.orderStatus === 'delivered' ? 'bg-blue-100 text-blue-700' : order.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-700' : order.orderStatus === 'canceled' ? 'bg-red-100 text-red-700' : order.orderStatus === 'returned' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                                {order.orderStatus}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {order.paymentStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-800 font-extrabold text-right">₹{order.totalAmount}</td>
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

export default ManageCustomer;