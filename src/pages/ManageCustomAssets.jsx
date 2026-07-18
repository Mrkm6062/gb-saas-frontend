import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  UploadCloud, Copy, Trash2, Folder, File, FileText, Image as ImageIcon, 
  Search, RefreshCw, Eye, FileCode, Play, HelpCircle, AlertCircle 
} from 'lucide-react';

const ManageCustomAssets = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  // Component states
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all'); // all, media, fonts, styles, scripts
  const [copyStatus, setCopyStatus] = useState(null); // stores url of copied asset

  const fetchAssets = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    setError('');
    try {
      const folderParam = folderFilter !== 'all' ? `&folder=${folderFilter}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      
      const res = await fetch(
        `${API_BASE_URL}/api/custom-assets/list?storeId=${currentStore._id}${folderParam}${searchParam}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );
      if (res.ok) {
        setAssets(await res.json());
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to list assets');
      }
    } catch (e) {
      setError('Connection error trying to fetch assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore._id, folderFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssets();
  };

  // Upload Asset Flow
  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress('Uploading files...');
    setError('');

    const formData = new FormData();
    formData.append('storeId', currentStore._id);
    
    // Auto map asset type to a target GCS folder category
    let folder = 'media';
    const firstFile = selectedFiles[0];
    const mime = firstFile.mimetype || firstFile.type || '';
    const name = firstFile.name.toLowerCase();

    if (name.endsWith('.css')) {
      folder = 'styles';
    } else if (name.endsWith('.js')) {
      folder = 'scripts';
    } else if (name.endsWith('.woff') || name.endsWith('.woff2') || name.endsWith('.ttf') || name.endsWith('.otf')) {
      folder = 'fonts';
    } else if (mime.startsWith('video/')) {
      folder = 'videos';
    } else {
      folder = 'media';
    }

    formData.append('folder', folder);
    selectedFiles.forEach(file => {
      formData.append('assets', file);
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-assets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Note: Do NOT set Content-Type header when uploading FormData!
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        fetchAssets();
        setUploadProgress('');
      } else {
        const data = await res.json();
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Error uploading file. Connection interrupted.');
    } finally {
      setUploading(false);
    }
  };

  // Copy GCS public URL helper
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopyStatus(url);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // Delete Asset
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this asset from GCS and database? If this asset is linked in your pages, it will break.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-assets/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': document.cookie.match(/(^| )csrfToken=([^;]+)/)?.[2] || ''
        },
        credentials: 'include'
      });
      if (res.ok) {
        fetchAssets();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete asset');
      }
    } catch (e) {
      alert('Error deleting asset.');
    }
  };

  const getAssetIcon = (asset) => {
    const mime = asset.mimeType || '';
    if (mime.startsWith('image/')) {
      return <ImageIcon size={20} className="text-emerald-500" />;
    } else if (mime.startsWith('video/')) {
      return <Play size={20} className="text-purple-500" />;
    } else if (asset.fileName.endsWith('.css')) {
      return <FileCode size={20} className="text-cyan-500" />;
    } else if (asset.fileName.endsWith('.js')) {
      return <FileCode size={20} className="text-yellow-500" />;
    } else if (asset.fileName.match(/\.(woff|woff2|ttf|otf)$/i)) {
      return <Folder size={20} className="text-indigo-500" />;
    }
    return <File size={20} className="text-slate-500" />;
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="SaaS Developers Asset Manager">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Assets Manager</h1>
            <p className="text-slate-500 text-sm mt-1">
              Upload custom images, videos, fonts, CSS files, and JS script files to use inside custom pages.
            </p>
          </div>
          
          <label className="flex items-center justify-center gap-2 bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-3 rounded-xl font-bold cursor-pointer transition-all shadow-md active:translate-y-0 hover:-translate-y-0.5 select-none">
            <UploadCloud size={18} />
            Upload Developer File
            <input
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload progress & error logs */}
        {uploading && (
          <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse border border-slate-700">
            <RefreshCw size={18} className="animate-spin text-[#76b900]" />
            <span className="text-sm font-bold">{uploadProgress}</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setFolderFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Assets
            </button>
            <button
              onClick={() => setFolderFilter('media')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'media' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFolderFilter('videos')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'videos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setFolderFilter('fonts')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'fonts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Fonts
            </button>
            <button
              onClick={() => setFolderFilter('styles')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'styles' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Styles (CSS)
            </button>
            <button
              onClick={() => setFolderFilter('scripts')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                folderFilter === 'scripts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Scripts (JS)
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file name..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900] bg-slate-50/50"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* Assets Grid List */}
        {loading ? (
          <div className="p-16 text-center bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm mt-3 font-semibold">Listing your assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-100 rounded-2xl max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Folder size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No assets uploaded</h3>
            <p className="text-slate-400 text-sm mt-2">
              {search 
                ? 'No matches found. Try broadening your filter queries.' 
                : 'Upload custom images, videos, fonts, stylesheet CSS files, and JS script files here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {assets.map((asset) => {
              const isImg = asset.mimeType.startsWith('image/');
              return (
                <div key={asset._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                  
                  {/* Thumbnail / File Box */}
                  <div className="h-40 bg-slate-50 border-b border-slate-100 relative flex items-center justify-center overflow-hidden">
                    {isImg ? (
                      <img
                        src={asset.url}
                        alt={asset.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {getAssetIcon(asset)}
                        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {asset.fileName.split('.').pop() || 'file'}
                        </span>
                      </div>
                    )}
                    
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition shadow-sm font-bold text-xs"
                      >
                        <Eye size={16} />
                      </a>
                      <button
                        onClick={() => handleDelete(asset._id)}
                        className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition shadow-sm font-bold text-xs"
                        title="Delete Asset"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Detail text details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 truncate" title={asset.fileName}>
                        {asset.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Category: <span className="uppercase text-slate-500 font-bold">{asset.folder}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Size: <span className="text-slate-500 font-bold">{(asset.size / 1024).toFixed(1)} KB</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopyUrl(asset.url)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        copyStatus === asset.url
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-[#f1f8e9] hover:bg-[#e4f3d4] text-[#76b900] border border-transparent'
                      }`}
                    >
                      <Copy size={12} />
                      {copyStatus === asset.url ? 'URL Copied!' : 'Copy Link URL'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ManageCustomAssets;
