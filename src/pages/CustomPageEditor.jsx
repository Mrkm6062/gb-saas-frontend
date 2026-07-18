import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import SimpleCodeEditor from '../components/SimpleCodeEditor';
import { 
  ArrowLeft, Save, Eye, Layout, Settings, FileCode, Check, 
  AlertCircle, Sparkles, FolderOpen, PanelRight, Globe, HelpCircle, Monitor, Code,
  Smartphone, Tablet as TabletIcon, Laptop, RefreshCw, ExternalLink 
} from 'lucide-react';

const CustomPageEditor = ({ token, stores, onLogout }) => {
  const { storeId, pageId } = useParams(); // If pageId is present, we are in Edit mode
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

  // Code Contents (Loaded with default snippets for first-time users if blank)
  const [headHTML, setHeadHTML] = useState('');
  
  const [bodyHTML, setBodyHTML] = useState(
    `<!-- Template HTML -->\n<div class="welcome-card animate-fade-in">\n  <h1>Welcome to Our Store!</h1>\n  <p>This is a custom landing page. You can customize this layout by pasting your own HTML, CSS, and JS code.</p>\n  <button id="cta-button" class="btn">Explore Products</button>\n</div>`
  );
  
  const [customCSS, setCustomCSS] = useState(
    `/* Template CSS Styles */\nbody {\n  font-family: 'Inter', sans-serif;\n  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);\n  color: #0f172a;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  margin: 0;\n  padding: 1.5rem;\n}\n.welcome-card {\n  max-width: 500px;\n  background: white;\n  padding: 2.5rem;\n  border-radius: 20px;\n  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);\n  text-align: center;\n}\n.btn {\n  background: #76b900;\n  color: white;\n  border: none;\n  padding: 0.75rem 1.5rem;\n  border-radius: 8px;\n  font-weight: bold;\n  cursor: pointer;\n  transition: all 0.2s;\n  margin-top: 1rem;\n}\n.btn:hover {\n  background: #639c00;\n  transform: translateY(-1px);\n}`
  );
  
  const [customJS, setCustomJS] = useState(
    `// Template Javascript Interactivity\nconst ctaBtn = document.getElementById('cta-button');\nif (ctaBtn) {\n  ctaBtn.addEventListener('click', () => {\n    alert('Explore CTA clicked!');\n  });\n}`
  );

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [canonical, setCanonical] = useState('');
  const [robots, setRobots] = useState('index, follow');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  // Assets & layout attributes
  const [favicon, setFavicon] = useState('');
  const [author, setAuthor] = useState('');
  const [pageIcon, setPageIcon] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  // Editor states
  const [activeTab, setActiveTab] = useState('html'); // html, css, js, settings
  const [splitScreen, setSplitScreen] = useState(true);
  const [themeMode, setThemeMode] = useState('vs-dark'); // vs-dark or vs-light
  const [previewViewport, setPreviewViewport] = useState('desktop'); // desktop, tablet, mobile
  const [previewKey, setPreviewKey] = useState(0); // Trigger iframe reloads

  // UI status
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assets, setAssets] = useState([]);
  const [assetsOpen, setAssetsOpen] = useState(false);
  
  // Input references to insert assets at cursor position
  const htmlRef = useRef(null);
  const cssRef = useRef(null);
  const jsRef = useRef(null);
  const activeEditorRef = useRef(null); // Keeps track of focused editor type & ref

  // Fetch page details if in Edit Mode
  useEffect(() => {
    const fetchPageDetails = async () => {
      if (!isEditMode || !currentStore._id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
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
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
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

  // TRACK ACTIVE EDITOR FOCUS STATE
  const trackEditorFocus = (type, ref) => {
    activeEditorRef.current = { type, ref };
  };

  // INSERT ASSETS AT CURSOR
  const insertAssetUrl = (url) => {
    const active = activeEditorRef.current;
    if (!active || !active.ref.current) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert("Click inside one of the code editor textareas first to specify where to insert, or copy the link directly.");
      return;
    }

    const el = active.ref.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const currentValue = el.value || "";

    let textToInsert = url;
    const ext = url.split('.').pop().toLowerCase();

    // Context-aware asset insertions helper
    if (active.type === 'html') {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
        textToInsert = `<img src="${url}" alt="image" />`;
      } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
        textToInsert = `<video src="${url}" controls></video>`;
      } else if (ext === 'css') {
        textToInsert = `<link rel="stylesheet" href="${url}" />`;
      } else if (ext === 'js') {
        textToInsert = `<script src="${url}"></script>`;
      }
    } else if (active.type === 'css') {
      textToInsert = `url("${url}")`;
    }

    const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);

    if (active.type === 'html') setBodyHTML(newValue);
    if (active.type === 'css') setCustomCSS(newValue);
    if (active.type === 'js') setCustomJS(newValue);

    // Refocus and reposition cursor
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + textToInsert.length;
    }, 50);
  };

  // PAYLOAD SIZE VALIDATION
  const validatePayloadSizes = () => {
    const htmlSize = new Blob([bodyHTML]).size;
    const cssSize = new Blob([customCSS]).size;
    const jsSize = new Blob([customJS]).size;

    // Size Constraints
    const MAX_HTML = 2 * 1024 * 1024; // 2MB
    const MAX_CSS = 500 * 1024;      // 500KB
    const MAX_JS = 500 * 1024;       // 500KB

    if (htmlSize > MAX_HTML) {
      setError(`HTML payload exceeds maximum size limit (2MB). Current size: ${(htmlSize / (1024 * 1024)).toFixed(2)}MB`);
      return false;
    }
    if (cssSize > MAX_CSS) {
      setError(`CSS payload exceeds maximum size limit (500KB). Current size: ${(cssSize / 1024).toFixed(1)}KB`);
      return false;
    }
    if (jsSize > MAX_JS) {
      setError(`Javascript payload exceeds maximum size limit (500KB). Current size: ${(jsSize / 1024).toFixed(1)}KB`);
      return false;
    }

    return true;
  };

  // SAVE HANDLER
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Page Title is required');
      setActiveTab('settings');
      return;
    }
    if (!slug.trim()) {
      setError('Page Slug is required');
      setActiveTab('settings');
      return;
    }

    // Size limit validation
    if (!validatePayloadSizes()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    const payload = {
      storeId: currentStore._id,
      title,
      slug: slug.toLowerCase().trim().replace(/^\/|\/$/g, ''),
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
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        const savedPage = await res.json();
        setSuccessMsg('Page saved successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        if (!isEditMode) {
          navigate(`/store/${storeId}/custom-pages/edit/${savedPage._id}`);
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to save custom page');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error trying to save page.');
    } finally {
      setSaving(false);
    }
  };

  // Compile Preview Source with Sandboxed restrictions
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
            // Restrict iframe from accessing parent window hooks
            window.parent = null;
            window.top = null;
            
            // Console error handlers
            window.onerror = function(message, source, lineno, colno, error) {
              console.error(message + " on line " + lineno);
              return true;
            };
            try {
              ${customJS || ''}
            } catch (err) {
              console.error("JS Execution Error: " + err.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleOpenInNewTab = () => {
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(compilePreviewSource());
      newTab.document.close();
    }
  };

  const getViewportWidthClass = () => {
    if (previewViewport === 'tablet') return 'w-[768px] border-x border-slate-700';
    if (previewViewport === 'mobile') return 'w-[375px] border-x border-slate-700';
    return 'w-full';
  };

  // Render Editors tabs
  const renderEditorArea = () => {
    switch (activeTab) {
      case 'html':
        return (
          <div className="flex flex-col h-full space-y-2">
            <SimpleCodeEditor 
              value={bodyHTML} 
              onChange={setBodyHTML} 
              language="html" 
              theme={themeMode} 
              textareaRef={htmlRef}
              placeholder="Paste your HTML page template here..."
              onFocus={() => trackEditorFocus('html', htmlRef)}
              onSaveShortcut={handleSave}
            />
          </div>
        );
      case 'css':
        return (
          <div className="flex flex-col h-full space-y-2">
            <SimpleCodeEditor 
              value={customCSS} 
              onChange={setCustomCSS} 
              language="css" 
              theme={themeMode} 
              textareaRef={cssRef}
              placeholder="Paste your custom CSS stylesheets here..."
              onFocus={() => trackEditorFocus('css', cssRef)}
              onSaveShortcut={handleSave}
            />
          </div>
        );
      case 'js':
        return (
          <div className="flex flex-col h-full space-y-2">
            <SimpleCodeEditor 
              value={customJS} 
              onChange={setCustomJS} 
              language="javascript" 
              theme={themeMode} 
              textareaRef={jsRef}
              placeholder="Paste your custom Javascript interactive code here..."
              onFocus={() => trackEditorFocus('js', jsRef)}
              onSaveShortcut={handleSave}
            />
          </div>
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
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">URL Slug / Path *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                    placeholder="e.g. about-us"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Page Type</label>
                  <select
                    value={pageType}
                    onChange={(e) => setPageType(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900] text-white"
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
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Page Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
              </div>
            </div>

            {/* Visibility & Layout */}
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
                    className="p-2.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
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

            {/* SEO accordion settings */}
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
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Canonical URL</label>
                  <input
                    type="text"
                    value={canonical}
                    onChange={(e) => setCanonical(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Meta Description</label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Robots Meta tag</label>
                  <input
                    type="text"
                    value={robots}
                    onChange={(e) => setRobots(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 border-t border-slate-800/80 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-300">Social Media Shares (Open Graph)</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Title (OG Title)</label>
                  <input
                    type="text"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Image URL (OG Image)</label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Social Description (OG Description)</label>
                  <textarea
                    rows={2}
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Head tags */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2 text-[#76b900]">
                <Code size={18} /> Custom Head HTML (Stylesheets / Script tags)
              </h3>
              <textarea
                rows={5}
                value={headHTML}
                onChange={(e) => setHeadHTML(e.target.value)}
                placeholder='<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>'
                className="w-full mt-3 p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#76b900]"
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
        
        {/* Sub-Header bar */}
        <div className="bg-[#1e293b] p-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/store/${storeId}/custom-pages`)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Back to Pages List"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!isEditMode) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                    }
                  }}
                  placeholder="Page Title (e.g. About Us)"
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#76b900] w-48 sm:w-64"
                />
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

          <div className="flex items-center gap-3">
            
            {/* Viewport resizing preview controls */}
            {splitScreen && activeTab !== 'settings' && (
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded transition ${previewViewport === 'desktop' ? 'bg-[#76b900] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Desktop Viewport"
                >
                  <Laptop size={14} />
                </button>
                <button
                  onClick={() => setPreviewViewport('tablet')}
                  className={`p-1.5 rounded transition ${previewViewport === 'tablet' ? 'bg-[#76b900] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Tablet Viewport"
                >
                  <TabletIcon size={14} />
                </button>
                <button
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded transition ${previewViewport === 'mobile' ? 'bg-[#76b900] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Mobile Viewport"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            )}

            {/* Split Screen Checkbox */}
            {activeTab !== 'settings' && (
              <button
                onClick={() => setSplitScreen(!splitScreen)}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all border ${
                  splitScreen 
                    ? 'bg-slate-800 border-slate-700 text-[#76b900]' 
                    : 'bg-slate-800/30 border-transparent text-slate-400 hover:text-slate-300'
                }`}
                title="Toggle Live Split Preview"
              >
                <Monitor size={16} />
                <span>Split Screen</span>
              </button>
            )}

            {/* Theme switcher */}
            {activeTab !== 'settings' && (
              <button
                onClick={() => setThemeMode(themeMode === 'vs-dark' ? 'vs-light' : 'vs-dark')}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
              >
                Theme: {themeMode === 'vs-dark' ? 'Dark' : 'Light'}
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
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
            <div className="bg-[#1e1e1e] flex border-b border-slate-800 px-4 shrink-0 justify-between items-center pr-6">
              <div className="flex">
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

              {/* Helper text display */}
              <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Sparkles size={12} className="text-[#76b900]" />
                <span>Write code in VS Code and copy-paste here.</span>
              </div>
            </div>

            {/* Feedback Banners */}
            {error && (
              <div className="bg-red-950/60 border-b border-red-800 text-red-300 px-4 py-2.5 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-950/60 border-b border-green-800 text-green-300 px-4 py-2.5 text-xs flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Code Editor Container */}
            <div className="flex-1 w-full p-4 relative overflow-y-auto bg-[#1e1e1e]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                renderEditorArea()
              )}
            </div>

          </div>

          {/* Split Screen Frame Preview */}
          {splitScreen && activeTab !== 'settings' && (
            <div className="w-1/2 border-l border-slate-800 bg-[#0f172a] h-full flex flex-col items-center">
              
              {/* Preview Actions bar */}
              <div className="w-full bg-[#1e293b] px-4 py-2 text-xs text-slate-400 font-bold border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
                <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[#76b900]" /> Sandboxed Preview</span>
                
                {/* Refresh and external popups controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewKey(prev => prev + 1)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                    title="Refresh Preview"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    onClick={handleOpenInNewTab}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                    title="Open Preview in New Tab"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* Viewport Frame wrapper */}
              <div className="flex-1 w-full flex justify-center bg-slate-950/20 p-4 overflow-hidden">
                <div className={`h-full bg-white relative transition-all duration-300 ${getViewportWidthClass()}`}>
                  <iframe
                    key={previewKey}
                    title="Live dynamic page preview"
                    srcDoc={compilePreviewSource()}
                    sandbox="allow-scripts"
                    className="w-full h-full border-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Inline Asset Manager Sidebar drawer */}
          {assetsOpen && (
            <div className="w-80 border-l border-slate-800 bg-[#1e293b] h-full flex flex-col transition-all z-20 shadow-2xl shrink-0">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FolderOpen size={16} className="text-[#76b900]" /> Insert Asset
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
                  Click <strong>"Insert"</strong> on any asset below to insert it at your editor's current cursor position.
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
                          onClick={() => insertAssetUrl(asset.url)}
                          className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 cursor-pointer transition-all"
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
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate uppercase">{(asset.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-center text-[10px] text-[#76b900] font-bold bg-[#76b900]/10 py-1 rounded hover:bg-[#76b900]/20 transition">
                            Insert Asset
                          </div>
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
