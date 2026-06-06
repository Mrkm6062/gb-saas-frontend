import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Link as LinkIcon, Trash2, Plus, CreditCard } from 'lucide-react';

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
  const [newStoreCategory, setNewStoreCategory] = useState('Kirana Stores');
  const [newStoreMeta, setNewStoreMeta] = useState('');
  const [plans, setPlans] = useState([]);
  const [newStorePlan, setNewStorePlan] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [createStatus, setCreateStatus] = useState('');
  const [toast, setToast] = useState(null);

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(Array.isArray(currentStore.banner) ? currentStore.banner : (currentStore.banner ? [currentStore.banner] : []));
    setSupportPhoneNumbers(Array.isArray(currentStore.supportPhoneNumbers) ? currentStore.supportPhoneNumbers : []);
    setSupportEmail(currentStore.supportEmail || '');
    setLocationAddress(currentStore.locationAddress || '');
    setMapLocation(currentStore.mapLocation || '');
    setStatus('');
  }, [storeId, currentStore.storeName, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner, currentStore.supportPhoneNumbers, currentStore.supportEmail, currentStore.locationAddress, currentStore.mapLocation]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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

  const fetchSocialLinks = async () => {
    if (!currentStore._id) return;
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      
      const response = await fetch(`${API_BASE_URL}/api/store/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName,
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

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const res = await fetch(`${API_BASE_URL}/api/social-media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSocialLinks();
    } catch (err) {
      console.error(err);
    }
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

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
          category: newStoreCategory,
          metaDescription: newStoreMeta,
          planId: newStorePlan
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
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

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Store">
    <div className="p-6 mx-auto mt-6">
      
      {/* Your Stores List */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Your Stores</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {activeStores.map((s) => (
            <div key={s._id} className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col transition-all ${s.storeId === storeId ? 'border-[#76b900] ring-4 ring-green-50' : 'border-slate-100 hover:border-slate-300'}`}>
              <div className="flex justify-between items-start mb-4">
                {s.logo ? (
                  <img src={s.logo} alt={s.storeName} className="h-12 w-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-[#ff8a00] flex items-center justify-center text-xl font-bold shadow-inner">
                    {(s.storeName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${s.status === 'active' || !s.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {(s.status || 'active').charAt(0).toUpperCase() + (s.status || 'active').slice(1)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 truncate" title={s.storeName}>{s.storeName}</h3>
              
              {s.planExpiryDate && (
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${s.isTrialActive ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {s.isTrialActive ? 'Trial' : 'Premium'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Expires: {new Date(s.planExpiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {(s.customDomain || s.subdomain) && (
                <a href={`https://${s.customDomain || s.subdomain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline mb-5 truncate block">
                  {s.customDomain || s.subdomain}
                </a>
              )}
              <button 
                onClick={() => navigate(`/store/${s.storeId}`)} 
                disabled={s.storeId === storeId}
                className={`mt-auto w-full py-2.5 font-bold rounded-xl transition-all ${s.storeId === storeId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700 hover:bg-[#76b900] hover:text-white'}`}
              >
                {s.storeId === storeId ? 'Currently Managing' : 'Manage Store'}
              </button>
            </div>
          ))}
          
        </div>
      </div>

      {/* Recycle Bin (Deleted Stores) */}
      {deletedStores.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Recycle Bin</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
            {deletedStores.map((s) => {
              const deletionDate = new Date(s.deletedAt);
              const expiryDate = new Date(deletionDate);
              expiryDate.setDate(expiryDate.getDate() + 30);
              const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

              return (
                <div key={s._id} className="bg-white rounded-2xl shadow-sm border-2 border-red-100 p-6 flex flex-col transition-all opacity-80 hover:opacity-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-xl bg-red-50 text-red-400 flex items-center justify-center">
                      <Trash2 size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-100 text-red-700">
                      Deleted
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1 truncate line-through" title={s.storeName}>{s.storeName}</h3>
                  <p className="text-sm font-medium text-red-500 mb-5">
                    Permanently deleting in {daysLeft} day(s)
                  </p>
                  <button onClick={() => handleRestoreStore(s._id)} className="mt-auto w-full py-2.5 font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                    Restore Store
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Settings for {currentStore.storeName}</h2>
        
        {status && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {status}
          </div>
        )}

        <form onSubmit={handleUpdateStore} className="space-y-5">
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

          <button 
            type="submit" 
            className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition w-full mt-4 shadow-lg shadow-green-100"
          >
            Save Settings
          </button>
        </form>
      </div>

      {/* Social Media Links Manager */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
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

      {/* QR Code & Poster Card */}
      {(!currentStore.planExpiryDate || new Date(currentStore.planExpiryDate) >= new Date()) && currentStore.status !== 'suspended' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col items-center text-center">
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

      </div>
      </div>
    
    {/* Modal Overlay for Store Creation */}
    {isCreatingStore && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-2xl font-extrabold text-slate-800">Launch New Store</h3>
            <button onClick={closeForm} className="text-slate-400 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stepper Header */}
          <div className="px-8 pt-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
              <div className="absolute left-0 top-1/2 h-1 bg-[#76b900] -z-10 transform -translate-y-1/2 transition-all duration-500" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
              
              {[1, 2, 3].map(step => (
                <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep >= step ? 'bg-[#76b900] border-[#76b900] text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                  {step}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">
              <span>Details</span>
              <span>Plan</span>
              <span>Payment</span>
            </div>
          </div>

          {/* Modal Body & Form */}
          <div className="p-8 overflow-y-auto flex-1">
            {createStatus && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${createStatus.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {createStatus}
              </div>
            )}
            <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-6">
              
              {/* STEP 1: Store Details */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Store Name <span className="text-red-500">*</span></label>
                    <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. Fresh Veggies Mart" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900" required autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Store Category <span className="text-red-500">*</span></label>
                    <select value={newStoreCategory} onChange={(e) => setNewStoreCategory(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 bg-white" required>
                      {["Vegetable Shop", "Bakery Shop", "Cafe Shop", "Kirana Stores", "Cake Shop", "Clothes Shop", "Multi-Ecommerce Shop", "Education Webapp", "Nasta Corner", "Appointment&Contact Webapp"].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Meta Description</label>
                    <textarea value={newStoreMeta} onChange={(e) => setNewStoreMeta(e.target.value)} placeholder="Brief description for SEO..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#76b900] outline-none transition text-slate-900 resize-none h-24" />
                  </div>
                </div>
              )}

              {/* STEP 2: Select Plan */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Select a Subscription Plan <span className="text-red-500">*</span></p>
                  {plans.length === 0 ? (
                    <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">No plans configured. Please contact support.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {plans.map(plan => (
                        <label key={plan._id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${newStorePlan === plan._id ? 'border-[#76b900] bg-green-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                          <div className="flex items-center gap-4">
                            <input type="radio" name="planSelection" value={plan._id} checked={newStorePlan === plan._id} onChange={() => setNewStorePlan(plan._id)} className="w-5 h-5 text-[#76b900] focus:ring-[#76b900] cursor-pointer" />
                            <div>
                              <div className="font-bold text-slate-800 text-lg">{plan.name}</div>
                              <div className="text-sm text-slate-500">Up to {plan.features?.maxProducts || 0} products</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-xl text-slate-900">₹{plan.price}</div>
                            <div className="text-xs text-slate-500 font-medium">/month</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Payment Checkout Placeholder */}
              {currentStep === 3 && (
                <div className="text-center py-6 animate-fadeIn">
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard size={40} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-800 mb-2">Complete Payment</h4>
                  <p className="text-slate-500 mb-6">You have selected the <span className="font-bold text-slate-700">{plans.find(p => p._id === newStorePlan)?.name}</span> plan for <span className="font-bold text-slate-700">₹{plans.find(p => p._id === newStorePlan)?.price}/mo</span>.</p>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mb-4">
                    * Payment gateway integration placeholder. Clicking "Confirm & Create" will activate your store immediately.
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
            {currentStep > 1 ? (
              <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                &larr; Back
              </button>
            ) : (
              <button type="button" onClick={closeForm} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                Cancel
              </button>
            )}
            
            {currentStep < 3 ? (
              <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} disabled={(currentStep === 1 && !newStoreName) || (currentStep === 2 && !newStorePlan)} className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Next Step &rarr;
              </button>
            ) : (
              <button type="submit" form="createStoreForm" className="px-8 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-lg shadow-green-100">
                Confirm & Create
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
