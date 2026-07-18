import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import MonacoEditor from '../components/MonacoEditor';
import { 
  ArrowLeft, Save, Eye, Layout, Settings, FileCode, Check, 
  AlertCircle, Sparkles, FolderOpen, PanelRight, Globe, HelpCircle, Monitor, Code 
} from 'lucide-react';

const CustomPageEditor = ({ token, stores, onLogout }) => {
  const { storeId, pageId } = useParams(); // if pageId is present, we are in Edit mode
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const isEditMode = !!pageId;

  // Page Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState('custom');
  const [description, setDescription] = useState('');
  const [isHomepage, setIsHomepage] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [status, setStatus] = useState('draft');

  // Codes
  const [headHTML, setHeadHTML] = useState('');
  const [bodyHTML, setBodyHTML] = useState('<!-- Custom Body HTML -->\n<div class="welcome-container">\n  <h1>Welcome to Galibrand Store!</h1>\n  <p>Customize this content directly using HTML, CSS, and Javascript.</p>\n</div>');
  const [customCSS, setCustomCSS] = useState('/* Custom page CSS styling */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  color: #1e293b;\n  margin: 0;\n  padding: 2rem;\n}\n.welcome-container {\n  max-width: 600px;\n  margin: 4rem auto;\n  padding: 3rem;\n  background: #ffffff;\n  border-radius: 16px;\n  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);\n  text-align: center;\n}');
  const [customJS, setCustomJS] = useState('// Custom page JS logic\nconsole.log("Custom Page JS Loaded.");');

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [canonical, setCanonical] = useState('');
  const [robots, setRobots] = useState('index, follow');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  // Assets & layout
  const [favicon, setFavicon] = useState('');
  const [author, setAuthor] = useState('');
  const [pageIcon, setPageIcon] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  // Editor configuration
  const [activeTab, setActiveTab] = useState('html'); // html, css, js, preview, settings
  const [splitScreen, setSplitScreen] = useState(true);
  const [themeMode, setThemeMode] = useState('vs-dark'); // vs-dark, vs-light
  const [wordWrap, setWordWrap] = useState('on');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // UI state
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assets, setAssets] = useState([]);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null); // stores url of copied asset

  // Auto-save timer ref
  const lastSavedStateRef = useRef({});
  const autoSaveTimeoutRef = useRef(null);

  // Fetch page details if Edit Mode
  useEffect(() => {
    const fetchPageDetails = async () => {
      if (!isEditMode || !currentStore._id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const page = await res.json();
          setTitle(page.title || '');
          setSlug(page.slug || '');
          setPageType(page.pageType || 'custom');
          setDescription(page.description || '');
          setIsHomepage(page.isHomepage || false);
          setIsPublished(page.isPublished || false);
          setStatus(page.status || 'draft');

          setHeadHTML(page.headHTML || '');
          setBodyHTML(page.bodyHTML || '');
          setCustomCSS(page.customCSS || '');
          setCustomJS(page.customJS || '');

          if (page.seo) {
            setMetaTitle(page.seo.metaTitle || '');
            setMetaDescription(page.seo.metaDescription || '');
            setKeywords(page.seo.keywords || '');
            setCanonical(page.seo.canonical || '');
            setRobots(page.seo.robots || 'index, follow');
            setOgTitle(page.seo.ogTitle || '');
            setOgDescription(page.seo.ogDescription || '');
            setOgImage(page.seo.ogImage || '');
          }

          setFavicon(page.favicon || '');
          setAuthor(page.author || '');
          setPageIcon(page.pageIcon || '');
          setThumbnail(page.thumbnail || '');
          setSortOrder(page.sortOrder || 0);

          // Update ref for auto-save tracking
          lastSavedStateRef.current = {
            title: page.title,
            slug: page.slug,
            bodyHTML: page.bodyHTML,
            customCSS: page.customCSS,
            customJS: page.customJS
          };
        } else {
          setError('Failed to load page data');
        }
      } catch (err) {
        setError('Error loading page details');
      } finally {
        setLoading(false);
      }
    };

    fetchPageDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, currentStore._id]);

  // Fetch Assets for inserting urls
  const fetchAssets = async () => {
    if (!currentStore._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-assets/list?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (assetsOpen) {
      fetchAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsOpen, currentStore._id]);

  // Trigger Save function
  const handleSave = async (silent = false) => {
    if (!title.trim()) {
      if (!silent) setError('Page Title is required');
      return;
    }
    if (!slug.trim()) {
      if (!silent) setError('Page Slug is required');
      return;
    }

    if (!silent) setSaving(true);
    setError('');
    if (!silent) setSuccessMsg('');

    const payload = {
      storeId: currentStore._id,
      title,
      slug: slug.toLowerCase().trim().replace(/^\/|\/$/g, ''), // normalize
      pageType,
      description,
      isHomepage,
      isPublished: status === 'published',
      status,
      headHTML,
      bodyHTML,
      customCSS,
      customJS,
      seo: {
        metaTitle,
        metaDescription,
        keywords,
        canonical,
        robots,
        ogTitle,
        ogDescription,
        ogImage
      },
      favicon,
      author,
      pageIcon,
      thumbnail,
      sortOrder
    };

    try {
      const url = isEditMode 
        ? `${API_BASE_URL}/api/custom-pages/page/${pageId}` 
        : `${API_BASE_URL}/api/custom-pages/page`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedPage = await res.json();
        
        lastSavedStateRef.current = {
          title: savedPage.title,
          slug: savedPage.slug,
          bodyHTML: savedPage.bodyHTML,
          customCSS: savedPage.customCSS,
          customJS: savedPage.customJS
        };

        if (!silent) {
          setSuccessMsg('Page saved successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
          if (!isEditMode) {
            navigate(`/store/${storeId}/custom-pages/edit/${savedPage._id}`);
          }
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to save custom page');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error trying to save page.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Debounced auto-save handler
  useEffect(() => {
    if (!autoSaveEnabled || !isEditMode || loading) return;

    // Check if anything actually changed
    const hasChanges = 
      title !== lastSavedStateRef.current.title ||
      slug !== lastSavedStateRef.current.slug ||
      bodyHTML !== lastSavedStateRef.current.bodyHTML ||
      customCSS !== lastSavedStateRef.current.customCSS ||
      customJS !== lastSavedStateRef.current.customJS;

    if (!hasChanges) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true);
    }, 5000); // 5 seconds of inactivity triggers background save

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, bodyHTML, customCSS, customJS, autoSaveEnabled]);

  // Asset URL copy helper
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopyStatus(url);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // Compile full iframe document string
  const compilePreviewSource = () => {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${headHTML || ''}
          <style>
            ${customCSS || ''}
          </style>
        </head>
        <body>
          ${bodyHTML || ''}
          <script>
            // Sandboxed environment console logging handler
            window.onerror = function(message, source, lineno, colno, error) {
              console.error(message + " on line " + lineno);
              return true;
            };
            try {
              ${customJS || ''}
            } catch (err) {
              console.error("Javascript run error: " + err.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  // Render Editor Tabs
  const renderEditorArea = () => {
    switch (activeTab) {
      case 'html':
        return (
          <MonacoEditor 
            value={bodyHTML} 
            onChange={setBodyHTML} 
            language="html" 
            theme={themeMode} 
            wordWrap={wordWrap}
          />
        );
      case 'css':
        return (
          <MonacoEditor 
            value={customCSS} 
            onChange={setCustomCSS} 
            language="css" 
            theme={themeMode} 
            wordWrap={wordWrap}
          />
        );
      case 'js':
        return (
          <MonacoEditor 
            value={customJS} 
            onChange={setCustomJS} 
            language="javascript" 
            theme={themeMode} 
            wordWrap={wordWrap}
          />
        );
      case 'settings':
        return (
          <div className="p-6 bg-slate-900 border border-slate-700 text-white rounded-lg h-full overflow-y-auto space-y-6">
            
            {/* Page Info */}
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 text-[#76b900]">
                <Settings size={18} /> Page Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Page Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!isEditMode) {
                        // Auto slugify in create mode
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">URL Slug / Path *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                    placeholder="e.g. about-us"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Page Type</label>
                  <select
                    value={pageType}
                    onChange={(e) => setPageType(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900] text-white"
                  >
                    <option value="custom">Custom Page</option>
                    <option value="landing">Landing Page</option>
                    <option value="faq">FAQ</option>
                    <option value="blog">Blog</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Page Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
              </div>
            </div>

            {/* Layout options */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2 text-[#76b900]">
                <Layout size={18} /> Visibility & Layout Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                  <input
                    id="isHomepage"
                    type="checkbox"
                    checked={isHomepage}
                    onChange={(e) => setIsHomepage(e.target.checked)}
                    className="mt-1 accent-[#76b900]"
                  />
                  <label htmlFor="isHomepage">
                    <span className="block text-sm font-bold">Set as Store Homepage</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      This page will load directly at your store's root domain URL (e.g. /). This replaces your default home theme.
                    </span>
                  </label>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Public)</option>
                  </select>
                  <div>
                    <span className="block text-sm font-bold">Publication Status</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Draft pages are only accessible inside preview frames. Published pages are live on the storefront.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO Accordion */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2 text-[#76b900]">
                <Globe size={18} /> Search Engine Optimization (SEO) & Open Graph
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Meta Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                    placeholder="Search results title tag"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Canonical URL</label>
                  <input
                    type="text"
                    value={canonical}
                    onChange={(e) => setCanonical(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                    placeholder="https://yourstore.com/canonical-url"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Meta Description</label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                    placeholder="Short description summary shown in Google search results"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                    placeholder="shoes, apparel, custom design"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Robots Meta tag</label>
                  <input
                    type="text"
                    value={robots}
                    onChange={(e) => setRobots(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                  />
                </div>

                {/* OG / Socials */}
                <div className="col-span-1 md:col-span-2 border-t border-slate-800/80 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-300">Social Media Shares (Open Graph)</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Title (OG Title)</label>
                  <input
                    type="text"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Image URL (OG Image)</label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Description (OG Description)</label>
                  <textarea
                    rows={2}
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Head Content */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2 text-[#76b900]">
                <Code size={18} /> Custom Head HTML (Includes stylesheet, script links)
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Directly inject stylesheets, script bundles, preloads, or Google Fonts into the HTML <code>&lt;head&gt;</code> element.
              </p>
              <textarea
                rows={5}
                value={headHTML}
                onChange={(e) => setHeadHTML(e.target.value)}
                placeholder='<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>'
                className="w-full mt-3 p-3 bg-slate-800 border border-slate-700 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#76b900]"
              />
            </div>

          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle={isEditMode ? `Edit Page: ${title}` : "New Custom Page"}>
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden w-full bg-slate-900 border-t border-slate-800 text-slate-200">
        
        {/* Editor Sub-Header / Tool Controls */}
        <div className="bg-[#1e293b] p-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/store/${storeId}/custom-pages`)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Back to Pages List"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black truncate max-w-xs">{title || "Untitled Custom Page"}</span>
                {isHomepage && <span className="bg-[#f1f8e9]/10 text-[#76b900] text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-[#76b900]/20">Home</span>}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${status === 'published' ? 'bg-green-900/40 text-green-400 border border-green-800/40' : 'bg-slate-700 text-slate-300'}`}>
                  {status === 'published' ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Path: <code className="bg-slate-800 text-slate-300 px-1 rounded">/{slug || '...'}</code>
              </p>
            </div>
          </div>

          {/* Settings / Autosave / Toggles */}
          <div className="flex items-center gap-3">
            
            {/* Split screen Toggle */}
            {activeTab !== 'settings' && (
              <button
                onClick={() => setSplitScreen(!splitScreen)}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all border ${
                  splitScreen 
                    ? 'bg-slate-800 border-slate-700 text-[#76b900]' 
                    : 'bg-slate-800/30 border-transparent text-slate-400 hover:text-slate-300'
                }`}
                title="Toggle Split Screen Live Preview"
              >
                <Monitor size={16} />
                <span>Split Screen</span>
              </button>
            )}

            {/* Monaco Theme Mode */}
            {activeTab !== 'settings' && (
              <button
                onClick={() => setThemeMode(themeMode === 'vs-dark' ? 'vs-light' : 'vs-dark')}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Theme: {themeMode === 'vs-dark' ? 'Dark' : 'Light'}
              </button>
            )}

            {/* Word wrap Toggle */}
            {activeTab !== 'settings' && (
              <button
                onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Wrap: {wordWrap === 'on' ? 'On' : 'Off'}
              </button>
            )}

            {/* Autosave Check */}
            {isEditMode && (
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800/30 px-2 py-1.5 rounded border border-slate-800/80">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="accent-[#76b900] scale-90"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase select-none">AutoSave</span>
              </label>
            )}

            {/* Save Button */}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-[#76b900] hover:bg-[#639c00] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Page'}
            </button>

            {/* Asset Sidebar Trigger */}
            <button
              onClick={() => setAssetsOpen(!assetsOpen)}
              className={`p-2 rounded-lg border ${
                assetsOpen 
                  ? 'bg-[#76b900]/15 border-[#76b900]/30 text-[#76b900]' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Open Asset Manager"
            >
              <FolderOpen size={18} />
            </button>

          </div>
        </div>

        {/* Editor Main Content Workspace */}
        <div className="flex-1 flex overflow-hidden w-full relative">
          
          {/* Main Code Editor Panel */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Editor Selector Tabs */}
            <div className="bg-[#1e1e1e] flex border-b border-slate-800 px-4 shrink-0">
              <button
                onClick={() => { setActiveTab('html'); }}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'html' ? 'border-[#76b900] text-white bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <FileCode size={14} className="text-orange-400" />
                HTML (Body)
              </button>
              <button
                onClick={() => { setActiveTab('css'); }}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'css' ? 'border-[#76b900] text-white bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <FileCode size={14} className="text-cyan-400" />
                CSS (Custom Styles)
              </button>
              <button
                onClick={() => { setActiveTab('js'); }}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'js' ? 'border-[#76b900] text-white bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <FileCode size={14} className="text-yellow-400" />
                Javascript (JS Code)
              </button>
              <button
                onClick={() => { setActiveTab('settings'); }}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'settings' ? 'border-[#76b900] text-white bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Settings size={14} className="text-[#76b900]" />
                Page Config & SEO
              </button>
            </div>

            {/* Feedback Banners */}
            {error && (
              <div className="bg-red-950/60 border-b border-red-800 text-red-300 px-4 py-2 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-950/60 border-b border-green-800 text-green-300 px-4 py-2 text-xs flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Monaco Editor Wrapper */}
            <div className="flex-1 w-full p-4 relative overflow-hidden bg-[#1e1e1e]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                renderEditorArea()
              )}
            </div>

          </div>

          {/* Split Screen Iframe Preview (Right Panel) */}
          {splitScreen && activeTab !== 'settings' && (
            <div className="w-1/2 border-l border-slate-800 bg-[#0f172a] h-full flex flex-col">
              <div className="bg-[#1e293b] px-4 py-2.5 text-xs text-slate-400 font-bold border-b border-slate-800 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[#76b900]" /> Live Sandboxed Preview</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">Strict Sandbox</span>
              </div>
              <div className="flex-1 bg-white relative">
                <iframe
                  title="Live page preview frame"
                  srcDoc={compilePreviewSource()}
                  sandbox="allow-scripts"
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>
          )}

          {/* Inline Asset Manager Sidebar drawer */}
          {assetsOpen && (
            <div className="w-80 border-l border-slate-800 bg-[#1e293b] h-full flex flex-col transition-all z-20 shadow-2xl shrink-0">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FolderOpen size={16} className="text-[#76b900]" /> Copy Asset Link
                </h3>
                <button
                  onClick={() => setAssetsOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded"
                >
                  Close
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Click any asset below to copy its Cloud Storage URL, then paste it directly into your HTML code (e.g. <code>src="..."</code>) or CSS (e.g. <code>url(...)</code>).
                </p>
                
                {assets.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded bg-slate-900/30">
                    <p className="text-slate-500 text-xs">No assets uploaded yet.</p>
                    <Link
                      to={`/store/${storeId}/assets`}
                      target="_blank"
                      className="inline-block mt-3 text-xs text-[#76b900] hover:underline"
                    >
                      Go to Asset Manager &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map((asset) => {
                      const isImg = asset.mimeType.startsWith('image/');
                      return (
                        <div 
                          key={asset._id} 
                          onClick={() => handleCopyUrl(asset.url)}
                          className={`p-2.5 rounded-lg border bg-slate-900/50 hover:bg-slate-900/80 cursor-pointer transition-all ${
                            copyStatus === asset.url ? 'border-[#76b900]' : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isImg ? (
                              <img src={asset.url} alt="" className="w-8 h-8 rounded object-cover border border-slate-800 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-slate-800 text-slate-400 rounded flex items-center justify-center text-[9px] font-bold shrink-0 border border-slate-700">
                                {asset.fileName.split('.').pop().toUpperCase()}
                              </div>
                            )}
                            <div className="overflow-hidden flex-1">
                              <p className="text-xs font-bold text-slate-300 truncate">{asset.fileName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate uppercase">{(asset.size / 1024).toFixed(1)} KB | {asset.folder}</p>
                            </div>
                          </div>
                          
                          {copyStatus === asset.url && (
                            <div className="mt-2 text-center text-[10px] text-[#76b900] font-bold bg-[#76b900]/10 py-1 rounded">
                              ✓ URL Copied to Clipboard!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomPageEditor;
