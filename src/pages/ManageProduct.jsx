import { API_BASE_URL } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';                                                                                             
import { DownloadCloud, UploadCloud, Lock, Edit3, Save, Move, Expand, ChevronLeft, ChevronRight } from 'lucide-react';

const ManageProduct = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); 
  const navigate = useNavigate();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [offerCategories, setOfferCategories] = useState([]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Progress Tracking States
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  // Default Product Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStoreType, setImportStoreType] = useState('');
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1">
            <form id="productForm" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b border-slate-100 pb-2 text-slate-800">Basic Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="relative">
                    <input required placeholder=" " value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Product Name <span className="text-red-500">*</span></label>
                  </div>
                  {isNastaCorner && (
                    <div className="relative">
                      <input required placeholder=" " value={formData.foodtype} onChange={e=>setFormData({...formData, foodtype: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                      <label className="floating-label">Food Type <span className="text-red-500">*</span></label>
                    </div>
                  )}
                  <div className="relative">
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className={`floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-white text-sm ${formData.category ? 'has-value' : ''}`}>
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <label className="floating-label">Category</label>
                  </div>
                  <div className="relative">
                    <input placeholder=" " value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Brand</label>
                  </div>
                  <div className="relative">
                    <input placeholder=" " value={formData.subCategory} onChange={e=>setFormData({...formData, subCategory: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Sub Category (Legacy)</label>
                  </div>

                  {/* Select Sub-Categories (dynamic) */}
                  {formData.category && (
                    <div className="md:col-span-2 space-y-2 border border-slate-100 p-4 rounded-xl text-left">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply Sub-categories</label>
                      {subCategories.filter(sc => (sc.category?._id || sc.category) === formData.category).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No sub-categories defined for this category. Go to Catalog Manager to add some.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {subCategories.filter(sc => (sc.category?._id || sc.category) === formData.category).map(sc => {
                            const isChecked = formData.subCategories?.includes(sc._id);
                            return (
                              <label key={sc._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${isChecked ? 'bg-green-50 border-[#76b900] text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    let newSubCats = [...(formData.subCategories || [])];
                                    if (checked) {
                                      newSubCats.push(sc._id);
                                    } else {
                                      newSubCats = newSubCats.filter(id => id !== sc._id);
                                    }
                                    setFormData({ ...formData, subCategories: newSubCats });
                                  }} 
                                  className="hidden" 
                                />
                                {sc.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Select Offer Categories */}
                  <div className="md:col-span-2 space-y-2 border border-slate-100 p-4 rounded-xl text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply Offer Categories</label>
                    {offerCategories.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No offer categories defined. Go to Catalog Manager to add some.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {offerCategories.map(oc => {
                          const isChecked = formData.offerCategories?.includes(oc._id);
                          return (
                            <label key={oc._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${isChecked ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={e => {
                                  const checked = e.target.checked;
                                  let newOfferCats = [...(formData.offerCategories || [])];
                                  if (checked) {
                                    newOfferCats.push(oc._id);
                                  } else {
                                    newOfferCats = newOfferCats.filter(id => id !== oc._id);
                                  }
                                  setFormData({ ...formData, offerCategories: newOfferCats });
                                }} 
                                className="hidden" 
                              />
                              <span style={{ backgroundColor: oc.color }} className="w-2.5 h-2.5 rounded-full inline-block mr-1"></span>
                              {oc.name}
                              <span className="text-[9px] uppercase bg-white/60 px-1 py-0.5 rounded border border-black/5 ml-1">
                                {oc.offerType === 'B1G1' ? 'B1G1' : oc.offerType === 'B2G1' ? 'B2G1' : oc.offerType === 'DISCOUNT' ? 'Discount' : 'None'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-100 mt-2 space-y-3">
                {canCustomize && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={formData.isCustomizable} onChange={e => setFormData({...formData, isCustomizable: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                      Enable Custom Image Upload for Customers (Printing/Gift items)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={formData.allowCustomText} onChange={e => setFormData({...formData, allowCustomText: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                      Enable Custom Text Input for Customers (e.g. Names, Quotes, Messages)
                    </label>
                  </>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-[#76b900] rounded focus:ring-[#76b900]" />
                  Product is Active (Visible to Customers)
                </label>
              </div>
                  <div className="md:col-span-2 relative">
                    <textarea rows="3" placeholder=" " value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="floating-textarea w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none resize-none text-sm bg-white" />
                    <label className="floating-label">Description</label>
                  </div>
                </div>
              </div>

              {/* Customizable Area Editor */}
              {(formData.isCustomizable || formData.allowCustomText) && (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-lg text-slate-800">Customizable Area Setup</h4>
                    <p className="text-sm text-slate-500">Click and drag the box below to define the area on your product where the customer's image will be printed. The first product image is used as the preview.</p>
                    
                    <div ref={areaContainerRef} className="relative w-fit max-w-lg mx-auto bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden">
                        {formData.images.length > 0 ? (
                            <img src={formData.images[0]} alt="Product Preview" className="max-w-full h-auto block" />
                        ) : (
                            <div className="w-full min-w-[280px] aspect-square flex items-center justify-center text-slate-400 p-4 text-center">Upload a product image first to define the customizable area.</div>
                        )}

                        {formData.images.length > 0 && (
                            <div 
                                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 cursor-move group"
                                style={{
                                    left: `${formData.customizableArea.x}%`,
                                    top: `${formData.customizableArea.y}%`,
                                    width: `${formData.customizableArea.width}%`,
                                    height: `${formData.customizableArea.height}%`,
                                }}
                                onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                                onTouchStart={(e) => handleInteractionStart(e, 'drag')}
                            >
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Move className="text-white drop-shadow-md" />
                                </div>
                                <div 
                                    className="absolute -right-2 -bottom-2 w-5 h-5 bg-blue-600 rounded-full cursor-se-resize border-2 border-white shadow-md flex items-center justify-center" 
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                                    onTouchStart={(e) => handleInteractionStart(e, 'resize')}
                                >
                                    <Expand size={10} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              )}

              {/* Pricing & Inventory */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b border-slate-100 pb-2 text-slate-800">Pricing & Default Inventory</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 pt-2">
                  <div className="relative">
                    <input type="number" required={formData.variants.length === 0} placeholder=" " value={formData.basePrice} onChange={e=>setFormData({...formData, basePrice: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Base Price (₹) <span className="text-red-500">*</span></label>
                  </div>
                  <div className="relative">
                    <input type="number" min="0" max="100" placeholder=" " value={formData.discount} onChange={e=>setFormData({...formData, discount: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white" />
                    <label className="floating-label">Discount (%)</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={formData.basePrice ? Math.round(Number(formData.basePrice) - (Number(formData.basePrice) * (Number(formData.discount || 0) / 100))) : ''} 
                      disabled 
                      className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-semibold" 
                    />
                    <label className="floating-label">Selling Price (₹)</label>
                  </div>
                  <div className="relative">
                    <input type="number" placeholder=" " value={formData.totalStock} onChange={e=>setFormData({...formData, totalStock: e.target.value})} className="floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm disabled:bg-slate-50 bg-white" disabled={formData.variants.length > 0} />
                    <label className="floating-label">Total Stock</label>
                  </div>
                  <div className="relative">
                    <select value={formData.unitType} onChange={e=>setFormData({...formData, unitType: e.target.value})} className={`floating-input w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-white text-sm ${formData.unitType ? 'has-value' : ''}`}>
                      <option value="piece">Piece</option>
                      <option value="kg">Kg</option>
                      <option value="gram">Gram</option>
                      <option value="plate">Plate</option>
                      <option value="pack">Pack</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                      <option value="liter">Liter</option>
                      <option value="ml">Ml</option>
                      <option value="dozen">Dozen</option>
                      <option value="packet">Packet</option>
                      <option value="size">Size</option>
                      <option value="set">Set</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="floating-label">Selling Unit Type</label>
                  </div>
                </div>
              </div>

              {/* Key Features & Specifications */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-6">
                <h4 className="font-bold text-lg border-b border-slate-200 pb-2 text-slate-800">Features & Specifications</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Features */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="m-keyFeaturesEnabled" 
                        checked={formData.keyFeaturesEnabled || false} 
                        onChange={e => setFormData({ ...formData, keyFeaturesEnabled: e.target.checked })} 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                      />
                      <label htmlFor="m-keyFeaturesEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">Enable Key Features</label>
                    </div>

                    {formData.keyFeaturesEnabled && (
                      <div className="space-y-2.5">
                        {formData.keyFeatures?.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={feature} 
                              onChange={e => {
                                  const newFeatures = [...(formData.keyFeatures || [])];
                                  newFeatures[fIdx] = e.target.value;
                                  setFormData({ ...formData, keyFeatures: newFeatures });
                              }} 
                              placeholder="e.g. 100% Organic Cotton" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                  setFormData({
                                      ...formData,
                                      keyFeatures: formData.keyFeatures.filter((_, idx) => idx !== fIdx)
                                  });
                              }} 
                              className="text-red-500 hover:text-red-700 text-lg font-bold p-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, keyFeatures: [...(formData.keyFeatures || []), ''] })} 
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          + Add Key Feature
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Specifications */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="m-specificationsEnabled" 
                        checked={formData.specificationsEnabled || false} 
                        onChange={e => setFormData({ ...formData, specificationsEnabled: e.target.checked })} 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                      />
                      <label htmlFor="m-specificationsEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">Enable Specifications</label>
                    </div>

                    {formData.specificationsEnabled && (
                      <div className="space-y-2.5">
                        {formData.specifications?.map((spec, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={spec.name} 
                              onChange={e => {
                                  const newSpecs = [...(formData.specifications || [])];
                                  newSpecs[sIdx].name = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                              }} 
                              placeholder="Name (e.g. Weight)" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <input 
                              type="text" 
                              value={spec.value} 
                              onChange={e => {
                                  const newSpecs = [...(formData.specifications || [])];
                                  newSpecs[sIdx].value = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                              }} 
                              placeholder="Value (e.g. 500g)" 
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                  setFormData({
                                      ...formData,
                                      specifications: formData.specifications.filter((_, idx) => idx !== sIdx)
                                  });
                              }} 
                              className="text-red-500 hover:text-red-700 text-lg font-bold p-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, specifications: [...(formData.specifications || []), { name: '', value: '' }] })} 
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          + Add Specification
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-lg text-slate-800">Product Images</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsMediaLibraryOpen(true); fetchMedia(); }} className="text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">View Media Library</button>
                    <label className={`cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors ${uploadingProductImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploadingProductImage ? 'Uploading...' : '+ Upload Images'}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingProductImage} />
                    </label>
                  </div>
                </div>
                
                {uploadingProductImage && (
                  <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
                    <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                      <span>Uploading Images... {uploadProgress}%</span>
                      <div className="flex items-center gap-3">
                        <span>{uploadSpeed}</span>
                        <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
                  </div>
                )}
                
                {formData.images.length === 0 && <p className="text-sm text-slate-500 italic">No images added. A placeholder will be shown.</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square flex items-center justify-center">
                      <img src={img} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={()=>handleRemoveImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600">&times;</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Images will be automatically converted to AVIF format for better performance and smaller size.</p>
              </div>

              {/* Variants */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-2 gap-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-lg text-slate-800">Product Variants</h4>
                    {formData.variants.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <label className="text-xs font-bold text-slate-600">Type:</label>
                        <select 
                          value={formData.variantType || 'option'} 
                          onChange={e => setFormData({ ...formData, variantType: e.target.value })}
                          className="px-2 py-0.5 border border-slate-200 rounded text-xs font-bold text-slate-700 bg-white outline-none focus:border-[#76b900]"
                        >
                          <option value="option">Option</option>
                          <option value="size">Size</option>
                          <option value="color">Color</option>
                          <option value="flavor">Flavor</option>
                          <option value="weight">Weight</option>
                          <option value="pack">Pack</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleAddVariant} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">+ Add Variant</button>
                </div>
                {formData.variants.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No variants added. The product will use the base price and total stock.</p>
                ) : formData.variants.map((v, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 relative group transition-colors hover:border-slate-300">
                    <button type="button" onClick={()=>handleRemoveVariant(idx)} className="absolute top-3 right-4 text-red-400 hover:text-red-600 font-bold text-xl leading-none">&times;</button>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                      <div className="md:col-span-2"><label className="block text-xs font-semibold mb-1 text-slate-600">Variant Name <span className="text-red-500">*</span></label><input type="text" placeholder="e.g. 500g, Red, Size L" value={v.name} onChange={e=>handleUpdateVariant(idx, 'name', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">Price (₹) <span className="text-red-500">*</span></label><input type="number" placeholder="Price" value={v.price} onChange={e=>handleUpdateVariant(idx, 'price', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">Stock <span className="text-red-500">*</span></label><input type="number" placeholder="Qty" value={v.stock} onChange={e=>handleUpdateVariant(idx, 'stock', e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                      <div><label className="block text-xs font-semibold mb-1 text-slate-600">SKU Code</label><input type="text" placeholder="Optional" value={v.sku} onChange={e=>handleUpdateVariant(idx, 'sku', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#76b900]" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0">
            <button type="button" onClick={handleClose} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" form="productForm" disabled={loading} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50">
              {editingId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Media Library Modal */}
    {isMediaLibraryOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800">Store Media Library</h3>
            <button onClick={() => setIsMediaLibraryOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>
          <div className="p-8 overflow-y-auto flex-1">
            {loadingMedia ? (
              <div className="flex justify-center py-10"><span className="text-slate-500 font-medium">Loading media...</span></div>
            ) : mediaImages.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium">No media found. Upload images from the product form.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {mediaImages.map((img) => (
                  <div key={img.name} className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-sm hover:shadow-md transition-shadow">
                    <img src={img.url} alt="media" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button onClick={() => { if (!formData.images.includes(img.url)) setFormData({...formData, images: [...formData.images, img.url]}); setIsMediaLibraryOpen(false); }} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 shadow-sm w-3/4">
                        Select
                      </button>
                      <button onClick={() => handleDeleteMedia(img.name)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 shadow-sm w-3/4">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Import Default Products Modal */}
    {isImportModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><DownloadCloud className="text-[#76b900]" /> Import Default Catalog</h3>
            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
          </div>

          <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Catalog to Preview:</label>
                <select value={importStoreType} onChange={(e) => setImportStoreType(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white font-medium text-slate-700 shadow-sm">
                  {getFilteredImportStoreTypes().length > 0 ? getFilteredImportStoreTypes().map(st => (
                    <option key={st._id} value={st.name}>{st.name}</option>
                  )) : (
                    <option value="kirana">Kirana / Grocery</option>
                  )}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Catalog:</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] bg-white font-medium text-slate-700 shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={hideImported} onChange={(e) => setHideImported(e.target.checked)} className="w-4 h-4 text-[#76b900] rounded focus:ring-[#76b900] cursor-pointer" />
                Hide already imported products
              </label>
            </div>

            {loadingDefaults ? (
              <div className="py-20 text-center text-slate-500 font-bold animate-pulse">Loading preview catalog...</div>
            ) : defaultProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white font-medium">No default products found for this category.</div>
            ) : filteredDefaultProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white font-medium">No products match your search.</div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-500 font-semibold">Showing {filteredDefaultProducts.length} products. Select the ones you want to import.</p>
                  <button type="button" onClick={toggleAllDefaultProducts} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    {filteredDefaultProducts.length > 0 && filteredDefaultProducts.every(p => selectedDefaultProducts.includes(p._id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDefaultProducts.map(p => {
                    const isImported = importedProductIds.includes(p._id);
                    const isSelected = selectedDefaultProducts.includes(p._id);
                    return (
                    <div key={p._id} onClick={() => !isImported && toggleDefaultProductSelection(p._id)} className={`bg-white p-4 rounded-xl border relative cursor-pointer shadow-sm flex flex-col gap-2 transition-all ${isSelected ? 'border-[#76b900] ring-2 ring-green-100' : isImported ? 'border-slate-200 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-[#76b900] opacity-75 hover:opacity-100'}`}>
                      <div className="absolute top-2 right-2 z-10"><input type="checkbox" disabled={isImported} checked={isSelected} readOnly className="w-5 h-5 rounded text-[#76b900] cursor-pointer disabled:opacity-50" /></div>
                      <div className={`h-24 w-full rounded-lg flex items-center justify-center overflow-hidden transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 bg-slate-100'}`}>
                        {p.images && p.images[0] ? <img src={p.images[0]} alt={p.name} className={`w-full h-full object-cover ${isSelected ? '' : 'grayscale'}`} /> : <span className="text-slate-400 text-xs">No Image</span>}
                      </div>
                      <div className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} title={p.name}>{p.name}</div>
                      <div className="flex justify-between items-center">
                        <div className={`font-bold text-sm transition-colors ${isSelected ? 'text-[#76b900]' : 'text-slate-400'}`}>₹{p.basePrice}/{p.unitType}</div>
                        {isImported && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Imported</span>}
                      </div>
                    </div>
                  )})}
                </div>
              </>
            )}
          </div>

          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0">
            <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleImportDefaultProducts} disabled={importing || selectedDefaultProducts.length === 0} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2">
              {importing ? 'Importing...' : `Import ${selectedDefaultProducts.length} Products`}
            </button>
          </div>
        </div>
      </div>
    )}
    </AdminLayout>
  );
};

export default ManageProduct;