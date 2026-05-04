import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Bell, Mail, Key, ShieldCheck, Settings, CheckCircle2 } from 'lucide-react';

const ManageAlerts = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [config, setConfig] = useState({
    isEmailEnabled: false, provider: 'gmail', smtpHost: 'smtp.gmail.com', smtpPort: 587, emailAddress: '', appPassword: '', templates: []
  });
  const [status, setStatus] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  const DEFAULT_TEMPLATES = {
    order_placed: {
      name: "Order Placed Template",
      subject: "Order Received - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #76b900;">Order Confirmation</h2>\n  <p>Hi {{customerName}},</p>\n  <p>Thank you for shopping with <strong>{{storeName}}</strong>! We have received your order and are currently processing it.</p>\n  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Summary (ID: {{orderId}})</h3>\n  {{orderItems}}\n  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    },
    order_shipped: {
      name: "Order Shipped Template",
      subject: "Your order has been shipped! - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #3b82f6;">Order Shipped</h2>\n  <p>Hi {{customerName}},</p>\n  <p>Good news! Your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been shipped and is on its way to you.</p>\n  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Details</h3>\n  {{orderItems}}\n  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    },
    order_delivered: {
      name: "Order Delivered Template",
      subject: "Your order has been delivered! - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #10b981;">Order Delivered</h2>\n  <p>Hi {{customerName}},</p>\n  <p>Your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been successfully delivered. We hope you enjoy your purchase!</p>\n  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Details</h3>\n  {{orderItems}}\n  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    },
    order_canceled: {
      name: "Order Canceled Template",
      subject: "Order Canceled - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #ef4444;">Order Canceled</h2>\n  <p>Hi {{customerName}},</p>\n  <p>We're writing to let you know that your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been canceled.</p>\n  <p>If you have any questions, please contact our support team.</p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    },
    order_returned: {
      name: "Order Returned Template",
      subject: "Order Returned - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #f59e0b;">Order Returned</h2>\n  <p>Hi {{customerName}},</p>\n  <p>We have received your returned items for order <strong>#{{orderId}}</strong> at <strong>{{storeName}}</strong>.</p>\n  <p>Your refund will be processed shortly according to our store policy.</p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    },
    custom: {
      name: "Custom Template",
      subject: "Update from {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">\n  <h2 style="color: #76b900;">Store Update</h2>\n  <p>Hi {{customerName}},</p>\n  <p>Here is an update regarding your order <strong>#{{orderId}}</strong>.</p>\n  <p>[Your message here]</p>\n  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via Galibrand Cloud.</p>\n</div>`
    }
  };

  const initialTemplate = {
    eventType: 'order_placed', 
    name: DEFAULT_TEMPLATES.order_placed.name, 
    subject: DEFAULT_TEMPLATES.order_placed.subject, 
    body: DEFAULT_TEMPLATES.order_placed.body, 
    isActive: true
  };
  const [templateForm, setTemplateForm] = useState(initialTemplate);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchConfig = async () => {
      if (!currentStore._id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setConfig({
            isEmailEnabled: data.isEmailEnabled || false,
            provider: data.provider || 'gmail',
            smtpHost: data.smtpHost || 'smtp.gmail.com',
            smtpPort: data.smtpPort || 587,
            emailAddress: data.emailAddress || '',
            appPassword: data.appPassword || '',
            templates: data.templates || []
          });
        }
      } catch (error) {
        console.error("Failed to fetch alert config");
      }
    };
    fetchConfig();
  }, [currentStore._id]);

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setConfig(prev => ({
      ...prev,
      provider: val,
      smtpHost: val === 'gmail' ? 'smtp.gmail.com' : prev.smtpHost,
      smtpPort: val === 'gmail' ? 587 : prev.smtpPort
    }));
  };

  const saveToBackend = async (newConfig) => {
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newConfig)
      });
      if (response.ok) setStatus('Configuration saved successfully!');
      else setStatus(`Error: ${(await response.json()).message}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    await saveToBackend(config);
  };

  const handleTestMail = async () => {
    if (!testEmailTo) return alert("Please enter an email address to send the test to.");
    if (!config.emailAddress || !config.appPassword) return alert("Please fill and save your SMTP details first.");
    setTesting(true);
    setStatus('Sending test email...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...config, testEmailTo })
      });
      const data = await response.json();
      setStatus(response.ok ? '✅ Test email sent! Check your inbox.' : `❌ ${data.message}`);
    } catch (err) {
      setStatus(`❌ Network Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleAddTemplate = () => {
    setTemplateForm(initialTemplate);
    setEditingTemplate(null);
    setIsPreviewMode(false);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (index) => {
    setTemplateForm(config.templates[index]);
    setEditingTemplate(index);
    setIsPreviewMode(false);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (index) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const newTemplates = [...config.templates];
      newTemplates.splice(index, 1);
      const newConfig = { ...config, templates: newTemplates };
      setConfig(newConfig);
      await saveToBackend(newConfig);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    const newTemplates = [...config.templates];
    if (editingTemplate !== null) {
      newTemplates[editingTemplate] = templateForm;
    } else {
      newTemplates.push(templateForm);
    }
    const newConfig = { ...config, templates: newTemplates };
    setConfig(newConfig);
    setIsTemplateModalOpen(false);
    setIsPreviewMode(false);
    await saveToBackend(newConfig);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setIsPreviewMode(false);
  };

  const getPreviewHtml = (htmlTemplate) => {
    if (!htmlTemplate) return '<p class="text-slate-400 italic">No content to preview</p>';
    const dummyItems = `
      <tr><td style="padding:8px; border-bottom:1px solid #ddd;">1x Sample Product A</td><td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹500</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #ddd;">2x Sample Product B</td><td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹1000</td></tr>
    `;
    const dummyOrderItemsTable = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">${dummyItems}</table>`;

    return htmlTemplate
      .replace(/{{storeName}}/g, currentStore.storeName || "My Awesome Store")
      .replace(/{{customerName}}/g, "John Doe")
      .replace(/{{orderId}}/g, "ORD-123456")
      .replace(/{{orderItems}}/g, dummyOrderItemsTable)
      .replace(/{{totalAmount}}/g, "1500")
      .replace(/{{discountAmount}}/g, "100");
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Alerts">
      <div className="p-6 mx-auto mt-6 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-800 flex items-center gap-3"><Bell className="text-[#76b900]" /> Notifications & Alerts</h2>
          <p className="text-slate-500">Configure automated order confirmation emails for customers of <span className="font-bold text-slate-700">{currentStore.storeName}</span>.</p>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {status}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSave} className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div><h3 className="font-bold text-lg text-slate-800">Email Automation</h3><p className="text-sm text-slate-500">Send an automatic invoice receipt to your customers.</p></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.isEmailEnabled} onChange={e => setConfig({...config, isEmailEnabled: e.target.checked})} />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
              </label>
            </div>

            <div className={`space-y-5 transition-opacity ${!config.isEmailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Settings size={16}/> Mail Provider</label><select value={config.provider} onChange={handleProviderChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white text-sm"><option value="gmail">Gmail / Google Workspace</option><option value="custom">Custom SMTP Server</option></select></div>
                {config.provider === 'custom' && (<>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">SMTP Host</label><input required type="text" value={config.smtpHost} onChange={e=>setConfig({...config, smtpHost: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="mail.yourdomain.com" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">SMTP Port</label><input required type="number" value={config.smtpPort} onChange={e=>setConfig({...config, smtpPort: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="465 or 587" /></div>
                </>)}
              </div>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Mail size={16}/> Sending Email Address</label><input required type="email" value={config.emailAddress} onChange={e=>setConfig({...config, emailAddress: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="support@yourstore.com" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Key size={16}/> App Password</label><input required type="password" value={config.appPassword} onChange={e=>setConfig({...config, appPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" placeholder="••••••••••••" />
                {config.provider === 'gmail' && <p className="text-xs text-slate-500 mt-2 flex items-start gap-1"><ShieldCheck size={14} className="shrink-0 text-blue-500" /> Since you are using Gmail, do not use your standard password. You must generate a 16-digit "App Password" inside your Google Account Security Settings.</p>}
              </div>

              <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition mt-6 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* Test Mail Section */}
          <div className={`border-t border-slate-100 bg-slate-50 p-6 sm:p-8 transition-opacity ${!config.isEmailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-[#76b900]"/> Test Your Connection</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="Enter recipient email address..." value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" />
              <button onClick={handleTestMail} type="button" disabled={testing || !testEmailTo} className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition whitespace-nowrap disabled:opacity-50 shadow-lg shadow-green-100">
                {testing ? 'Sending...' : 'Send Test Mail'}
              </button>
            </div>
          </div>

          {/* Templates Section */}
          <div className={`border-t border-slate-100 p-6 sm:p-8 transition-opacity ${!config.isEmailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-6">
               <div>
                 <h4 className="font-bold text-slate-800 text-lg">Email Templates</h4>
                 <p className="text-sm text-slate-500 mt-1">Customize the emails sent to your customers for various events.</p>
               </div>
               <button type="button" onClick={handleAddTemplate} className="px-4 py-2 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition text-sm whitespace-nowrap shadow-md">+ Add Template</button>
            </div>
            
            <div className="space-y-4">
               {config.templates.length === 0 ? (
                 <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium">No custom templates created. Standard default emails will be used.</div>
               ) : (
                 config.templates.map((tpl, idx) => (
                   <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition">
                      <div className="mb-4 sm:mb-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-slate-800 text-lg">{tpl.name}</p>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${tpl.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{tpl.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1"><span className="font-semibold">Event:</span> <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{tpl.eventType}</span></p>
                        <p className="text-sm text-slate-600"><span className="font-semibold">Subject:</span> {tpl.subject}</p>
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => handleEditTemplate(idx)} className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Edit</button>
                        <button type="button" onClick={() => handleDeleteTemplate(idx)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Delete</button>
                      </div>
                   </div>
                 ))
               )}
            </div>
        </div>
      )}
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-extrabold text-xl text-slate-800">{editingTemplate !== null ? 'Edit Template' : 'Add New Template'}</h3>
              <button type="button" onClick={closeTemplateModal} className="text-slate-400 hover:text-red-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="templateForm" onSubmit={handleSaveTemplate} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Template Name <span className="text-red-500">*</span></label>
                     <input required type="text" value={templateForm.name} onChange={e=>setTemplateForm({...templateForm, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm transition" placeholder="e.g. Order Shipped Email" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Event Type <span className="text-red-500">*</span></label>
                     <div className="flex gap-2 items-start">
                       <select required value={templateForm.eventType} onChange={e=>setTemplateForm({...templateForm, eventType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm bg-white transition flex-1">
                          <option value="order_placed">Order Placed</option>
                          <option value="order_shipped">Order Shipped</option>
                          <option value="order_delivered">Order Delivered</option>
                          <option value="order_canceled">Order Canceled</option>
                          <option value="order_returned">Order Returned</option>
                          <option value="custom">Custom</option>
                       </select>
                       <button 
                         type="button" 
                         onClick={() => {
                           const def = DEFAULT_TEMPLATES[templateForm.eventType];
                           if (def && window.confirm("This will overwrite your current subject and body. Continue?")) {
                             setTemplateForm({...templateForm, name: def.name, subject: def.subject, body: def.body});
                           }
                         }}
                         className="shrink-0 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200"
                         title="Load default layout for this event"
                       >
                         Load Default
                       </button>
                     </div>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Email Subject <span className="text-red-500">*</span></label>
                   <input required type="text" value={templateForm.subject} onChange={e=>setTemplateForm({...templateForm, subject: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm transition" placeholder="Your order is on the way!" />
                </div>
                <div>
                   <div className="flex justify-between items-end mb-1">
                     <label className="block text-sm font-bold text-slate-700">Email Body (HTML) <span className="text-red-500">*</span></label>
                     <button 
                       type="button" 
                       onClick={() => setIsPreviewMode(!isPreviewMode)}
                       className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition"
                     >
                       {isPreviewMode ? 'Edit Code' : 'Preview HTML'}
                     </button>
                   </div>
                   <p className="text-xs text-slate-500 mb-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">Variables: {'{{storeName}}'}, {'{{customerName}}'}, {'{{orderId}}'}, {'{{orderItems}}'}, {'{{totalAmount}}'}, {'{{discountAmount}}'}</p>
                   {isPreviewMode ? (
                     <div className="w-full px-4 py-4 border border-slate-200 rounded-xl bg-white min-h-[200px] max-h-[400px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: getPreviewHtml(templateForm.body) }}></div>
                   ) : (
                     <textarea required rows="8" value={templateForm.body} onChange={e=>setTemplateForm({...templateForm, body: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#76b900] text-sm font-mono transition resize-none" placeholder="Hi {{customerName}},&#10;Your order {{orderId}} has been shipped..."></textarea>
                   )}
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <input type="checkbox" id="tplActive" checked={templateForm.isActive} onChange={e=>setTemplateForm({...templateForm, isActive: e.target.checked})} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900] rounded cursor-pointer" />
                   <label htmlFor="tplActive" className="text-sm font-bold text-slate-700 cursor-pointer">Enable this template to send automatically when the event occurs</label>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={closeTemplateModal} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors rounded-xl hover:bg-slate-200">Cancel</button>
              <button type="submit" form="templateForm" className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100">{editingTemplate !== null ? 'Update Template' : 'Add Template'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageAlerts;