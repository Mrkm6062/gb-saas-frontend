import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Bell, 
  Mail, 
  Plus, 
  Trash2, 
  Send, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Save, 
  Edit2, 
  Eye, 
  Code,
  AlertCircle,
  HelpCircle,
  Settings
} from 'lucide-react';

const ManageNewsletter = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [activeTab, setActiveTab] = useState('subscribers'); // 'subscribers', 'templates'
  const [subscribers, setSubscribers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [fetchingSubscribers, setFetchingSubscribers] = useState(true);
  const [fetchingTemplates, setFetchingTemplates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  // Template modal / form state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Send newsletter modal state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendingTemplateId, setSendingTemplateId] = useState('');
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  // Fetch subscribers
  const fetchSubscribers = async () => {
    if (!currentStore._id) return;
    setFetchingSubscribers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/subscribers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch newsletter subscribers", err);
    } finally {
      setFetchingSubscribers(false);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    if (!currentStore._id) return;
    setFetchingTemplates(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    } finally {
      setFetchingTemplates(false);
    }
  };

  useEffect(() => {
    if (currentStore._id) {
      fetchSubscribers();
      fetchTemplates();
    }
  }, [currentStore._id]);

  // Toggle Subscriber subscription status (deactivate / reactivate)
  const handleToggleStatus = async (subscriberId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/subscribers/${subscriberId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.message || 'Subscriber status updated successfully.');
        setTimeout(() => setStatus(''), 3000);
        fetchSubscribers();
      } else {
        const errData = await res.json();
        setStatus(`Error: ${errData.message || 'Failed to update subscriber.'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open Template Modal (for create or edit)
  const openTemplateModal = (template = null) => {
    if (template) {
      setEditingTemplateId(template._id);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent
      });
    } else {
      setEditingTemplateId(null);
      setTemplateForm({
        name: '',
        subject: '',
        htmlContent: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
  <h2 style="color: #76b900; margin-top: 0;">Special Offer from Our Store!</h2>
  <p>Hello Customer,</p>
  <p>We are excited to share some amazing news and exclusive offers with you!</p>
  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #76b900;">
    <h3 style="margin-top: 0; color: #0f172a;">Get 20% OFF Everything</h3>
    <p style="margin-bottom: 0;">Use the code <strong style="color: #76b900; font-size: 18px;">NEWS20</strong> at checkout to redeem your special discount.</p>
  </div>
  <p>Thank you for being a loyal subscriber!</p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center;">You received this email because you subscribed to our newsletter.</p>
</div>`
      });
    }
    setIsPreviewMode(false);
    setIsTemplateModalOpen(true);
  };

  // Save template
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: editingTemplateId,
          ...templateForm
        })
      });

      if (res.ok) {
        setStatus(editingTemplateId ? 'Template updated successfully!' : 'Template created successfully!');
        setTimeout(() => setStatus(''), 3000);
        setIsTemplateModalOpen(false);
        fetchTemplates();
      } else {
        const errData = await res.json();
        setStatus(`Error saving template: ${errData.message || 'Failed to save template.'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStatus('Template deleted successfully!');
        setTimeout(() => setStatus(''), 3000);
        fetchTemplates();
      } else {
        const errData = await res.json();
        setStatus(`Error deleting template: ${errData.message || 'Failed to delete template.'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Send Newsletter
  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (!sendingTemplateId) return;
    setSendingNewsletter(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/${currentStore._id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: sendingTemplateId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSendResult({
          success: true,
          message: data.message,
          successCount: data.successCount,
          failCount: data.failCount,
          failedEmails: data.failedEmails || []
        });
      } else {
        setSendResult({
          success: false,
          message: data.message || 'Failed to send newsletter.'
        });
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: err.message
      });
    } finally {
      setSendingNewsletter(false);
    }
  };

  // Open send modal
  const openSendModal = (templateId = '') => {
    setSendingTemplateId(templateId);
    setSendResult(null);
    setIsSendModalOpen(true);
  };

  const activeSubscribersCount = subscribers.filter(s => s.isSubscribed).length;

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Store Newsletter Settings">
      <div className="p-6 mx-auto mt-6 w-full max-w-7xl">
        
        {/* Status Notification */}
        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border transition-all animate-fadeIn ${
            status.toLowerCase().includes('error') 
              ? 'bg-red-50 text-red-600 border-red-200' 
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {status}
          </div>
        )}

        {/* Info SMTP Settings Warning Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="flex gap-4">
            <div className="p-3 bg-[#76b900]/10 rounded-xl text-[#76b900] shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Verify SMTP Settings</h4>
              <p className="text-sm text-slate-500 max-w-2xl">
                Newsletter emails are sent from your store's custom SMTP configuration. Make sure you have configured your mail credentials under Settings.
              </p>
            </div>
          </div>
          <Link 
            to={`/store/${storeId}/alerts`} 
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-700 shadow-sm transition"
          >
            <Settings size={16} />
            SMTP Config
          </Link>
        </div>

        {/* Tab Selection Row & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 w-full mb-8">
          <div className="flex flex-row overflow-x-auto gap-3 scrollbar-hide w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'subscribers'
                  ? 'bg-[#76b900] text-white shadow-md shadow-green-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 bg-white'
              }`}
            >
              <Users size={18} />
              Subscribers ({subscribers.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'bg-[#76b900] text-white shadow-md shadow-green-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 bg-white'
              }`}
            >
              <FileText size={18} />
              Email Templates ({templates.length})
            </button>
          </div>

          <div className="shrink-0 w-full sm:w-auto flex justify-end gap-3">
            {activeTab === 'templates' && (
              <button 
                onClick={() => openTemplateModal()}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-950 transition flex items-center gap-2"
              >
                <Plus size={18} />
                Create Template
              </button>
            )}
            <button 
              onClick={() => openSendModal()}
              disabled={activeSubscribersCount === 0}
              className="px-6 py-2.5 bg-[#76b900] text-white font-bold text-sm rounded-xl hover:bg-[#659e00] transition disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={18} />
              Send Newsletter
            </button>
          </div>
        </div>

        {/* Tab 1: Subscribers List */}
        {activeTab === 'subscribers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {fetchingSubscribers ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#76b900] mx-auto mb-4"></div>
                <p className="text-slate-500 font-semibold">Loading newsletter subscribers...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-semibold text-lg">No Subscribers Yet</p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                  When customers subscribe on your online storefront, their emails will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Customer Email</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Subscribed Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {subscribers.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-800">{sub.email}</td>
                        <td className="py-4 px-6">
                          {sub.isSubscribed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle size={12} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                              <XCircle size={12} />
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {new Date(sub.createdAt).toLocaleDateString(undefined, { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            disabled={loading}
                            onClick={() => handleToggleStatus(sub._id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                              sub.isSubscribed
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {sub.isSubscribed ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Email Templates List */}
        {activeTab === 'templates' && (
          <div>
            {fetchingTemplates ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#76b900] mx-auto mb-4"></div>
                <p className="text-slate-500 font-semibold">Loading your templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-semibold text-lg">No Email Templates</p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1 mb-6">
                  Create beautiful HTML/CSS newsletter templates to send out to your subscribers.
                </p>
                <button
                  onClick={() => openTemplateModal()}
                  className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition text-sm shadow-sm inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-lg leading-tight truncate pr-2" title={template.name}>
                          {template.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium shrink-0">
                          {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 font-semibold truncate" title={template.subject}>
                        Subject: <span className="font-normal text-slate-600">{template.subject}</span>
                      </p>
                      
                      {/* Simple HTML Preview Box */}
                      <div className="w-full h-32 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden mb-6 relative">
                        <iframe 
                          title={`Preview ${template.name}`}
                          srcDoc={template.htmlContent} 
                          sandbox=""
                          className="w-[300%] h-[300%] scale-[0.33] origin-top-left border-0 absolute pointer-events-none pointer-events-none-override"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openTemplateModal(template)}
                          className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                          title="Edit Template"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template._id)}
                          disabled={loading}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Delete Template"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => openSendModal(template._id)}
                        className="px-4 py-2 bg-[#76b900] text-white text-xs font-bold rounded-lg hover:bg-[#659e00] transition flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        Send newsletter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Create/Edit Template */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingTemplateId ? 'Edit Newsletter Template' : 'Create Newsletter Template'}
                </h3>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)} 
                  className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Form Input Side */}
                <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    
                    {/* Toggle View Mode Buttons */}
                    <div className="flex border-b border-slate-100 pb-4 justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPreviewMode(false)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                            !isPreviewMode 
                              ? 'bg-slate-800 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Code size={14} />
                          HTML Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPreviewMode(true)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                            isPreviewMode 
                              ? 'bg-[#76b900] text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Eye size={14} />
                          Live Preview
                        </button>
                      </div>
                    </div>

                    {!isPreviewMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Template Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Weekly Summer Sale" 
                            value={templateForm.name} 
                            onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Email Subject Line</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Check out our awesome summer collections! ☀️" 
                            value={templateForm.subject} 
                            onChange={e => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-slate-700">HTML & CSS Content</label>
                            <span className="text-[10px] text-slate-400 font-semibold">Standard HTML inline CSS style recommended</span>
                          </div>
                          <textarea 
                            rows="14"
                            required
                            placeholder="<div style='font-family: Arial;'>...</div>"
                            value={templateForm.htmlContent} 
                            onChange={e => setTemplateForm(prev => ({ ...prev, htmlContent: e.target.value }))} 
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-xs font-mono resize-none leading-relaxed bg-slate-950 text-emerald-400 focus:ring-1 focus:ring-emerald-400" 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-500 mb-1">
                            Subject Preview: <span className="font-bold text-slate-800">{templateForm.subject || '(No subject line)'}</span>
                          </p>
                        </div>
                        <div className="flex-1 min-h-[350px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner">
                          <iframe 
                            title="Live Template Preview"
                            srcDoc={templateForm.htmlContent} 
                            sandbox=""
                            className="w-full h-full border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setIsTemplateModalOpen(false)} 
                      className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] text-sm transition shadow-md shadow-green-100 flex items-center gap-2"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Send Newsletter */}
        {isSendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-xl font-bold text-slate-800">
                  Send Store Newsletter
                </h3>
                <button 
                  onClick={() => setIsSendModalOpen(false)} 
                  className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none"
                >
                  &times;
                </button>
              </div>

              {!sendResult ? (
                <form onSubmit={handleSendNewsletter} className="p-6 space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm flex gap-3 items-center font-bold">
                    <AlertCircle size={20} className="shrink-0 text-[#76b900]" />
                    <span>
                      This message will be dispatched to all {activeSubscribersCount} active subscribers.
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Email Template</label>
                    <select
                      required
                      value={sendingTemplateId}
                      onChange={e => setSendingTemplateId(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm bg-white font-semibold text-slate-700"
                    >
                      <option value="">-- Choose Template --</option>
                      {templates.map(tpl => (
                        <option key={tpl._id} value={tpl._id}>{tpl.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsSendModalOpen(false)} 
                      className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={sendingNewsletter || !sendingTemplateId}
                      className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] text-sm transition shadow-lg shadow-green-100 flex items-center gap-2"
                    >
                      <Send size={18} />
                      {sendingNewsletter ? 'Sending Emails...' : 'Send Newsletter Now'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6">
                  {sendResult.success ? (
                    <div className="text-center space-y-3">
                      <div className="inline-flex p-4 bg-green-100 text-green-600 rounded-full mb-2">
                        <CheckCircle size={36} />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-lg">Emails Sent Successfully!</h4>
                      <p className="text-sm text-slate-500 leading-normal max-w-sm mx-auto">
                        Your newsletter campaign has been dispatched. Here is the transaction summary:
                      </p>

                      <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto pt-4 pb-2">
                        <div className="p-3 bg-green-50 border border-green-100 rounded-2xl">
                          <p className="text-[10px] uppercase font-bold text-green-700 tracking-wider">Succeeded</p>
                          <p className="text-2xl font-black text-green-800">{sendResult.successCount}</p>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-[10px] uppercase font-bold text-red-700 tracking-wider">Failed</p>
                          <p className="text-2xl font-black text-red-800">{sendResult.failCount}</p>
                        </div>
                      </div>

                      {sendResult.failedEmails.length > 0 && (
                        <div className="text-left bg-slate-50 rounded-2xl p-4 border max-h-32 overflow-y-auto">
                          <p className="text-xs font-bold text-red-600 mb-2">Failed Deliveries:</p>
                          <ul className="text-xs text-slate-500 font-mono space-y-1 list-disc list-inside">
                            {sendResult.failedEmails.map((item, idx) => (
                              <li key={idx}>{item.email} - <span className="text-red-500">{item.error}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="inline-flex p-4 bg-red-100 text-red-600 rounded-full mb-2">
                        <AlertCircle size={36} />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-lg">Sending Failed</h4>
                      <p className="text-sm text-slate-600 leading-relaxed bg-red-50 border border-red-100 p-4 rounded-2xl max-w-sm mx-auto font-medium">
                        {sendResult.message}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsSendModalOpen(false);
                        fetchSubscribers();
                      }} 
                      className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-900 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ManageNewsletter;
