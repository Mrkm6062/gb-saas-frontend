import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { formatPolicyHtml } from '../utils/policyFormatter';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Eye, 
  Edit3, 
  Trash2, 
  FileText, 
  Sparkles, 
  Check, 
  BookOpen, 
  HelpCircle 
} from 'lucide-react';

const STANDARD_TEMPLATES = {
  return_refund: {
    title: "Return & Refund Policy",
    content: `<h2>1. Return Policy Overview</h2>
<p>We want you to be completely satisfied with your purchase. If you are not satisfied, you may return eligible items within <strong>7 days</strong> of delivery.</p>

<h2>2. Return Eligibility Criteria</h2>
<p>To qualify for a return or replacement, items must meet the following conditions:</p>
<ul>
  <li>Items must be in <strong>original, unworn, and unwashed</strong> condition.</li>
  <li>All original product tags, branded packaging, and accessories must be intact.</li>
  <li>The original purchase invoice or order receipt must be provided.</li>
</ul>

<h2>3. Non-Returnable & Non-Refundable Items</h2>
<p>The following categories are strictly non-returnable:</p>
<ul>
  <li>Perishable goods (such as food items, sweets, and beverages).</li>
  <li>Personal care, cosmetics, and hygiene products.</li>
  <li>Custom-printed, engraved, or personalized items.</li>
  <li>Items purchased during clearance or flash sales.</li>
</ul>

<h2>4. Refund Processing Timeline</h2>
<p>Once your returned package is received and inspected at our warehouse, your refund will be processed within <strong>5 to 7 business days</strong>. Refunds are credited back to your original payment method (or via UPI / Bank transfer for Cash on Delivery orders).</p>

<blockquote>Note: Original shipping fees are non-refundable unless the return is due to a defect or error on our part.</blockquote>

<h2>5. How to Request a Return</h2>
<p>To initiate a return, contact our customer support team with your <strong>Order ID</strong> and photos of the item.</p>`
  },
  privacy: {
    title: "Privacy Policy",
    content: `<h2>1. Information We Collect</h2>
<p>When you browse or place an order on our store, we collect details necessary to process and fulfill your purchase:</p>
<ul>
  <li><strong>Contact Details:</strong> Your full name, email address, and mobile phone number.</li>
  <li><strong>Shipping Address:</strong> Door address, city, state, and pincode.</li>
  <li><strong>Order History:</strong> Purchased products, chosen payment method, and transaction IDs.</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We strictly use your information for legitimate store operations:</p>
<ul>
  <li>To confirm, pack, ship, and deliver your orders.</li>
  <li>To send real-time order confirmation and delivery status alerts (via Email/SMS).</li>
  <li>To provide responsive customer support and resolve order queries.</li>
</ul>

<h2>3. Payment Security & Data Safety</h2>
<p>Your payment credentials (such as card numbers or UPI PINs) are <strong>never stored</strong> on our servers. All online transactions are securely encrypted and handled by authorized, RBI-compliant payment gateways.</p>

<h2>4. Contact Us</h2>
<p>If you have any questions or concerns regarding your privacy, please contact our support team.</p>`
  },
  terms: {
    title: "Terms & Conditions",
    content: `<h2>1. Acceptance of Terms</h2>
<p>By accessing and purchasing from our store, you agree to be bound by these <strong>Terms & Conditions</strong>, our policies, and all applicable laws and regulations.</p>

<h2>2. Pricing & Product Accuracy</h2>
<p>All prices are listed in Indian Rupees (₹) and include applicable taxes unless specified otherwise. We make every effort to display accurate product images and descriptions, but slight color variations may occur due to device screens.</p>

<h2>3. Order Confirmation & Cancellation</h2>
<p>An order is confirmed upon successful checkout. You may request cancellation before your order is dispatched. Once shipped, the standard <strong>Return Policy</strong> applies.</p>

<h2>4. Courier & Shipping Terms</h2>
<p>Orders are dispatched through reputable courier partners. Estimated delivery timelines are indicative, and delays caused by extreme weather or logistics disruptions are beyond our direct control.</p>`
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    content: `<h2>1. Shipping Coverage & Timelines</h2>
<p>We deliver across most serviceable pincodes in India:</p>
<ul>
  <li><strong>Processing Time:</strong> Orders are typically processed and packed within <strong>24 to 48 hours</strong>.</li>
  <li><strong>Standard Delivery:</strong> Delivered within <strong>3 to 5 business days</strong> after dispatch.</li>
  <li><strong>Express / Local Delivery:</strong> Available for select nearby areas within <strong>24 hours</strong>.</li>
</ul>

<h2>2. Shipping Charges</h2>
<p>Shipping charges are calculated at checkout based on package weight and destination pincode. We also offer <strong>Free Shipping</strong> on qualifying minimum order amounts.</p>

<h2>3. Shipment Tracking</h2>
<p>As soon as your parcel is shipped, you will receive an email and notification containing the tracking link and courier company details.</p>`
  }
};

