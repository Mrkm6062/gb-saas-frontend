import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Plus, Search, Eye, Edit2, Copy, ToggleLeft, ToggleRight, 
  Trash2, RefreshCw, AlertCircle, Home, CheckCircle2, FileText, ChevronRight 
} from 'lucide-react';

const ManageCustomPages = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, published, draft, deleted
  const [actionLoading, setActionLoading] = useState(null); // stores pageId of currently running async action

  const fetchPages = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    setError('');
    try {
      const showDeleted = statusFilter === 'deleted';
      const statusParam = statusFilter !== 'all' && statusFilter !== 'deleted' ? `&status=${statusFilter}` : '';
      const deletedParam = `&isDeleted=${showDeleted}`;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';

      const res = await fetch(
        `${API_BASE_URL}/api/custom-pages/pages?storeId=${currentStore._id}${statusParam}${deletedParam}${searchParam}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setPages(data);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to fetch pages');
      }
    } catch (err) {
      console.error(err);
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore._id, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPages();
  };

  // Toggle Publish/Unpublish status
  const handleTogglePublish = async (page) => {
    setActionLoading(page._id);
    const action = page.isPublished ? 'unpublish' : 'publish';
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${page._id}/${action}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.message || `Failed to ${action} page.`);
      }
    } catch (err) {
      alert(`Error trying to ${action} page.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Duplicate Page
  const handleDuplicate = async (pageId) => {
    setActionLoading(pageId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to duplicate page.');
      }
    } catch (err) {
      alert('Error duplicating page.');
    } finally {
      setActionLoading(null);
    }
  };

  // Soft Delete Page
  const handleSoftDelete = async (pageId) => {
    if (!window.confirm('Are you sure you want to move this page to trash? Visitors will no longer be able to access it.')) return;
    setActionLoading(pageId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}/soft`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to trash page.');
      }
    } catch (err) {
      alert('Error moving page to trash.');
    } finally {
      setActionLoading(null);
    }
  };

  // Restore Soft Deleted Page
  const handleRestore = async (pageId) => {
    setActionLoading(pageId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ isDeleted: false, deletedAt: null, status: 'draft', isPublished: false })
      });
      if (res.ok) {
        setStatusFilter('all'); // Go back to all active pages
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to restore page.');
      }
    } catch (err) {
      alert('Error restoring page.');
    } finally {
      setActionLoading(null);
    }
  };

  // Hard Delete Page
  const handleHardDelete = async (pageId) => {
    if (!window.confirm('CRITICAL: Are you sure you want to PERMANENTLY delete this page? This action cannot be undone and will delete the layout completely.')) return;
    setActionLoading(pageId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to permanently delete page.');
      }
    } catch (err) {
      alert('Error permanently deleting page.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Website Page Builder">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Custom Pages</h1>
            <p className="text-slate-500 text-sm mt-1">
              Create, customize, and publish unlimited custom HTML, CSS, and JS pages for your storefront.
            </p>
          </div>
          <Link
            to={`/store/${storeId}/custom-pages/create`}
            className="flex items-center justify-center gap-2 bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md shadow-green-150 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            Create Custom Page
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
          
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Pages
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'published' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'draft' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'deleted' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'
              }`}
            >
              Trash Bin
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search page title or slug..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900] focus:border-[#76b900] bg-slate-50/50"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Pages Table Grid */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm mt-3 font-semibold">Loading your custom pages...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="p-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No pages found</h3>
              <p className="text-slate-400 text-sm mt-2">
                {statusFilter === 'deleted' 
                  ? 'Your trash is currently empty.' 
                  : search 
                    ? 'No matches found. Try widening your search queries.' 
                    : 'Create your first custom page (like About Us, Contact, Landing Page) to get started.'}
              </p>
              {statusFilter !== 'deleted' && !search && (
                <Link
                  to={`/store/${storeId}/custom-pages/create`}
                  className="inline-flex mt-6 bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
                >
                  Create Custom Page
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Page Information</th>
                    <th className="py-4 px-6">URL Route</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pages.map((page) => (
                    <tr key={page._id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* Title & Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${page.isHomepage ? 'bg-[#f1f8e9] text-[#76b900]' : 'bg-slate-100 text-slate-500'}`}>
                            {page.isHomepage ? <Home size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800">{page.title}</span>
                              {page.isHomepage && (
                                <span className="bg-[#f1f8e9] text-[#76b900] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-green-200">
                                  Homepage
                                </span>
                              )}
                            </div>
                            {page.description && (
                              <p className="text-slate-400 text-xs mt-0.5 max-w-xs truncate">{page.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Route Path */}
                      <td className="py-4 px-6">
                        <code className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-xs border border-slate-100">
                          {page.isHomepage ? '/' : `/${page.slug}`}
                        </code>
                      </td>

                      {/* Page Type */}
                      <td className="py-4 px-6">
                        <span className="text-slate-600 text-sm font-semibold capitalize">{page.pageType}</span>
                      </td>

                      {/* Status Toggle / Badge */}
                      <td className="py-4 px-6">
                        {page.isDeleted ? (
                          <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">
                            Deleted in Trash
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTogglePublish(page)}
                            disabled={actionLoading !== null}
                            className={`flex items-center gap-2 text-left group-hover:opacity-100 focus:outline-none ${
                              actionLoading === page._id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={page.isPublished ? "Unpublish Page" : "Publish Page"}
                          >
                            {page.isPublished ? (
                              <>
                                <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Published
                                </span>
                                <ToggleRight size={22} className="text-[#76b900] cursor-pointer" />
                              </>
                            ) : (
                              <>
                                <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-100">
                                  Draft
                                </span>
                                <ToggleLeft size={22} className="text-slate-400 cursor-pointer" />
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {page.isDeleted ? (
                            <>
                              <button
                                onClick={() => handleRestore(page._id)}
                                disabled={actionLoading !== null}
                                className="p-2 text-[#76b900] hover:bg-[#f1f8e9] rounded-lg transition-colors"
                                title="Restore Page"
                              >
                                <RefreshCw size={16} className={actionLoading === page._id ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={() => handleHardDelete(page._id)}
                                disabled={actionLoading !== null}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Permanently Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                to={`/store/${storeId}/custom-pages/preview/${page._id}`}
                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Preview Design"
                              >
                                <Eye size={16} />
                              </Link>
                              <Link
                                to={`/store/${storeId}/custom-pages/edit/${page._id}`}
                                className="p-2 text-slate-500 hover:text-[#76b900] hover:bg-[#f1f8e9] rounded-lg transition-colors"
                                title="Edit Code & Page"
                              >
                                <Edit2 size={16} />
                              </Link>
                              <button
                                onClick={() => handleDuplicate(page._id)}
                                disabled={actionLoading !== null}
                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Duplicate Page"
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(page._id)}
                                disabled={actionLoading !== null}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Move to Trash"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default ManageCustomPages;
