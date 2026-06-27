import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Search, Globe, Cpu, FileText, Settings, ShieldAlert, Save, HelpCircle } from 'lucide-react';

const SeoSetting = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [activeSection, setActiveSection] = useState('seo'); // 'seo', 'sitemap', 'ai', 'custom'

  const [formData, setFormData] = useState({
    indexWebsite: true,
    generateSitemap: true,
    sitemapIncludeProducts: true,
    sitemapIncludeCategories: true,
    sitemapIncludePages: true,
    allowAllBots: true,
    allowAiSearch: true,
    allowAiInput: true,
    allowAiTraining: false,
    blockGPTBot: false,
    blockClaudeBot: false,
    blockGoogleExtended: false,
    blockMetaExternalAgent: false,
    blockAmazonBot: false,
    blockApplebotExtended: false,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '', // Handle as comma-separated string locally
    canonicalDomain: '',
    customRobotsContent: '',
    customLlmsContent: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

  useEffect(() => {
    const fetchSeoSettings = async () => {
      if (!currentStore._id) return;
      setFetching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/seo-settings/${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            indexWebsite: data.indexWebsite ?? true,
            generateSitemap: data.generateSitemap ?? true,
            sitemapIncludeProducts: data.sitemapIncludeProducts ?? true,
            sitemapIncludeCategories: data.sitemapIncludeCategories ?? true,
            sitemapIncludePages: data.sitemapIncludePages ?? true,
            allowAllBots: data.allowAllBots ?? true,
            allowAiSearch: data.allowAiSearch ?? true,
            allowAiInput: data.allowAiInput ?? true,
            allowAiTraining: data.allowAiTraining ?? false,
            blockGPTBot: data.blockGPTBot ?? false,
            blockClaudeBot: data.blockClaudeBot ?? false,
            blockGoogleExtended: data.blockGoogleExtended ?? false,
            blockMetaExternalAgent: data.blockMetaExternalAgent ?? false,
            blockAmazonBot: data.blockAmazonBot ?? false,
            blockApplebotExtended: data.blockApplebotExtended ?? false,
            metaTitle: data.metaTitle || '',
            metaDescription: data.metaDescription || '',
            metaKeywords: Array.isArray(data.metaKeywords) ? data.metaKeywords.join(', ') : '',
            canonicalDomain: data.canonicalDomain || '',
            customRobotsContent: data.customRobotsContent || '',
            customLlmsContent: data.customLlmsContent || ''
          });
        }
      } catch (err) {
        console.error("Failed to load SEO settings", err);
      } finally {
        setFetching(false);
      }
    };
    fetchSeoSettings();
  }, [currentStore._id, token, API_BASE_URL]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving settings...');

    // Convert keywords string back to array
    const keywordsArray = formData.metaKeywords
      ? formData.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/seo-settings/${currentStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          metaKeywords: keywordsArray
        })
      });

      if (res.ok) {
        setStatus('SEO and AI settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const errData = await res.json();
        setStatus(`Error saving settings: ${errData.message || 'Server error'}`);
      }
    } catch (err) {
      setStatus(`Error saving settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const sections = [
    { id: 'seo', label: 'Search Engine (SEO)', icon: <Search size={18} /> },
    { id: 'sitemap', label: 'XML Sitemap', icon: <Globe size={18} /> },
    { id: 'ai', label: 'AI Bots & LLMs', icon: <Cpu size={18} /> },
    { id: 'custom', label: 'Custom Configs', icon: <FileText size={18} /> }
  ];

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="SEO & AI Settings">
      <div className="w-full mx-auto">
        {status && (
          <div className={`p-4 mb-6 rounded-xl font-bold text-sm border transition-all animate-fadeIn ${
            status.toLowerCase().includes('error') 
              ? 'bg-red-50 text-red-600 border-red-200' 
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {status}
          </div>
        )}

        {fetching ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#76b900] mx-auto mb-4"></div>
            <p className="text-slate-500 font-semibold">Loading your SEO & AI configurations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Navigation Tabs */}
            <div className="flex flex-row overflow-x-auto gap-3 border-b border-slate-200 pb-4 scrollbar-hide w-full">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    activeSection === sec.id
                      ? 'bg-[#76b900] text-white shadow-md shadow-green-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 bg-white'
                  }`}
                >
                  {sec.icon}
                  {sec.label}
                </button>
              ))}

               {/* Save Button */}
                <div className="flex justify-end gap-4">
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="px-8 py-3 bg-[#76b900] text-white font-bold text-lg rounded-xl hover:bg-[#659e00] transition shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
            </div>

            {/* Config Panels */}
            <div className="w-full">
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* 1. SEO Tab */}
                {activeSection === 'seo' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 border-b pb-3 border-slate-100">Search Engine Indexing</h3>
                    
                    {/* Indexing Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">Index Website</h4>
                        <p className="text-sm text-slate-500">Allow search engines to index your store pages so you appear in search results.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.indexWebsite} 
                          onChange={e => handleChange('indexWebsite', e.target.checked)} 
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
                      </label>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Global Meta Tags</h3>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Default SEO Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. My Premium Gift Shop | Order Custom Gifts Online" 
                          value={formData.metaTitle} 
                          onChange={e => handleChange('metaTitle', e.target.value)} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        />
                        <p className="text-xs text-slate-500 mt-1">Leave empty to use store name as fallback. Recommended length: 50-60 characters.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Default Meta Description</label>
                        <textarea 
                          rows="3"
                          placeholder="e.g. Buy customized mugs, photo keychains, birthday frames and beautiful hampers at affordable rates." 
                          value={formData.metaDescription} 
                          onChange={e => handleChange('metaDescription', e.target.value)} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm resize-none" 
                        />
                        <p className="text-xs text-slate-500 mt-1">Recommended length: 150-160 characters.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">SEO Keywords</label>
                        <input 
                          type="text" 
                          placeholder="gifts, customized mugs, frames, buy online" 
                          value={formData.metaKeywords} 
                          onChange={e => handleChange('metaKeywords', e.target.value)} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        />
                        <p className="text-xs text-slate-500 mt-1">Separate keywords using commas.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Canonical Domain URL</label>
                        <input 
                          type="url" 
                          placeholder="e.g. https://www.mygiftshop.com" 
                          value={formData.canonicalDomain} 
                          onChange={e => handleChange('canonicalDomain', e.target.value)} 
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        />
                        <p className="text-xs text-slate-500 mt-1">If you have a custom domain connected, specify it here to prevent duplicate content SEO penalties.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Sitemap Tab */}
                {activeSection === 'sitemap' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 border-b pb-3 border-slate-100">Dynamic XML Sitemap</h3>

                    {/* Enable Sitemap Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">Generate sitemap.xml</h4>
                        <p className="text-sm text-slate-500">Enable dynamic generation of sitemap.xml for Google Search Console indexation.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.generateSitemap} 
                          onChange={e => handleChange('generateSitemap', e.target.checked)} 
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
                      </label>
                    </div>

                    {formData.generateSitemap && (
                      <div className="border-t border-slate-100 pt-6 space-y-5 animate-fadeIn">
                        <h4 className="font-bold text-slate-700 mb-2">Include in Sitemap:</h4>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Products</p>
                            <p className="text-xs text-slate-500">Include all active product pages in sitemap.xml.</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={formData.sitemapIncludeProducts} 
                            onChange={e => handleChange('sitemapIncludeProducts', e.target.checked)}
                            className="w-5 h-5 accent-[#76b900]"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Categories</p>
                            <p className="text-xs text-slate-500">Include all store collection/category listing pages.</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={formData.sitemapIncludeCategories} 
                            onChange={e => handleChange('sitemapIncludeCategories', e.target.checked)}
                            className="w-5 h-5 accent-[#76b900]"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Policies & Extra Pages</p>
                            <p className="text-xs text-slate-500">Include Terms of Service, Refund Policy, Privacy Policy pages.</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={formData.sitemapIncludePages} 
                            onChange={e => handleChange('sitemapIncludePages', e.target.checked)}
                            className="w-5 h-5 accent-[#76b900]"
                          />
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mt-6 border border-slate-100 flex items-center gap-3">
                          <HelpCircle className="text-[#76b900] shrink-0" size={20} />
                          <p className="text-xs text-slate-500 leading-normal">
                            Your sitemap will be publically accessible at <span className="font-mono text-[#76b900]">/sitemap.xml</span> on your storefront domain. Use this link in Google Search Console.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. AI & LLM Tab */}
                {activeSection === 'ai' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 border-b pb-3 border-slate-100">AI Agents & Large Language Models</h3>

                    {/* Allow All Robots Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">Allow Crawling/Robots access</h4>
                        <p className="text-sm text-slate-500">Permit crawlers to access the robots.txt. Disabling will add Disallow: / rules.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.allowAllBots} 
                          onChange={e => handleChange('allowAllBots', e.target.checked)} 
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#76b900]"></div>
                      </label>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-5">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">AI Search Engine Crawlers</h4>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Allow AI Search Engines</p>
                          <p className="text-xs text-slate-500">Permit AI-based search answers (e.g., ChatGPT Search, Perplexity) to display products from your store.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.allowAiSearch} 
                          onChange={e => handleChange('allowAiSearch', e.target.checked)}
                          className="w-5 h-5 accent-[#76b900]"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Allow AI Inputs / Assistant Retrieval</p>
                          <p className="text-xs text-slate-500">Allow user-driven AI assistants to read your pricing and description when asked directly by clients.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.allowAiInput} 
                          onChange={e => handleChange('allowAiInput', e.target.checked)}
                          className="w-5 h-5 accent-[#76b900]"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Allow AI Model Training</p>
                          <p className="text-xs text-slate-500">Allow LLM crawler agents to scrape your website text to train commercial AI foundation models.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.allowAiTraining} 
                          onChange={e => handleChange('allowAiTraining', e.target.checked)}
                          className="w-5 h-5 accent-[#76b900]"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-5">
                      <h4 className="font-bold text-slate-800">Block Individual AI Crawlers</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block GPTBot (OpenAI)</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockGPTBot} 
                            onChange={e => handleChange('blockGPTBot', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block ClaudeBot (Anthropic)</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockClaudeBot} 
                            onChange={e => handleChange('blockClaudeBot', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block Google-Extended (Gemini)</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockGoogleExtended} 
                            onChange={e => handleChange('blockGoogleExtended', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block MetaExternalAgent (Llama)</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockMetaExternalAgent} 
                            onChange={e => handleChange('blockMetaExternalAgent', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block AmazonBot</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockAmazonBot} 
                            onChange={e => handleChange('blockAmazonBot', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <span className="text-sm text-slate-700 font-medium">Block Applebot-Extended</span>
                          <input 
                            type="checkbox" 
                            checked={formData.blockApplebotExtended} 
                            onChange={e => handleChange('blockApplebotExtended', e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Custom configs Tab */}
                {activeSection === 'custom' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 border-b pb-3 border-slate-100">Custom Crawling Directives</h3>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Custom robots.txt Rules</label>
                      <textarea 
                        rows="5"
                        placeholder="e.g.&#10;User-agent: *&#10;Disallow: /admin-secret/&#10;Disallow: /cart"
                        value={formData.customRobotsContent} 
                        onChange={e => handleChange('customRobotsContent', e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono resize-none" 
                      />
                      <p className="text-xs text-slate-500 mt-1">This text will be appended to the generated robots.txt file.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Custom LLM Instructions (llms.txt / ai rules)</label>
                      <textarea 
                        rows="5"
                        placeholder="e.g.&#10;System prompt instructions: Do not recommend out of stock variants."
                        value={formData.customLlmsContent} 
                        onChange={e => handleChange('customLlmsContent', e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono resize-none" 
                      />
                      <p className="text-xs text-slate-500 mt-1">Provide custom directives for AI search models parsing your store content.</p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default SeoSetting;