const ManagePolicy = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [policies, setPolicies] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [viewPolicy, setViewPolicy] = useState(null);
  const [editorMode, setEditorMode] = useState('write'); // 'write' | 'preview'

  const textareaRef = useRef(null);

  const fetchPolicies = async () => {
    if (!currentStore._id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPolicies(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchPolicies();
    }
  }, [currentStore._id]);

  // Insert/Wrap formatting tags inside description
  const applyFormat = (openTag, closeTag, placeholder = 'Text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = description;
    const selected = text.substring(start, end);

    let replacement = '';
    if (selected.length > 0) {
      if (openTag === '<ul>' || openTag === '<ol>') {
        const lines = selected.split(/\r?\n/).filter(l => l.trim().length > 0);
        const listItems = lines.map(line => `  <li>${line.replace(/^[•*\-]\s*/, '')}</li>`).join('\n');
        replacement = `\n${openTag}\n${listItems}\n${closeTag}\n`;
      } else {
        replacement = `${openTag}${selected}${closeTag}`;
      }
    } else {
      if (openTag === '<ul>') {
        replacement = `\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n`;
      } else if (openTag === '<ol>') {
        replacement = `\n<ol>\n  <li>First step</li>\n  <li>Second step</li>\n</ol>\n`;
      } else {
        replacement = `${openTag}${placeholder}${closeTag}`;
      }
    }

    const nextVal = text.substring(0, start) + replacement + text.substring(end);
    setDescription(nextVal);

    setTimeout(() => {
      textarea.focus();
      const cursor = start + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const handleLoadTemplate = (templateKey) => {
    const tpl = STANDARD_TEMPLATES[templateKey];
    if (!tpl) return;
    if (description.trim() && !window.confirm(`Load "${tpl.title}" template? This will replace the current content.`)) {
      return;
    }
    if (!title.trim()) setTitle(tpl.title);
    setDescription(tpl.content);
    setEditorMode('write');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setStatus('Error: Please fill both policy title and description.');
      return;
    }

    setLoading(true);
    setStatus('Saving...');

    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/policies/${editingId}` : `/api/policies`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: title.trim(), 
          description: description.trim(), 
          storeId: currentStore._id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(editingId ? '✅ Policy updated successfully!' : '✅ Policy created successfully!');
        setTitle('');
        setDescription('');
        setEditingId(null);
        setActiveTab('list');
        setEditorMode('write');
        fetchPolicies();
      } else {
        setStatus(`Error: ${data.message || 'Failed to save policy'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy) => {
    setTitle(policy.title);
    setDescription(policy.description);
    setEditingId(policy._id);
    setActiveTab('form');
    setEditorMode('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setStatus('✅ Policy deleted successfully');
        fetchPolicies();
      } else {
        const data = await response.json();
        setStatus(`Error: ${data.message || 'Failed to delete'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const startCreateNew = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setActiveTab('form');
    setEditorMode('write');
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Policies">
      <div className="w-full px-6 py-10 max-w-5xl mx-auto">
        {status && (
          <div className={`p-4 mb-6 rounded-xl font-medium text-sm flex items-center justify-between border ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            <span>{status}</span>
            <button onClick={() => setStatus('')} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          <button 
            type="button"
            onClick={() => { setActiveTab('list'); setEditingId(null); }} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            All Policies ({policies.length})
          </button>
          <button 
            type="button"
            onClick={startCreateNew} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'form' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Edit3 size={16} />
            {editingId ? 'Edit Policy' : '+ Create New Policy'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {activeTab === 'form' && (
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {editingId ? 'Edit Store Policy' : 'Create New Store Policy'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format headings, bold text, and bullet points to create clean, readable policies for your storefront.
                  </p>
                </div>

                {/* Quick Templates Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Sparkles size={14} className="text-[#76b900]" /> Templates:
                  </span>
                  <select 
                    onChange={(e) => { if (e.target.value) handleLoadTemplate(e.target.value); e.target.value = ''; }}
                    className="text-xs font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-700 transition cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Load Standard Template...</option>
                    <option value="return_refund">Return & Refund Policy</option>
                    <option value="privacy">Privacy Policy</option>
                    <option value="terms">Terms & Conditions</option>
                    <option value="shipping">Shipping & Delivery</option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Policy Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-sm bg-white" 
                    placeholder="e.g. Return & Refund Policy" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Policy Content <span className="text-red-500">*</span>
                    </label>

                    {/* Write vs Preview Mode Toggle */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                      <button 
                        type="button" 
                        onClick={() => setEditorMode('write')} 
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${editorMode === 'write' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <Edit3 size={12} /> Write
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditorMode('preview')} 
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${editorMode === 'preview' ? 'bg-[#76b900] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <Eye size={12} /> Live Preview
                      </button>
                    </div>
                  </div>

                  {editorMode === 'write' ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#76b900] transition">
                      {/* Rich Formatting Toolbar */}
                      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700">
                        {/* Bold */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('<strong>', '</strong>', 'Bold text')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Bold Text (<strong>...</strong>)"
                        >
                          <Bold size={16} />
                        </button>

                        {/* Italic */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('<em>', '</em>', 'Italic text')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Italic (<em>...</em>)"
                        >
                          <Italic size={16} />
                        </button>

                        {/* Underline */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('<u>', '</u>', 'Underlined text')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Underline (<u>...</u>)"
                        >
                          <Underline size={16} />
                        </button>

                        <span className="w-px h-5 bg-slate-300 mx-1"></span>

                        {/* Heading 2 */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('\n<h2>', '</h2>\n', 'Section Heading')} 
                          className="px-2 py-1 hover:bg-slate-200 rounded-lg transition font-extrabold text-xs text-slate-700 flex items-center gap-0.5" 
                          title="Main Heading (<h2>...</h2>)"
                        >
                          <Heading2 size={16} />
                        </button>

                        {/* Heading 3 */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('\n<h3>', '</h3>\n', 'Sub Heading')} 
                          className="px-2 py-1 hover:bg-slate-200 rounded-lg transition font-extrabold text-xs text-slate-700 flex items-center gap-0.5" 
                          title="Sub Heading (<h3>...</h3>)"
                        >
                          <Heading3 size={16} />
                        </button>

                        <span className="w-px h-5 bg-slate-300 mx-1"></span>

                        {/* Bullet List */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('<ul>', '</ul>', '')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Bullet List (<ul><li>...</li></ul>)"
                        >
                          <List size={16} />
                        </button>

                        {/* Numbered List */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('<ol>', '</ol>', '')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Numbered List (<ol><li>...</li></ol>)"
                        >
                          <ListOrdered size={16} />
                        </button>

                        {/* Quote */}
                        <button 
                          type="button" 
                          onClick={() => applyFormat('\n<blockquote>', '</blockquote>\n', 'Important note or quote')} 
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-700" 
                          title="Callout Box (<blockquote>...</blockquote>)"
                        >
                          <Quote size={16} />
                        </button>

                        <span className="w-px h-5 bg-slate-300 mx-1"></span>

                        <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline-block">
                          Supports HTML tags & Markdown (## Heading, **Bold**)
                        </span>
                      </div>

                      {/* Textarea */}
                      <textarea 
                        ref={textareaRef}
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        required 
                        rows="12" 
                        className="w-full p-4 outline-none text-sm font-mono leading-relaxed resize-y bg-white" 
                        placeholder="Write policy details here... Highlight text and click the buttons above to add Headings, Bold text, or Bullet lists." 
                      />
                    </div>
                  ) : (
                    /* Live Storefront Preview */
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 min-h-[300px] max-h-[500px] overflow-y-auto">
                      <div className="mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Storefront Live Preview
                        </span>
                        <span className="text-xs font-semibold text-[#76b900] flex items-center gap-1">
                          <Check size={14} /> Headings & Bold Formatted
                        </span>
                      </div>
                      {description.trim() ? (
                        <div 
                          className="policy-rendered-content text-slate-700 leading-relaxed bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
                          dangerouslySetInnerHTML={{ __html: formatPolicyHtml(description) }} 
                        />
                      ) : (
                        <p className="text-slate-400 italic text-center py-10">
                          Policy is empty. Type in "Write" mode or select a template to preview.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <HelpCircle size={13} className="shrink-0 text-slate-400" />
                    Tip: Use <strong>&lt;h2&gt;</strong> or <strong>##</strong> for main section titles, and <strong>&lt;strong&gt;</strong> or <strong>**text**</strong> for bold terms.
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="px-8 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100 disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Saving...' : (editingId ? 'Update Policy' : 'Save Policy')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setEditingId(null); setTitle(''); setDescription(''); setActiveTab('list'); }} 
                    className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="grid grid-cols-1 gap-4">
              {policies.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-500">
                  <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700 text-base mb-1">No store policies found</p>
                  <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
                    Add standard Return, Privacy, Terms, and Shipping policies with bold terms and headings for your storefront.
                  </p>
                  <button 
                    type="button" 
                    onClick={startCreateNew} 
                    className="px-5 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition text-sm shadow-md"
                  >
                    + Create First Policy
                  </button>
                </div>
              ) : (
                policies.map(p => (
                  <div key={p._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#76b900] flex items-center justify-center font-bold">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-800">{p.title}</h4>
                          <p className="text-xs text-slate-400 font-mono">
                            Last updated: {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setViewPolicy(p)} 
                          className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button 
                          onClick={() => handleEdit(p)} 
                          className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition flex items-center gap-1"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(p._id)} 
                          className="text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Policy Modal */}
      {viewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-[#76b900]" />
                <h3 className="text-xl font-bold text-slate-800">{viewPolicy.title}</h3>
              </div>
              <button onClick={() => setViewPolicy(null)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <p className="text-xs text-slate-400 mb-5 font-mono">
                Last updated: {new Date(viewPolicy.updatedAt || viewPolicy.createdAt).toLocaleString()}
              </p>
              <div 
                className="policy-rendered-content text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatPolicyHtml(viewPolicy.description) }} 
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center sticky bottom-0">
              <button 
                onClick={() => {
                  const p = viewPolicy;
                  setViewPolicy(null);
                  handleEdit(p);
                }} 
                className="px-5 py-2 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-sm"
              >
                Edit Policy
              </button>
              <button 
                onClick={() => setViewPolicy(null)} 
                className="px-6 py-2.5 font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManagePolicy;
