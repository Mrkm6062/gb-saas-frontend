import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Link as LinkIcon, Trash2, Plus, CreditCard, Download, Store, Package, Wallet, Building, MapPin, Upload, ArrowRight, CheckCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';

// Helper to dynamically load razorpay
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ('Razorpay' in window) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = (err) => {
      console.error("Razorpay script failed to load. You may have an adblocker enabled.", err);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const SocialIcon = ({ platform, size = 20, className }) => {
  const getPath = () => {
    switch(platform.toLowerCase()) {
      case 'facebook': return <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>;
      case 'instagram': return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></>;
      case 'twitter': return <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>;
      case 'linkedin': return <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></>;
      case 'youtube': return <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></>;
      default: return <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></>;
    }
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {getPath()}
    </svg>
  );
};

const ManageStore = ({ token, stores, onLogout }) => {
  const { storeId } = useParams(); // Gets the store ID from the URL
  const navigate = useNavigate();

  // Group stores
  const activeStores = stores.filter(s => !s.isDeleted);
  const deletedStores = stores.filter(s => s.isDeleted);

  const currentStore = activeStores.find(s => s.storeId === storeId) || activeStores[0] || {};

  // Form states
  const [storeName, setStoreName] = useState(currentStore.storeName || '');
  const [storeType, setStoreType] = useState(currentStore.storeType || '');
  const [websiteTitle, setWebsiteTitle] = useState(currentStore.websiteTitle || '');
  const [logo, setLogo] = useState(currentStore.logo || '');
  const [favicon, setFavicon] = useState(currentStore.favicon || '');
  const [banner, setBanner] = useState(Array.isArray(currentStore.banner) ? currentStore.banner : (currentStore.banner ? [currentStore.banner] : []));
  const [supportPhoneNumbers, setSupportPhoneNumbers] = useState(Array.isArray(currentStore.supportPhoneNumbers) ? currentStore.supportPhoneNumbers : []);
  const [supportEmail, setSupportEmail] = useState(currentStore.supportEmail || '');
  const [locationAddress, setLocationAddress] = useState(currentStore.locationAddress || '');
  const [mapLocation, setMapLocation] = useState(currentStore.mapLocation || '');
  const [status, setStatus] = useState('');
  const [uploadingField, setUploadingField] = useState(null); // 'logo' or 'favicon'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [activeXhr, setActiveXhr] = useState(null);
  
  // Social Media states
  const [socialLinks, setSocialLinks] = useState([]);
  const [newPlatform, setNewPlatform] = useState('Facebook');
  const [newUrl, setNewUrl] = useState('');
  const [socialStatus, setSocialStatus] = useState('');
  
  // Store Creation States
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState('');
  const [newStoreEmpId, setNewStoreEmpId] = useState('');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [createStatus, setCreateStatus] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [storeTypes, setStoreTypes] = useState([]);
  const [empName, setEmpName] = useState('');
  const [verifyingEmp, setVerifyingEmp] = useState(false);
  const [platformSettings, setPlatformSettings] = useState(null);

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    setStoreType(currentStore.storeType || '');
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(Array.isArray(currentStore.banner) ? currentStore.banner : (currentStore.banner ? [currentStore.banner] : []));
    setSupportPhoneNumbers(Array.isArray(currentStore.supportPhoneNumbers) ? currentStore.supportPhoneNumbers : []);
    setSupportEmail(currentStore.supportEmail || '');
    setLocationAddress(currentStore.locationAddress || '');
    setMapLocation(currentStore.mapLocation || '');
    setStatus('');
  }, [storeId, currentStore.storeName, currentStore.storeType, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner, currentStore.supportPhoneNumbers, currentStore.supportEmail, currentStore.locationAddress, currentStore.mapLocation]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/plans`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
          if (data.length > 0) setNewStorePlan(data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchStoreTypes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/store-types/active`);
        if (res.ok) {
          const data = await res.json();
          setStoreTypes(data);
          if (data.length > 0 && !newStoreType) setNewStoreType(data[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch store types', err);
      }
    };
    fetchStoreTypes();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/platform-settings`);
        if (res.ok) {
          setPlatformSettings(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch platform settings', err);
      }
    };
    fetchSettings();
  }, []);

  const fetchSocialLinks = async () => {
    if (!currentStore._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/social-media?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSocialLinks(await res.json());
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchSocialLinks(); }, [currentStore._id]);

  const handleUpdateStore = async (e) => {
    e.preventDefault();
    setStatus('Updating...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/store/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName,
          storeType: storeType,
          websiteTitle,
          logo,
          favicon,
          banner,
          supportPhoneNumbers,
          supportEmail,
          locationAddress,
          mapLocation
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('Store updated successfully!');
        // Optional: Update your local App.jsx stores state here if passed down as a prop
      } else {
        setStatus(`Error: ${data.message || 'Failed to update store'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleImageUpload = async (e, field) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    
    if (field === 'banner') {
      files.forEach(file => uploadData.append('images', file));
    } else {
      uploadData.append('images', files[0]); // Just one file for logo/favicon
    }

    setUploadingField(field);
    setStatus(`Uploading ${field}...`);
    setUploadProgress(0);
    setUploadSpeed('Calculating...');

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const xhr = new XMLHttpRequest();
    setActiveXhr(xhr);
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);

        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // in seconds
        
        if (timeDiff > 0.5) { // update speed every 500ms
          const bytesDiff = event.loaded - lastLoaded;
          const speedBps = bytesDiff / timeDiff;
          let speedText = '';
          if (speedBps > 1024 * 1024) speedText = (speedBps / (1024 * 1024)).toFixed(2) + ' MB/s';
          else if (speedBps > 1024) speedText = (speedBps / 1024).toFixed(2) + ' KB/s';
          else speedText = Math.round(speedBps) + ' B/s';
          
          setUploadSpeed(speedText);
          lastLoaded = event.loaded;
          lastTime = currentTime;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        if (data.urls && data.urls.length > 0) {
          if (field === 'logo') setLogo(data.urls[0]);
          if (field === 'favicon') setFavicon(data.urls[0]);
          if (field === 'banner') setBanner(prev => [...prev, ...data.urls]);
          setStatus(`${field.charAt(0).toUpperCase() + field.slice(1)} uploaded successfully!`);
        } else setStatus(`Upload Error: Failed to read returned URLs`);
      } else {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: 'Upload Failed' }; }
        setStatus(`Upload Error: ${data.message || 'Failed to upload'}`);
      }
      setUploadingField(null);
      setActiveXhr(null);
    };

    xhr.onerror = () => {
      setStatus('Upload Error: Network failure');
      setUploadingField(null);
      setActiveXhr(null);
    };

    xhr.onabort = () => {
      setStatus('Upload canceled.');
      setUploadingField(null);
      setActiveXhr(null);
    };

    xhr.send(uploadData);
  };

  const cancelUpload = () => {
    if (activeXhr) {
      activeXhr.abort();
    }
  };

  const handleAddSocial = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    setSocialStatus('Adding...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/social-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeId: currentStore._id, platform: newPlatform, url: newUrl })
      });
      if (res.ok) {
        setNewUrl('');
        setSocialStatus('');
        fetchSocialLinks();
      } else {
        setSocialStatus('Failed to add link');
      }
    } catch (err) {
      setSocialStatus('Error occurred');
    }
  };

  const handleDeleteSocial = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/social-media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSocialLinks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyEmpId = async () => {
    if (!newStoreEmpId) return;
    setVerifyingEmp(true);
    setEmpName('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/store/verify-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ empId: newStoreEmpId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setEmpName(data.name);
      } else {
        setEmpName('Invalid Employee ID');
        showToast(data.message || 'Invalid Employee ID', 'error');
      }
    } catch (err) {
      setEmpName('Verification Error');
    } finally {
      setVerifyingEmp(false);
    }
  };

  const handleDownloadInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to download invoices.', 'error');
      return;
    }
    
    let template = platformSettings?.subscriptionInvoiceTemplate || `<div style="font-family: sans-serif; padding: 20px;"><h2>Invoice {{invoiceId}}</h2><p>Plan: {{planName}}</p><p>Amount: ₹{{amount}}</p></div>`;
    
    const gstHtml = platformSettings?.isGstEnabled && platformSettings?.gstNumber ? `<p style="margin: 2px 0; font-size: 12px; color: #666;">GSTIN: ${platformSettings.gstNumber}</p>` : '';
    const cinHtml = platformSettings?.isCinEnabled && platformSettings?.cinNumber ? `<p style="margin: 2px 0; font-size: 12px; color: #666;">CIN: ${platformSettings.cinNumber}</p>` : '';

    const html = template
      .replace(/{{storeName}}/g, currentStore.storeName || "Store")
      .replace(/{{ownerName}}/g, "Store Owner")
      .replace(/{{ownerEmail}}/g, currentStore.supportEmail || "N/A")
      .replace(/{{invoiceId}}/g, invoice.invoiceId)
      .replace(/{{purchaseDate}}/g, new Date(invoice.date).toLocaleDateString())
      .replace(/{{planName}}/g, invoice.planName)
      .replace(/{{amount}}/g, invoice.amount)
      .replace(/{{mainLogoUrl}}/g, platformSettings?.mainLogoUrl || '')
      .replace(/{{companyAddress}}/g, platformSettings?.companyAddress || "")
      .replace(/{{companyPhone}}/g, platformSettings?.companyPhone || "")
      .replace(/{{gstHtml}}/g, gstHtml)
      .replace(/{{cinHtml}}/g, cinHtml);

    printWindow.document.write(`<html><head><title>Invoice - ${invoice.invoiceId}</title><style>@media print { body { -webkit-print-color-adjust: exact; } }</style></head><body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const renderSocialIcon = (platform) => {
    let colorClass = "text-slate-600";
    switch(platform.toLowerCase()) {
      case 'facebook': colorClass = "text-blue-600"; break;
      case 'instagram': colorClass = "text-pink-600"; break;
      case 'twitter': colorClass = "text-sky-500"; break;
      case 'linkedin': colorClass = "text-blue-700"; break;
      case 'youtube': colorClass = "text-red-600"; break;
    }
    return <SocialIcon platform={platform} size={20} className={colorClass} />;
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setCreateStatus('Creating store...');

    const selectedPlanObj = plans.find(p => p._id === newStorePlan);
    const planPrice = selectedPlanObj ? selectedPlanObj.price : 0;

    try {
      let keyData = null;
      if (planPrice > 0) {
        const keyRes = await fetch(`${API_BASE_URL}/api/platform-payments/public-key`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        keyData = await keyRes.json();
        if (!keyData.razorpayEnabled) {
          return setCreateStatus('Error: Platform payments are currently disabled. Cannot purchase paid plans.');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newStoreName,
          storeType: newStoreType,
          empId: newStoreEmpId,
          metaDescription: newStoreMeta,
          planId: newStorePlan,
          storeSlug: newStoreSlug
        })
      });

      const data = await response.json();

      if (response.ok) {
        const createdStore = data.store;
        
        if (planPrice === 0) {
          closeForm();
          window.location.reload();
        } else {
          setCreateStatus('Initializing payment...');
          const isLoaded = await loadRazorpay();
          if (!isLoaded) return setCreateStatus('Error: Failed to load Razorpay SDK. Check your internet connection.');

          const orderRes = await fetch(`${API_BASE_URL}/api/platform-payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: planPrice, storeId: createdStore._id })
          });
          const orderData = await orderRes.json();
          if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

          const options = {
            key: keyData.razorpayKeyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Galibrand Cloud",
            description: `${selectedPlanObj.name} Plan Subscription`,
            order_id: orderData.id,
            handler: async function (paymentResponse) {
              setCreateStatus('Verifying payment...');
              const verifyRes = await fetch(`${API_BASE_URL}/api/platform-payments/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...paymentResponse, storeId: createdStore._id, planId: newStorePlan })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setCreateStatus('Payment successful! Store created.');
                setTimeout(() => window.location.reload(), 1500);
              } else {
                setCreateStatus('Payment verification failed. If money was deducted, please contact support.');
              }
            },
            modal: {
              ondismiss: async function() {
                setCreateStatus('Payment canceled. Cleaning up...');
                try {
                  await fetch(`${API_BASE_URL}/api/store/${createdStore._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                } catch (e) {
                  console.error("Cleanup failed", e);
                }
                setCreateStatus('Payment canceled. Store creation aborted.');
                setTimeout(() => {
                  closeForm();
                }, 1500);
              }
            },
            prefill: { name: newStoreName },
            theme: { color: "#76b900" }
          };

          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
          setCreateStatus('');
        }
      } else {
        setCreateStatus(`Error: ${data.message || 'Failed to create store'}`);
      }
    } catch (err) {
      setCreateStatus(`Error: ${err.message}`);
    }
  };

  const closeForm = () => {
    setIsCreatingStore(false);
    setCreateStatus('');
    setCurrentStep(1);
  };

  const handleRestoreStore = async (storeObjId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/store/${storeObjId}/restore`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Store restored successfully!', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(`Error: ${data.message}`, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateStore = () => {
    if (activeStores.length >= 1) {
      showToast(`Store limit reached! You can only create 1 store per account.`, 'error');
      return;
    }
    setIsCreatingStore(true);
  };

  const handlePrintQR = () => {
    const isExpired = currentStore.planExpiryDate && new Date(currentStore.planExpiryDate) < new Date();
    if (isExpired) {
      showToast('Your subscription has expired. Renew to download QR.', 'error');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to download the QR code.', 'error');
      return;
    }

    const storeUrl = currentStore.customDomain ? `https://${currentStore.customDomain}` : `https://${currentStore.subdomain}`;
    const mainQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`;

    const socialQrs = socialLinks.map(link => `
      <div style="text-align: center; margin: 10px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link.url)}" style="width: 80px; height: 80px;" />
        <p style="font-size: 10px; margin-top: 5px; font-weight: bold; text-transform: uppercase; color: #4b5563;">${link.platform}</p>
      </div>
    `).join('');

    const mapQr = currentStore.mapLocation ? `
      <div style="text-align: center; margin: 10px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentStore.mapLocation)}" style="width: 80px; height: 80px;" />
        <p style="font-size: 10px; margin-top: 5px; font-weight: bold; text-transform: uppercase; color: #4b5563;">Store Map</p>
      </div>
    ` : '';

    const phones = (currentStore.supportPhoneNumbers || []).join(', ');
    const contactInfo = (phones || currentStore.supportEmail) ? `
      <div style="margin-top: 20px; font-size: 14px; color: #555; border-top: 2px dashed #e5e7eb; padding-top: 20px;">
        <h3 style="font-size: 16px; color: #374151; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Contact Us</h3>
        ${phones ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phones}</p>` : ''}
        ${currentStore.supportEmail ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${currentStore.supportEmail}</p>` : ''}
      </div>
    ` : '';

    const html = `
      <html>
        <head>
          <title>${currentStore.storeName} - QR Code Poster</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
            .container { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 20mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; }
            .logo { max-width: 250px; max-height: 100px; margin-bottom: 20px; object-fit: contain; }
            .store-name { font-size: 36px; font-weight: 800; color: #111827; margin: 0 0 10px 0; }
            .qr-main-container { margin: 40px 0; padding: 20px; border: 4px solid #76b900; border-radius: 24px; background: #fff; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .qr-main { width: 350px; height: 350px; display: block; }
            .scan-text { font-size: 24px; font-weight: bold; color: #76b900; margin-top: 15px; text-transform: uppercase; letter-spacing: 2px; }
            .url-text { font-size: 18px; color: #4b5563; margin-top: 10px; font-weight: 600; }
            .bottom-section { width: 100%; margin-top: 30px; }
            .mini-qr-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div>
              ${currentStore.logo ? `<img src="${currentStore.logo}" class="logo" />` : ''}
              <h1 class="store-name">${currentStore.storeName}</h1>
              <p style="color: #6b7280; font-size: 20px; margin: 0;">Scan to visit our digital storefront!</p>
            </div>

            <div class="qr-main-container">
              <img src="${mainQrUrl}" class="qr-main" onload="window.mainQrLoaded = true;" onerror="window.mainQrLoaded = true;" />
              <div class="scan-text">Scan Me</div>
            </div>
            
            <div class="url-text">${storeUrl}</div>
            
            ${contactInfo}

            ${(socialQrs || mapQr) ? `
              <div class="bottom-section">
                <h3 style="font-size: 16px; color: #374151; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Connect With Us</h3>
                <div class="mini-qr-grid">
                  ${socialQrs}
                  ${mapQr}
                </div>
              </div>
            ` : ''}
          </div>
          <script>
            let attempts = 0;
            const checkReady = setInterval(() => {
              attempts++;
              if (window.mainQrLoaded || attempts > 20) {
                clearInterval(checkReady);
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              }
            }, 100);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleStoreNameChange = (e) => {
    const val = e.target.value;
    setNewStoreName(val);
    const slug = val.toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .substring(0, 30);
    setNewStoreSlug(slug);
  };

  const starterPlan = plans[0] || { _id: 'free', name: 'Starter', price: 0, limits: { maxProducts: 20 }, features: ['Up to 20 products', 'Basic shop themes', 'Standard subdomain hosting'] };
  const proPlan = plans[1] || { _id: 'pro', name: 'Pro', price: 999, limits: { maxProducts: 100 }, features: ['Up to 100 products', 'WhatsApp support integration', 'Custom store slug option'] };
  const premiumPlan = plans[2] || { _id: 'premium', name: 'Premium', price: 2999, limits: { maxProducts: 1000 }, features: ['Up to 1000 products', 'Dedicated subdomain & external domain support', 'Priority 24/7 client support'] };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Store">
    <div className="p-6 mx-auto mt-6">
      
      {/* Navigation Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button 
          type="button"
          onClick={() => setActiveTab('settings')} 
          className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Store Settings
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('social')} 
          className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'social' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Social Media Links
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('qrcode')} 
          className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'qrcode' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          QR Code
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('billing')} 
          className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'billing' ? 'bg-[#76b900] text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Billing History
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
      
      {/* Settings Tab Layout */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative">
            <div className="sticky top-0 z-20 bg-white pt-2 pb-4 mb-6 border-b border-slate-100 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.05)]">
              {status && (
                <div className={`p-4 mb-4 rounded-lg font-medium text-sm ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {status}
                </div>
              )}
              <div className="flex items-center gap-4">
                <button 
                  type="submit"
                  form="storeSettingsForm" 
                  className="px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-md shadow-green-100 whitespace-nowrap"
                >
                  Save Settings
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 hidden sm:block">Settings for {currentStore.storeName}</h2>
              </div>
            </div>

            <form id="storeSettingsForm" onSubmit={handleUpdateStore} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Store Name</label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Store Type</label>
            <select 
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition bg-white"
            >
              {storeTypes.length > 0 ? (
                storeTypes.map(cat => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))
              ) : (
                <option value="Kirana Stores">Kirana Stores (Default)</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Website Title (SEO)</label>
            <input 
              type="text" 
              value={websiteTitle}
              onChange={(e) => setWebsiteTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Logo URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'logo' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'logo' ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} disabled={uploadingField !== null} />
              </label>
            </div>
            {logo && <img src={logo} alt="Logo Preview" className="mt-3 h-12 object-contain" />}
            
            {uploadingField === 'logo' && (
              <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
                <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                  <span>Uploading Logo... {uploadProgress}%</span>
                  <div className="flex items-center gap-3">
                    <span>{uploadSpeed}</span>
                    <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Favicon URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={favicon}
                onChange={(e) => setFavicon(e.target.value)}
                placeholder="https://example.com/favicon.ico"
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'favicon' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'favicon' ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'favicon')} disabled={uploadingField !== null} />
              </label>
            </div>
            
            {uploadingField === 'favicon' && (
              <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fadeIn">
                <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                  <span>Uploading Favicon... {uploadProgress}%</span>
                  <div className="flex items-center gap-3">
                    <span>{uploadSpeed}</span>
                    <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700">Banner Images (Carousel)</label>
              <label className={`cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap ${uploadingField === 'banner' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingField === 'banner' ? 'Uploading...' : 'Upload Banners'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} disabled={uploadingField !== null} />
              </label>
            </div>
            {uploadingField === 'banner' && (
              <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center text-sm font-bold text-blue-800 mb-2">
                  <span>Uploading Banners... {uploadProgress}%</span>
                  <div className="flex items-center gap-3">
                    <span>{uploadSpeed}</span>
                    <button type="button" onClick={cancelUpload} className="px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold transition-colors">Cancel</button>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
              </div>
            )}
            
            <div className="space-y-3">
              {banner.map((url, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <img src={url} alt={`Banner ${idx + 1}`} className="h-16 w-32 object-cover rounded-lg border border-slate-200 shrink-0" />
                  <input 
                    type="text" 
                    value={url}
                    onChange={(e) => {
                      const newBanners = [...banner];
                      newBanners[idx] = e.target.value;
                      setBanner(newBanners);
                    }}
                    placeholder="https://example.com/banner.jpg"
                    className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
                  />
                  <button type="button" onClick={() => setBanner(prev => prev.filter((_, i) => i !== idx))} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold transition shrink-0 w-full sm:w-auto">
                    Remove
                  </button>
                </div>
              ))}
              {banner.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  No banners added. Upload images to create a carousel.
                </div>
              )}
            </div>
          </div>
          
          {/* Support & Location Section */}
          <div className="pt-6 mt-6 border-t border-slate-200 space-y-5">
            <h3 className="text-xl font-bold text-slate-800">Support & Location Details</h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Support Email</label>
              <input 
                type="email" 
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700">Support Phone Numbers</label>
                <button type="button" onClick={() => setSupportPhoneNumbers([...supportPhoneNumbers, ''])} className="px-3 py-1 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-100 transition">
                  + Add Number
                </button>
              </div>
              <div className="space-y-3">
                {supportPhoneNumbers.map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" value={phone} onChange={(e) => {
                        const newPhones = [...supportPhoneNumbers];
                        newPhones[idx] = e.target.value;
                        setSupportPhoneNumbers(newPhones);
                      }} placeholder="+91 9876543210" className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition" />
                    <button type="button" onClick={() => setSupportPhoneNumbers(prev => prev.filter((_, i) => i !== idx))} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold transition shrink-0">
                      Remove
                    </button>
                  </div>
                ))}
                {supportPhoneNumbers.length === 0 && <div className="text-sm text-slate-500 italic">No support numbers added.</div>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Store Address</label>
              <textarea value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="123 Store Street, City, State..." rows="3" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition resize-none" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Google Maps Embed Link</label>
              <input 
                type="url" 
                value={mapLocation}
                onChange={(e) => setMapLocation(e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none transition"
              />
              <p className="text-xs text-slate-500 mt-2">
                Go to Google Maps, find your location, click "Share", then "Embed a map", and copy the <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">src</code> URL from the iframe code.
              </p>
            </div>
          </div>

        </form>
      </div>

      {/* Right Column: Stores List & Recycle Bin */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Your Stores List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Your Stores</h2>
            <button onClick={handleOpenCreateStore} className="p-2 bg-slate-100 text-slate-600 hover:text-[#76b900] rounded-lg transition" title="Add New Store">
              <Plus size={18} />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {activeStores.map((s) => (
              <div key={s._id} className={`rounded-xl border-2 p-4 flex flex-col transition-all ${s.storeId === storeId ? 'border-[#76b900] bg-green-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                <div className="flex justify-between items-start mb-3">
                  {s.logo ? (
                    <img src={s.logo} alt={s.storeName} className="h-10 w-10 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 text-[#ff8a00] flex items-center justify-center text-lg font-bold shadow-inner">
                      {(s.storeName || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${s.status === 'active' || !s.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {(s.status || 'active').charAt(0).toUpperCase() + (s.status || 'active').slice(1)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1 truncate" title={s.storeName}>{s.storeName}</h3>
                
                {s.planExpiryDate && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${s.isTrialActive ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.isTrialActive ? 'Trial' : 'Premium'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      Exp: {new Date(s.planExpiryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {(s.customDomain || s.subdomain) && (
                  <a href={`https://${s.customDomain || s.subdomain}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline mb-3 truncate block">
                    {s.customDomain || s.subdomain}
                  </a>
                )}
                <button 
                  onClick={() => navigate(`/store/${s.storeId}`)} 
                  disabled={s.storeId === storeId}
                  className={`mt-auto w-full py-2 text-sm font-bold rounded-lg transition-all ${s.storeId === storeId ? 'bg-[#76b900] text-white cursor-not-allowed shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {s.storeId === storeId ? 'Managing' : 'Switch Store'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recycle Bin (Deleted Stores) */}
        {deletedStores.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Recycle Bin</h2>
            <div className="flex flex-col gap-4">
              {deletedStores.map((s) => {
                const deletionDate = new Date(s.deletedAt);
                const expiryDate = new Date(deletionDate);
                expiryDate.setDate(expiryDate.getDate() + 30);
                const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <div key={s._id} className="rounded-xl border-2 border-red-100 bg-red-50/30 p-4 flex flex-col transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="h-8 w-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center">
                        <Trash2 size={16} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-red-100 text-red-700">
                        Deleted
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1 truncate line-through" title={s.storeName}>{s.storeName}</h3>
                    <p className="text-[10px] font-medium text-red-500 mb-3">
                      Deletes in {daysLeft} day(s)
                    </p>
                    <button onClick={() => handleRestoreStore(s._id)} className="mt-auto w-full py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Social Media Links Manager */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Social Media Links</h2>
        <p className="text-sm text-slate-500 mb-6">Add your social media profiles. They will automatically appear in your storefront footer.</p>
        
        <form onSubmit={handleAddSocial} className="flex flex-col sm:flex-row gap-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <select 
            value={newPlatform} 
            onChange={(e) => setNewPlatform(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none bg-white font-medium text-slate-700"
          >
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Twitter">Twitter</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="Other">Other Link</option>
          </select>
          <input 
            type="url" 
            required
            placeholder="https://..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#76b900] outline-none"
          />
          <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition whitespace-nowrap">
            + Add Link
          </button>
        </form>
        {socialStatus && <p className="text-sm text-red-500 mb-4 font-medium">{socialStatus}</p>}

        <div className="space-y-3">
          {socialLinks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-xl">No social links added yet</div>
          ) : socialLinks.map(link => (
            <div key={link._id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition bg-white group">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{renderSocialIcon(link.platform)}</div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 text-sm">{link.platform}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-[200px] sm:max-w-xs">{link.url}</a>
                </div>
              </div>
              <button onClick={() => handleDeleteSocial(link._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* QR Code & Poster Card */}
      {activeTab === 'qrcode' && (!currentStore.planExpiryDate || new Date(currentStore.planExpiryDate) >= new Date()) && currentStore.status !== 'suspended' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col items-center text-center animate-fadeIn">
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Store QR Code</h2>
          <p className="text-sm text-slate-500 mb-6">Scan or download this QR code to easily share your digital storefront with customers.</p>
          
          <div className="p-4 border-4 border-[#76b900] rounded-3xl bg-white mb-6 shadow-sm inline-block relative group transition-transform hover:scale-105">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentStore.customDomain ? `https://${currentStore.customDomain}` : `https://${currentStore.subdomain}`)}`} 
              alt="Store QR Code" 
              className="w-48 h-48 object-contain"
            />
          </div>
          
          <p className="font-bold text-slate-700 mb-6 truncate max-w-full px-4 text-sm bg-slate-50 py-2 rounded-lg border border-slate-100">
            {currentStore.customDomain ? currentStore.customDomain : currentStore.subdomain}
          </p>

          <button 
            onClick={handlePrintQR} 
            className="mt-auto px-6 py-3 w-full bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download A4 Poster
          </button>
        </div>
      )}

      {/* Billing History */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Billing History</h2>
          <p className="text-sm text-slate-500 mb-6">View and download your past subscription invoices.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Invoice #</th>
                  <th className="p-4 font-bold">Plan</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {(!currentStore.billingHistory || currentStore.billingHistory.length === 0) ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium border-b border-slate-100">No billing history found.</td></tr>
                ) : (
                  [...currentStore.billingHistory].reverse().map((invoice, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-700">{new Date(invoice.date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-mono text-slate-500">{invoice.invoiceId}</td>
                      <td className="p-4 font-bold text-slate-800">{invoice.planName}</td>
                      <td className="p-4 font-bold text-green-600">₹{invoice.amount}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">Paid</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDownloadInvoice(invoice)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors">
                          <Download size={16} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
      </div>
    
    <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Modal Overlay for Store Creation */}
      {isCreatingStore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-fadeIn">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Create New Store</h3>
                  <p className="text-xs text-slate-500 font-medium">Launch your business in just two simple steps.</p>
                </div>
              </div>
              <button onClick={closeForm} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Horizontal Progress Stepper */}
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-green-600 text-white border-green-600' : 'bg-slate-200 text-slate-500 border-slate-200'}`}>1</div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= 1 ? 'text-green-600' : 'text-slate-400'}`}>Select Plan</span>
                </div>
                <div className={`w-16 h-0.5 rounded-full ${currentStep >= 2 ? 'bg-green-600' : 'bg-slate-200'}`} />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-green-600 text-white border-green-600' : 'bg-slate-200 text-slate-500 border-slate-200'}`}>2</div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= 2 ? 'text-green-600' : 'text-slate-400'}`}>Store Details & Payment</span>
                </div>
              </div>
            </div>

            {/* Two-Column Content Body */}
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN (45%) */}
              <div className="lg:col-span-5 space-y-6">
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800">Step 1: Choose Your Plan</h4>
                    <div className="space-y-4">
                      {[starterPlan, proPlan, premiumPlan].map((plan, idx) => {
                        const isSelected = newStorePlan === plan._id || (plans.length > idx && newStorePlan === plans[idx]._id);
                        const isPro = idx === 1;
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (plans.length > idx) setNewStorePlan(plans[idx]._id);
                              else setNewStorePlan(plan._id);
                            }}
                            className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 ${isSelected ? 'border-green-600 bg-green-50/20 ring-2 ring-green-100 shadow-xl scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg bg-white opacity-80'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                                {plan.name}
                                {isPro && <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>}
                              </div>
                              <input 
                                type="radio" 
                                name="planSelect" 
                                checked={isSelected}
                                onChange={() => {
                                  if (plans.length > idx) setNewStorePlan(plans[idx]._id);
                                  else setNewStorePlan(plan._id);
                                }}
                                className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                              />
                            </div>
                            <div className="flex items-baseline mb-3">
                              <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
                              <span className="text-xs text-slate-500 font-medium ml-1">/month</span>
                            </div>
                            <ul className="space-y-1.5">
                              {(plan.features || []).map((feat, fIdx) => (
                                <li key={fIdx} className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <CheckCircle size={12} className="text-green-600 shrink-0" />
                                  <span>{typeof feat === 'object' ? feat.name || feat.feature || JSON.stringify(feat) : feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold text-slate-800">Confirmed Plan Summary</h4>
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold text-slate-800 text-lg">
                          {plans.find(p => p._id === newStorePlan)?.name || 'Selected Plan'}
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xl text-slate-900">₹{plans.find(p => p._id === newStorePlan)?.price || 0}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">/month</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Includes 7 days free trial. Start date: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}</p>
                    </div>

                    {/* Choose Payment Method */}
                    {plans.find(p => p._id === newStorePlan)?.price > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800">Choose Payment Method</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            onClick={() => setPaymentMethod('razorpay')}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${paymentMethod === 'razorpay' ? 'border-green-600 bg-green-50/40 ring-1 ring-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                          >
                            <CreditCard size={20} className={paymentMethod === 'razorpay' ? 'text-green-600' : 'text-slate-500'} />
                            <span className="text-xs font-bold text-slate-700">Razorpay Pay</span>
                          </div>
                          <div 
                            onClick={() => setPaymentMethod('razorpay')}
                            className="p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer border-slate-200 opacity-60 bg-white"
                          >
                            <Wallet size={20} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-400">UPI / Wallets</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium text-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          Secure transaction powered by Razorpay. Supports Credit/Debit Cards, UPI, Net Banking, and major Wallets.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (55%) */}
              <div className="lg:col-span-7 flex flex-col h-full">
                {currentStep === 1 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
                      <Package size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">Select a Subscription Tier</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-6">Choose a plan that fits your business catalog capacity. You can change your plan or cancel at any time.</p>
                    <div className="w-full space-y-3 text-left max-w-xs">
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>Zero setup fees, activate instantly.</span>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>Includes a 7-day risk-free free trial.</span>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-600">
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                        <span>SSL certificate and basic SEO ready.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-4 pr-1">
                    <h4 className="text-lg font-bold text-slate-800">Step 2: Store Details & Billing</h4>
                    
                    {createStatus && (
                      <div className={`p-4 rounded-xl text-xs font-semibold border ${createStatus.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {createStatus}
                      </div>
                    )}

                    {/* Row 1: Store Name & Subdomain */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Store Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={newStoreName} 
                          onChange={handleStoreNameChange}
                          placeholder="e.g. Fresh Veggies Mart" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                          required 
                          autoFocus 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Store Subdomain URL <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            value={newStoreSlug} 
                            onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="my-store" 
                            className="w-full h-11 pl-4 pr-32 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                            required 
                          />
                          <span className="absolute right-3 text-xs font-bold text-slate-400 select-none">.galibrand.cloud</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Contact Person & Business Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Contact Person <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <input 
                          type="text" 
                          value={contactPerson} 
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="John Doe" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Business Category / Store Type <span className="text-red-500">*</span></label>
                        <select 
                          value={newStoreType} 
                          onChange={(e) => setNewStoreType(e.target.value)} 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 bg-white transition" 
                          required
                        >
                          {storeTypes.length > 0 ? (
                            storeTypes.map(cat => (
                              <option key={cat._id} value={cat.name}>{cat.name}</option>
                            ))
                          ) : (
                            <option value="Kirana Stores">Kirana Stores</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Row 2.5: Assisted By EmpID (Verified Employee ID) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Assisted By (Employee ID) <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newStoreEmpId} 
                          onChange={(e) => { setNewStoreEmpId(e.target.value); setEmpName(''); }} 
                          placeholder="e.g. GBE0001" 
                          className="flex-1 h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                        <button 
                          type="button" 
                          onClick={handleVerifyEmpId} 
                          disabled={verifyingEmp || !newStoreEmpId} 
                          className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                          {verifyingEmp ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      {empName && (
                        <p className={`text-[10px] font-bold mt-1 ${empName.includes('Invalid') || empName.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                          {empName.includes('Invalid') || empName.includes('Error') ? empName : `Verified Agent: ${empName}`}
                        </p>
                      )}
                    </div>

                    {/* Row 3: Store Description (Meta) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Store Description <span className="text-slate-400 font-normal">(Meta SEO Description)</span></label>
                      <textarea 
                        value={newStoreMeta} 
                        onChange={(e) => setNewStoreMeta(e.target.value)} 
                        placeholder="Describe your shop..." 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 resize-none h-16 transition" 
                      />
                    </div>

                    {/* Row 4: Logo Upload visual area */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Store Logo</label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-green-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-green-50/10">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Drag & Drop Store Logo here</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG, SVG up to 2MB (Optional)</span>
                      </div>
                    </div>

                    {/* Row 5: Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Business Address</label>
                      <input 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Shop Street" 
                        className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                      />
                    </div>

                    {/* Row 6: City, State, Pincode */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">City</label>
                        <input 
                          type="text" 
                          value={city} 
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Mumbai" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">State</label>
                        <input 
                          type="text" 
                          value={stateName} 
                          onChange={(e) => setStateName(e.target.value)}
                          placeholder="MH" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Pincode</label>
                        <input 
                          type="text" 
                          value={pincode} 
                          onChange={(e) => setPincode(e.target.value)}
                          placeholder="400001" 
                          className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 transition" 
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Footer Control Panel */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
              {currentStep > 1 ? (
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(prev => prev - 1)} 
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  &larr; Back
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={closeForm} 
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}

              {currentStep === 1 ? (
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!newStorePlan} 
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm animate-fadeIn"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  form="createStoreForm"
                  disabled={!newStoreName || !newStoreSlug}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm animate-fadeIn"
                >
                  {plans.find(p => p._id === newStorePlan)?.price > 0 ? (
                    <>Proceed for Payment <ArrowRight size={16}/></>
                  ) : (
                    <>Confirm & Create <CheckCircle size={16} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    {/* Custom Toast Notification */}
    {toast && (
      <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#76b900] text-white'}`}>
        <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
        {toast.message}
      </div>
    )}
    </AdminLayout>
  );
};

export default ManageStore;
