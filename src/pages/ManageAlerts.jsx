import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Bell, 
  Mail, 
  Key, 
  ShieldCheck, 
  Settings, 
  CheckCircle2, 
  Zap, 
  Server, 
  Truck, 
  Check, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

const ManageAlerts = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [config, setConfig] = useState({
    isEmailEnabled: true,
    useDefaultMail: true,
    provider: 'system',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    emailAddress: '',
    appPassword: '',
    templates: []
  });

  const [systemMeta, setSystemMeta] = useState({
    isCustomConfigured: false,
    isSystemMailAvailable: true,
    systemSender: 'LandingMailConfig'
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
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #76b900;">Order Confirmation</h2>
  <p>Hi {{customerName}},</p>
  <p>Thank you for shopping with <strong>{{storeName}}</strong>! We have received your order and are currently processing it.</p>
  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Summary (ID: {{orderId}})</h3>
  {{orderItems}}
  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    order_shipped: {
      name: "Order Shipped Template",
      subject: "Your order has been shipped! - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #3b82f6;">Order Shipped</h2>
  <p>Hi {{customerName}},</p>
  <p>Good news! Your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been shipped and is on its way to you.</p>
  {{trackingDetails}}
  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Details</h3>
  {{orderItems}}
  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    order_delivered: {
      name: "Order Delivered Template",
      subject: "Your order has been delivered! - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #10b981;">Order Delivered</h2>
  <p>Hi {{customerName}},</p>
  <p>Your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been successfully delivered. We hope you enjoy your purchase!</p>
  <h3 style="margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Details</h3>
  {{orderItems}}
  <p style="text-align: right; font-size: 16px;"><strong>Total Amount: ₹{{totalAmount}}</strong></p>
  <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 12px; text-align: center;">
    <h3 style="margin-top: 0; color: #333;">How did we do?</h3>
    <p style="font-size: 14px; color: #555; margin-bottom: 20px;">We would love to hear your feedback on your purchased items:</p>
    {{reviewLinks}}
  </div>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    order_canceled: {
      name: "Order Canceled Template",
      subject: "Order Canceled - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #ef4444;">Order Canceled</h2>
  <p>Hi {{customerName}},</p>
  <p>We're writing to let you know that your order <strong>#{{orderId}}</strong> from <strong>{{storeName}}</strong> has been canceled.</p>
  <p>If you have any questions, please contact our support team.</p>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    order_returned: {
      name: "Order Returned Template",
      subject: "Order Returned - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #f59e0b;">Order Returned</h2>
  <p>Hi {{customerName}},</p>
  <p>We have received your returned items for order <strong>#{{orderId}}</strong> at <strong>{{storeName}}</strong>.</p>
  <p>Your refund will be processed shortly according to our store policy.</p>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    custom: {
      name: "Custom Template",
      subject: "Update from {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #76b900;">Store Update</h2>
  <p>Hi {{customerName}},</p>
  <p>Here is an update regarding your order <strong>#{{orderId}}</strong>.</p>
  <p>[Your message here]</p>
  <p style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">This is an automated email sent via {{storeName}}.</p>
</div>`
    },
    bill_receipt: {
      name: "Customer Bill Receipt",
      subject: "Invoice - {{storeName}}",
      body: `<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; color: #333;">INVOICE</h1>
    <h2 style="margin: 5px 0; color: #76b900;">{{storeName}}</h2>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
    <div>
      <p style="margin: 2px 0;"><strong>Billed To:</strong></p>
      <p style="margin: 2px 0;">{{customerName}}</p>
      <p style="margin: 2px 0;">{{customerPhone}}</p>
      <p style="margin: 2px 0;">{{customerEmail}}</p>
      <p style="margin: 2px 0;">{{customerAddress}}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 2px 0;"><strong>Invoice #:</strong> {{orderId}}</p>
      <p style="margin: 2px 0;"><strong>Date:</strong> {{orderDate}}</p>
      <p style="margin: 2px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p style="margin: 2px 0;"><strong>Order Status:</strong> {{orderStatus}}</p>
    </div>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">Item</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">Qty</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Price</th>
        <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{billItems}}
    </tbody>
  </table>
  <div style="width: 100%; display: flex; justify-content: flex-end;">
    <table style="width: 300px; border-collapse: collapse;">
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>Subtotal:</strong></td><td style="padding: 5px 10px; text-align: right;">₹{{subTotal}}</td></tr>
      {{discountRows}}
      <tr><td style="padding: 5px 10px; text-align: left;"><strong>Shipping:</strong></td><td style="padding: 5px 10px; text-align: right;">₹{{shippingCharge}}</td></tr>
      <tr><td style="padding: 10px; text-align: left; font-size: 18px; border-top: 2px solid #333;"><strong>Total:</strong></td><td style="padding: 10px; text-align: right; font-size: 18px; border-top: 2px solid #333;"><strong>₹{{totalAmount}}</strong></td></tr>
    </table>
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #777;"><p>Thank you for your business!</p></div>
</div>`
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

  useEffect(() => {
    const fetchConfig = async () => {
      if (!currentStore._id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const useDefault = data.useDefaultMail !== undefined ? Boolean(data.useDefaultMail) : true;
          setConfig({
            isEmailEnabled: data.isEmailEnabled !== undefined ? Boolean(data.isEmailEnabled) : true,
            useDefaultMail: useDefault,
            provider: useDefault ? 'system' : (data.provider || 'gmail'),
            smtpHost: data.smtpHost || 'smtp.gmail.com',
            smtpPort: data.smtpPort || 587,
            emailAddress: data.emailAddress || '',
            appPassword: data.appPassword || '',
            templates: data.templates || []
          });
          setSystemMeta({
            isCustomConfigured: Boolean(data.isCustomConfigured),
            isSystemMailAvailable: data.isSystemMailAvailable !== false,
            systemSender: data.systemSender || 'LandingMailConfig'
          });
        }
      } catch (error) {
        console.error("Failed to fetch alert config:", error);
      }
    };
    fetchConfig();
  }, [currentStore._id, token]);

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setConfig(prev => ({
      ...prev,
      provider: val,
      smtpHost: val === 'gmail' ? 'smtp.gmail.com' : prev.smtpHost,
      smtpPort: val === 'gmail' ? 587 : prev.smtpPort
    }));
  };

  const handleModeSwitch = (useDefault) => {
    setConfig(prev => ({
      ...prev,
      useDefaultMail: useDefault,
      provider: useDefault ? 'system' : (prev.provider === 'system' ? 'gmail' : prev.provider)
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
      const data = await response.json();
      if (response.ok) {
        setStatus(data.message || 'Configuration saved successfully!');
        if (data.config) {
          const isDef = data.config.useDefaultMail !== false;
          setConfig(prev => ({
            ...prev,
            ...data.config,
            useDefaultMail: isDef,
            provider: isDef ? 'system' : (data.config.provider || 'gmail')
          }));
        }
      } else {
        setStatus(`Error: ${data.message || 'Failed to save configuration'}`);
      }
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
    if (!testEmailTo) return alert("Please enter a recipient email address to send the test alert.");
    if (!config.useDefaultMail && (!config.emailAddress || !config.appPassword)) {
      return alert("Please enter and save your custom email address and app password before testing.");
    }
    setTesting(true);
    setStatus('Sending test email...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/store-alerts/${currentStore._id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          useDefaultMail: config.useDefaultMail,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          emailAddress: config.emailAddress,
          appPassword: config.appPassword,
          testEmailTo 
        })
      });
      const data = await response.json();
      setStatus(response.ok ? `✅ ${data.message || 'Test email sent! Check your inbox.'}` : `❌ ${data.message}`);
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

    const dummyBillItems = `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">Sample Product A</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">1</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹500</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹500</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">Sample Product B</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">2</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹500</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹1000</td>
      </tr>
    `;

    const dummyReviewLinks = `
      <div style="margin-bottom: 10px;"><a href="#" style="display: inline-block; background-color: #76b900; color: #ffffff; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Review Sample Product A</a></div>
      <div style="margin-bottom: 10px;"><a href="#" style="display: inline-block; background-color: #76b900; color: #ffffff; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Review Sample Product B</a></div>
    `;

    const dummyTrackingDetails = `
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin-top: 0; color: #3b82f6;">Tracking Information</h4>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Shipping Method:</strong> By Shipping Company</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Shipping Company:</strong> Blue Dart / FedEx</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Tracking Number:</strong> FDX123456789</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Delivery Person:</strong> Rahul Sharma (+91 9876543210)</p>
      </div>
    `;

    return htmlTemplate
      .replace(/{{storeName}}/g, currentStore.storeName || "My Awesome Store")
      .replace(/{{customerName}}/g, "John Doe")
      .replace(/{{customerPhone}}/g, "+91 9876543210")
      .replace(/{{customerEmail}}/g, "john@example.com")
      .replace(/{{customerAddress}}/g, "123 Main Street, City, State 123456")
      .replace(/{{orderDate}}/g, new Date().toLocaleDateString())
      .replace(/{{orderId}}/g, "ORD-123456")
      .replace(/{{orderItems}}/g, dummyOrderItemsTable)
      .replace(/{{billItems}}/g, dummyBillItems)
      .replace(/{{subTotal}}/g, "1500")
      .replace(/{{totalAmount}}/g, "1500")
      .replace(/{{discountAmount}}/g, "100")
      .replace(/{{discountRows}}/g, `<tr><td style="padding: 5px 10px; text-align: left;"><strong>Discount:</strong></td><td style="padding: 5px 10px; text-align: right;">-₹100</td></tr>`)
      .replace(/{{paymentMethod}}/g, "Online (Razorpay)")
      .replace(/{{orderStatus}}/g, "PLACED")
      .replace(/{{shippingCharge}}/g, "50")
      .replace(/{{reviewLinks}}/g, dummyReviewLinks)
      .replace(/{{trackingDetails}}/g, dummyTrackingDetails);
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Alerts">
      <div className="w-full px-6 py-10 max-w-5xl mx-auto">
        {status && (
          <div className={`p-4 mb-6 rounded-xl font-medium text-sm flex items-center justify-between ${status.includes('Error') || status.includes('❌') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            <span>{status}</span>
            <button onClick={() => setStatus('')} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
          <button 
            type="button"
            onClick={() => setActiveTab('config')} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'config' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Alerts Configuration
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('templates')} 
            className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'templates' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Email Templates ({config.templates.length})
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'config' && (
            <>
              <form onSubmit={handleSave} className="p-6 sm:p-8">
                {/* Master Email Automation Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <Bell size={20} className="text-[#76b900]" />
                      Customer Email Automation
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Automatically send order confirmation, bill receipts, and delivery status updates to customers.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={config.isEmailEnabled} 
                      onChange={e => setConfig({...config, isEmailEnabled: e.target.checked})} 
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
                  </label>
                </div>

                <div className={`space-y-6 transition-opacity ${!config.isEmailEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  {/* Current Active Mode Alert Banner */}
                  {config.useDefaultMail ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                      <Zap className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-emerald-900 text-sm">System Default Mail Active (Enabled by Default)</h4>
                          <span className="bg-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">Active</span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                          Your store is automatically powered by the platform default mail service (<strong>LandingMailConfig</strong>). When customers place orders or staff updates shipping and delivery status, emails are sent out instantly with zero SMTP setup.
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium mt-1">
                          Sender Address: <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{systemMeta.systemSender}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                      <Server className="text-blue-600 shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-blue-900 text-sm">Custom Mail Configuration Active</h4>
                          <span className="bg-blue-200 text-blue-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">Custom SMTP</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                          System default mail is <strong>disabled</strong> because your custom email credentials are saved. All order and delivery alerts are dispatched directly via your own email (<strong className="font-mono">{config.emailAddress || 'custom SMTP'}</strong>).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode Selector Cards */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2.5">
                      Select Email Delivery Method
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option 1: System Default Mail */}
                      <div 
                        onClick={() => handleModeSwitch(true)}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${config.useDefaultMail ? 'border-[#76b900] bg-emerald-50/30 shadow-md ring-1 ring-[#76b900]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.useDefaultMail ? 'bg-[#76b900] text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <Zap size={18} />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">System Default Mail</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            By Default (ON)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Powered by platform mail (LandingMailConfig). Sends delivery & order status emails with zero setup needed.
                        </p>
                        {config.useDefaultMail && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#76b900]">
                            <Check size={14} /> Currently in use
                          </div>
                        )}
                      </div>

                      {/* Option 2: Custom Mail Configuration */}
                      <div 
                        onClick={() => handleModeSwitch(false)}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${!config.useDefaultMail ? 'border-[#76b900] bg-emerald-50/30 shadow-md ring-1 ring-[#76b900]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!config.useDefaultMail ? 'bg-[#76b900] text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <Server size={18} />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Custom Mail Config</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Custom SMTP
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Use your own Gmail or custom domain SMTP. When saved, system default mail is automatically disabled.
                        </p>
                        {!config.useDefaultMail && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#76b900]">
                            <Check size={14} /> Currently in use
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mode-Specific Settings */}
                  {config.useDefaultMail ? (
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Truck size={16} className="text-[#76b900]" />
                        Automated Delivery Status Events Included:
                      </h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span><strong>Order Placed:</strong> Instant confirmation receipt</span>
                        </li>
                        <li className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                          <span><strong>Order Shipped:</strong> Tracking details & shipping company</span>
                        </li>
                        <li className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                          <span><strong>Out for Delivery:</strong> Delivery agent phone & name</span>
                        </li>
                        <li className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                          <span><strong>Order Delivered:</strong> Delivery confirmation + review links</span>
                        </li>
                      </ul>
                      <p className="text-[11px] text-slate-500 pt-1">
                        ℹ️ Need to customize HTML content or email text? Head over to the <strong>Email Templates</strong> tab.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                            <Settings size={15}/> Mail Provider
                          </label>
                          <select 
                            value={config.provider} 
                            onChange={handleProviderChange} 
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white text-sm"
                          >
                            <option value="gmail">Gmail / Google Workspace</option>
                            <option value="custom">Custom SMTP Server</option>
                          </select>
                        </div>

                        {config.provider === 'custom' && (
                          <>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">SMTP Host</label>
                              <input 
                                required 
                                type="text" 
                                value={config.smtpHost} 
                                onChange={e=>setConfig({...config, smtpHost: e.target.value})} 
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white" 
                                placeholder="mail.yourdomain.com" 
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">SMTP Port</label>
                              <input 
                                required 
                                type="number" 
                                value={config.smtpPort} 
                                onChange={e=>setConfig({...config, smtpPort: e.target.value})} 
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white" 
                                placeholder="465 or 587" 
                              />
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <Mail size={15}/> Sending Email Address
                        </label>
                        <input 
                          required 
                          type="email" 
                          value={config.emailAddress} 
                          onChange={e=>setConfig({...config, emailAddress: e.target.value})} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white" 
                          placeholder="support@yourstore.com" 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <Key size={15}/> App Password
                        </label>
                        <input 
                          required 
                          type="password" 
                          value={config.appPassword} 
                          onChange={e=>setConfig({...config, appPassword: e.target.value})} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white" 
                          placeholder="••••••••••••" 
                        />
                        {config.provider === 'gmail' && (
                          <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
                            <ShieldCheck size={14} className="shrink-0 text-blue-500 mt-0.5" /> 
                            Since you are using Gmail, do not use your standard Google password. You must generate a 16-character "App Password" inside your Google Account Security Settings.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 text-sm shadow-md"
                    >
                      {loading ? 'Saving...' : (config.useDefaultMail ? 'Save Default Alert Settings' : 'Save Custom Mail Configuration')}
                    </button>
                    {!config.useDefaultMail && (
                      <button 
                        type="button" 
                        onClick={() => handleModeSwitch(true)}
                        className="px-5 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                      >
                        <RefreshCw size={14} /> Switch Back to System Default Mail
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Test Mail Section */}
              <div className={`border-t border-slate-100 bg-slate-50 p-6 sm:p-8 transition-opacity ${!config.isEmailEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#76b900]"/> 
                    Test Your Email Connection
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {config.useDefaultMail 
                      ? 'Send a real delivery status test email using the GaliBrand System Default Mail (LandingMailConfig).' 
                      : 'Send a test email using your configured Custom SMTP server to verify credentials.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    placeholder="Enter recipient email address..." 
                    value={testEmailTo} 
                    onChange={e => setTestEmailTo(e.target.value)} 
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white" 
                  />
                  <button 
                    onClick={handleTestMail} 
                    type="button" 
                    disabled={testing || !testEmailTo} 
                    className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition whitespace-nowrap disabled:opacity-50 shadow-lg shadow-green-100 text-sm"
                  >
                    {testing ? 'Sending...' : (config.useDefaultMail ? 'Send Test Alert via Default Mail' : 'Send Test Mail via Custom SMTP')}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'templates' && (
            <div className={`p-6 sm:p-8 transition-opacity ${!config.isEmailEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h4 className="font-bold text-slate-800 text-lg">Email Templates</h4>
                   <p className="text-sm text-slate-500 mt-1">Customize the email content sent to your customers for various order and delivery events.</p>
                 </div>
                 <button 
                   type="button" 
                   onClick={handleAddTemplate} 
                   className="px-4 py-2 bg-[#76b900] text-white font-bold rounded-lg hover:bg-[#659e00] transition text-sm whitespace-nowrap shadow-md"
                 >
                   + Add Template
                 </button>
              </div>
              
              <div className="space-y-4">
                 {config.templates.length === 0 ? (
                   <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium">
                     No custom templates created. Standard default emails will be used.
                   </div>
                 ) : (
                   config.templates.map((tpl, idx) => (
                     <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition">
                        <div className="mb-4 sm:mb-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-bold text-slate-800 text-lg">{tpl.name}</p>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${tpl.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {tpl.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            <span className="font-semibold">Event:</span> <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{tpl.eventType}</span>
                          </p>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold">Subject:</span> {tpl.subject}
                          </p>
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
                          <option value="bill_receipt">Bill Receipt</option>
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
                   <p className="text-xs text-slate-500 mb-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">Variables: {'{{storeName}}'}, {'{{customerName}}'}, {'{{customerPhone}}'}, {'{{customerEmail}}'}, {'{{customerAddress}}'}, {'{{orderDate}}'}, {'{{orderId}}'}, {'{{orderItems}}'}, {'{{billItems}}'}, {'{{subTotal}}'}, {'{{totalAmount}}'}, {'{{discountAmount}}'}, {'{{shippingCharge}}'}, {'{{trackingDetails}}'}, {'{{ShippingMethod}}'}, {'{{ShippingCompany}}'}, {'{{ShippingTrackingNumber}}'}, {'{{DeliveryPersonName}}'}, {'{{DeliveryPersonPhone}}'}, {'{{paymentMethod}}'}, {'{{orderStatus}}'}</p>
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
