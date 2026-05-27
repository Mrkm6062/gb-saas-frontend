import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Star, MessageSquare, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';

const ManageReviews = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved'

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  const fetchReviews = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setReviews(await response.json());
      } else {
        setStatus('Failed to load reviews.');
      }
    } catch (error) {
      setStatus('Network error loading reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [currentStore._id]);

  const handleToggleApproval = async (reviewId, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isApproved: !currentStatus })
      });

      if (response.ok) {
        setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, isApproved: !currentStatus } : r));
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review permanently?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setReviews(prev => prev.filter(r => r._id !== reviewId));
        setStatus('Review deleted successfully.');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true; // 'all'
  });

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            size={16} 
            className={star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"} 
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Reviews">
      <div className="w-full px-6 py-10 mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <MessageSquare className="text-[#76b900]" size={32} /> Product Reviews
            </h2>
            <p className="text-slate-500 mt-1">Approve, reject, and manage customer feedback for <span className="font-bold">{currentStore.storeName}</span></p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['pending', 'approved', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-lg font-bold text-sm capitalize transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f} {f === 'pending' && reviews.filter(r => !r.isApproved).length > 0 && `(${reviews.filter(r => !r.isApproved).length})`}
              </button>
            ))}
          </div>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-500 font-bold animate-pulse">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
            <MessageSquare size={48} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No {filter !== 'all' ? filter : ''} reviews found</h3>
            <p className="text-slate-500">When customers leave reviews on your products, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredReviews.map((review) => (
              <div key={review._id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                      {review.productId?.images?.[0] ? (
                        <img src={review.productId.images[0]} alt="Product" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Img</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1" title={review.productId?.name}>{review.productId?.name || 'Unknown Product'}</h4>
                      <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()} • By <span className="font-bold text-slate-700">{review.customerName || 'Anonymous'}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {renderStars(review.rating)}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${review.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {review.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm italic mb-6 flex-1">
                  "{review.review || 'No written feedback provided.'}"
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button 
                    onClick={() => handleToggleApproval(review._id, review.isApproved)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${review.isApproved ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  >
                    {review.isApproved ? <><XCircle size={18} /> Revoke Approval</> : <><CheckCircle size={18} /> Approve & Publish</>}
                  </button>
                  
                  <button onClick={() => handleDelete(review._id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors">
                    <Trash2 size={18} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageReviews;