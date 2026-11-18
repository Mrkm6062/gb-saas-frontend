import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  UploadCloud, FolderUp, Globe, FileCode, FileText, Image as ImageIcon, 
  Trash2, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, 
  Search, HardDrive, Eye, X, Monitor, Smartphone, Tablet
} from 'lucide-react';

const ManageCustomWebsite = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId || s._id === storeId) || {};

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [hasIndex, setHasIndex] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);
  const [entryUrl, setEntryUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop, tablet, mobile
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, filePath: null, isAll: false });

  const folderInputRef = useRef(null);
  const filesInputRef = useRef(null);

  const getCsrfToken = () => {
    return document.cookie.match(/(^| )csrfToken=([^;]+)/)?.[2] || '';
  };

  const fetchFiles = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-website/files?storeId=${currentStore._id}`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setHasIndex(data.hasIndex || false);
        setTotalFiles(data.totalFiles || 0);
        setTotalSizeBytes(data.totalSizeBytes || 0);
        setEntryUrl(data.entryUrl || '');
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to fetch custom website files');
      }
    } catch (err) {
      console.error(err);
      setError('Network error occurred while fetching website files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore._id]);

  // Upload handler for both folder upload and multiple files upload
  const handleFileUpload = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    if (!currentStore._id) {
      setError('Store not found. Please refresh the page.');
      return;
    }

    setUploading(true);
    setUploadProgress(`Preparing ${selectedFiles.length} file(s)...`);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('storeId', currentStore._id);

      const paths = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        formData.append('files', file);
        // file.webkitRelativePath contains the relative folder hierarchy if selected via folder picker
        paths.push(file.webkitRelativePath || file.name);
      }
      formData.append('paths', JSON.stringify(paths));

      setUploadProgress(`Uploading ${selectedFiles.length} file(s) to Google Cloud Storage...`);

      const csrfToken = getCsrfToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`${API_BASE_URL}/api/custom-website/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || `Successfully uploaded ${selectedFiles.length} file(s)!`);
        setUploadProgress('');
        fetchFiles();
      } else {
        setError(data.message || 'Upload failed. Please check file types and try again.');
        setUploadProgress('');
      }
    } catch (err) {
      console.error(err);
      setError('Upload failed due to network error.');
      setUploadProgress('');
    } finally {
      setUploading(false);
      // Reset inputs so the same folder/files can be chosen again if needed
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (filesInputRef.current) filesInputRef.current.value = '';
    }
  };

  // Drag and drop handler
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const filesToUpload = [];

      const traverseFileTree = async (item, path = "") => {
        if (item.isFile) {
          const file = await new Promise((resolve) => item.file(resolve));
          // Attach custom property relativePath
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
          });
          filesToUpload.push(file);
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          const entries = await new Promise((resolve) => {
            dirReader.readEntries(resolve);
          });
          for (const entry of entries) {
            await traverseFileTree(entry, path + item.name + "/");
          }
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (item) {
          await traverseFileTree(item);
        }
      }

      if (filesToUpload.length > 0) {
        handleFileUpload(filesToUpload);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleDeleteFile = async (filePath) => {
    try {
      const csrfToken = getCsrfToken();
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`${API_BASE_URL}/api/custom-website/file`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ storeId: currentStore._id, filePath }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'File deleted.');
        fetchFiles();
      } else {
        setError(data.message || 'Failed to delete file.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while deleting file.');
    } finally {
      setDeleteConfirmModal({ isOpen: false, filePath: null, isAll: false });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const csrfToken = getCsrfToken();
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`${API_BASE_URL}/api/custom-website/all`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ storeId: currentStore._id }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'All custom website files deleted.');
        fetchFiles();
      } else {
        setError(data.message || 'Failed to delete custom website.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while deleting website.');
    } finally {
      setDeleteConfirmModal({ isOpen: false, filePath: null, isAll: false });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filePath) => {
    const lower = (filePath || '').toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return <FileCode size={16} className="text-orange-500" />;
    if (lower.endsWith('.css')) return <FileCode size={16} className="text-blue-500" />;
    if (lower.endsWith('.js') || lower.endsWith('.mjs')) return <FileCode size={16} className="text-yellow-500" />;
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) return <ImageIcon size={16} className="text-emerald-500" />;
    return <FileText size={16} className="text-slate-400" />;
  };

  const filteredFiles = files.filter(f => 
    f.path.toLowerCase().includes(search.toLowerCase()) || 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const storefrontDomain = currentStore.canonicalDomain || 
    (currentStore.subdomain ? `${currentStore.subdomain}.galibrand.cloud` : (currentStore.storeSlug ? `${currentStore.storeSlug}.galibrand.cloud` : ''));
  const storefrontUrl = storefrontDomain ? `https://${storefrontDomain}` : '';

  return (
    <AdminLayout token={token} stores={stores} onLogout={onLogout}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                HTML / CSS / JS
              </span>
              <span className="text-xs text-slate-400 font-medium">Google Cloud Storage Powered</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="text-green-600" />
              Custom Website
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload your ready-made website folder or files. They are saved directly to Google Cloud Storage and loaded onto your storefront.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition text-xs font-bold flex items-center gap-1.5"
              title="Refresh Files"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {hasIndex && entryUrl && (
              <button
                onClick={() => setPreviewOpen(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Eye size={15} />
                <span>Live Preview</span>
              </button>
            )}

            {storefrontUrl && (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <span>Visit Storefront</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-green-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${hasIndex ? 'bg-green-500 animate-pulse' : totalFiles > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
              <span className="text-lg font-black text-slate-900">
                {hasIndex ? 'Website Live' : totalFiles > 0 ? 'Missing index.html' : 'Not Uploaded'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasIndex ? 'index.html entry point active' : totalFiles > 0 ? 'Upload index.html at root' : 'Upload files below'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Files</div>
            <div className="text-2xl font-black text-slate-900">{totalFiles}</div>
            <p className="text-[11px] text-slate-500 mt-1">HTML, CSS, JS & Assets</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Storage Used</div>
            <div className="text-2xl font-black text-slate-900">{formatBytes(totalSizeBytes)}</div>
            <p className="text-[11px] text-slate-500 mt-1">Stored in Google Cloud</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Entry Point</div>
            <div className="text-base font-black text-slate-900 truncate font-mono">
              {hasIndex ? 'index.html' : '—'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {storefrontDomain || 'Configure domain'}
            </p>
          </div>
        </div>

        {/* Upload Action Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          className="bg-gradient-to-br from-green-50/50 via-white to-slate-50 border-2 border-dashed border-green-300 hover:border-green-500 rounded-3xl p-8 text-center transition-all shadow-xs"
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <UploadCloud size={32} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Upload Custom Website</h3>
              <p className="text-xs text-slate-500 mt-1">
                Drag and drop your website folder or HTML/CSS/JS files directly here, or use the buttons below.
              </p>
            </div>

            {uploading ? (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-green-700">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{uploadProgress || 'Uploading...'}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-600 h-full animate-pulse w-3/4"></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {/* Hidden input for folder upload */}
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => folderInputRef.current && folderInputRef.current.click()}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition hover:scale-102"
                >
                  <FolderUp size={16} />
                  <span>Upload Entire Folder</span>
                </button>

                {/* Hidden input for multiple files upload */}
                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => filesInputRef.current && filesInputRef.current.click()}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition hover:scale-102"
                >
                  <FileCode size={16} />
                  <span>Upload Files</span>
                </button>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-400 font-medium">
              Supports <span className="font-mono text-slate-600 font-bold">.html, .css, .js, .png, .jpg, .svg, .webp, .woff, .json</span> & all standard assets.
            </div>
          </div>
        </div>

        {/* Files Explorer Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Uploaded Website Files</h2>
              <p className="text-xs text-slate-400">All files currently deployed to Google Cloud Storage</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none w-48 sm:w-60"
                />
              </div>

              {files.length > 0 && (
                <button
                  onClick={() => setDeleteConfirmModal({ isOpen: true, filePath: null, isAll: true })}
                  className="h-9 px-3 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete All</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
              Loading custom website files...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <HardDrive size={36} className="mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-600">
                {search ? 'No files match your search' : 'No website files uploaded yet'}
              </div>
              <p className="text-[11px] text-slate-400">
                Upload your website folder containing index.html, style.css, and assets to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100">
                    <th className="py-3 px-4">File Path</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFiles.map((file) => {
                    const isIndex = file.path.toLowerCase() === 'index.html' || file.path.toLowerCase() === 'index.htm';
                    return (
                      <tr key={file.path} className={`hover:bg-slate-50/70 transition ${isIndex ? 'bg-green-50/30' : ''}`}>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.path)}
                            <span>{file.path}</span>
                            {isIndex && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                Entry Point
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {file.contentType || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-bold">
                          {formatBytes(file.size)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="View in new tab"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => setDeleteConfirmModal({ isOpen: true, filePath: file.path, isAll: false })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2 text-xs text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-green-600" />
            Custom Website Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
            <li>Ensure your root folder contains an <span className="font-mono text-slate-700 font-bold">index.html</span> file so your homepage loads correctly.</li>
            <li>All relative links like <span className="font-mono text-slate-700 font-bold">&lt;link href="style.css"&gt;</span> or <span className="font-mono text-slate-700 font-bold">&lt;script src="js/main.js"&gt;</span> resolve automatically.</li>
            <li>Files are securely hosted in Google Cloud Storage and loaded onto your custom domain or subdomain.</li>
            <li>You can upload new files anytime to update your custom website instantly without downtime.</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                {deleteConfirmModal.isAll ? 'Delete Entire Custom Website?' : 'Delete This File?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteConfirmModal.isAll 
                  ? 'This will permanently remove all files from Google Cloud Storage for this store.'
                  : `Are you sure you want to delete "${deleteConfirmModal.filePath}"?`}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, filePath: null, isAll: false })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmModal.isAll) handleDeleteAll();
                  else handleDeleteFile(deleteConfirmModal.filePath);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between text-white pb-3 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="font-bold text-sm flex items-center gap-2">
                <Globe size={18} className="text-green-400" />
                <span>Live Website Preview</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg transition ${previewDevice === 'tablet' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Tablet View"
                >
                  <Tablet size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={entryUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <span>Open in Tab</span>
                <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div 
              className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 h-full flex flex-col ${
                previewDevice === 'mobile' ? 'w-[375px]' : previewDevice === 'tablet' ? 'w-[768px]' : 'w-full max-w-6xl'
              }`}
            >
              <iframe
                src={entryUrl}
                title="Custom Website Preview"
                className="w-full flex-1 border-0"
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageCustomWebsite;
