import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import AdminLayout from '../components/AdminLayout';
import { Link as LinkIcon, Trash2, Plus, CreditCard, Download, Store, Package, Wallet, Building, MapPin, Upload, ArrowRight, CheckCircle, X, ChevronRight, ChevronLeft, Printer, Copy, ExternalLink, Search, QrCode } from 'lucide-react';

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
  
  // Restaurant & Dining Tables configuration
  const [isRestaurant, setIsRestaurant] = useState(Boolean(currentStore.isRestaurant || (currentStore.storeType && /restaurant|cafe|food|dine|bistro|dhaba|eatery/i.test(currentStore.storeType))));
  const [tablesList, setTablesList] = useState(
    Array.isArray(currentStore.tables) && currentStore.tables.length > 0 
      ? currentStore.tables 
      : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
  );
  const [tableCountPreset, setTableCountPreset] = useState("10");
  const [showTableQrModal, setShowTableQrModal] = useState(false);
  const [tableFilterSearch, setTableFilterSearch] = useState('');
  const [copiedTable, setCopiedTable] = useState(null);

  const getStoreBaseUrl = () => {
    if (currentStore.customDomain) return `https://${currentStore.customDomain}`;
    if (currentStore.subdomain) {
      if (currentStore.subdomain.includes('.')) {
        return `https://${currentStore.subdomain}`;
      }
      return `https://${currentStore.subdomain}.galibrand.cloud`;
    }
    return window.location.origin;
  };

  const getTableUrl = (tableNo) => {
    const base = getStoreBaseUrl();
    return `${base}/category/all?table=${encodeURIComponent(tableNo)}`;
  };

  const handleCopyTableLink = (tableNo) => {
    const url = getTableUrl(tableNo);
    navigator.clipboard.writeText(url);
    setCopiedTable(tableNo);
    showToast(`Copied Table ${tableNo} link to clipboard!`, 'success');
    setTimeout(() => setCopiedTable(null), 3000);
  };

  const handleDownloadTableQr = async (tableNo) => {
    const url = getTableUrl(tableNo);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${(currentStore.storeName || 'Store').replace(/\s+/g, '_')}_Table_${tableNo}_QR.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      showToast(`Downloaded Table ${tableNo} QR Code!`, 'success');
    } catch (e) {
      window.open(qrUrl, '_blank');
    }
  };

  const handlePrintSingleTableStandee = (tableNo) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Please allow popups to print table standee.', 'error');
      return;
    }

    const url = getTableUrl(tableNo);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(url)}`;
    const storeLogo = currentStore.logo ? `<img src="${currentStore.logo}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 12px;" />` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table ${tableNo} Standee - ${currentStore.storeName}</title>
        <style>
          @page { size: A5 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
            text-align: center;
            -webkit-print-color-adjust: exact;
          }
          .card {
            width: 100%;
            max-width: 380px;
            padding: 30px 24px;
            border: 3px solid #f97316;
            border-radius: 28px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            box-sizing: border-box;
          }
          .table-badge {
            background: #f97316;
            color: #ffffff;
            font-size: 26px;
            font-weight: 900;
            padding: 8px 24px;
            border-radius: 100px;
            display: inline-block;
            margin-bottom: 18px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .qr-img {
            width: 240px;
            height: 240px;
            display: block;
            margin: 15px auto;
            border: 8px solid #f8fafc;
            border-radius: 16px;
          }
          h2 {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 8px 0 4px;
          }
          p {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 12px;
            line-height: 1.4;
          }
          .steps {
            background: #fff7ed;
            border: 1px dashed #fdba74;
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 12px;
            color: #9a3412;
            font-weight: bold;
            margin-top: 15px;
          }
          .url-hint {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 12px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="card">
          ${storeLogo}
          <div class="table-badge">TABLE ${tableNo}</div>
          <h2>SCAN TO ORDER</h2>
          <p>Point phone camera to view our digital menu & place your order directly!</p>
          <img src="${qrUrl}" class="qr-img" />
          <div class="steps">
            1. Scan QR &bull; 2. Add to Cart &bull; 3. Checkout
          </div>
          <div class="url-hint">${url}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  const handlePrintAllTableCards = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Please allow popups to print table standees.', 'error');
      return;
    }

    const storeLogo = currentStore.logo ? `<img src="${currentStore.logo}" style="max-height: 38px; max-width: 140px; object-fit: contain; margin-bottom: 6px;" />` : '';

    const cardsHtml = tablesList.map(t => {
      const url = getTableUrl(t);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      return `
        <div class="standee-card">
          ${storeLogo}
          <div class="table-badge">TABLE ${t}</div>
          <div class="scan-title">SCAN TO ORDER</div>
          <p class="scan-desc">Scan to view digital menu & order</p>
          <img src="${qrUrl}" class="qr-img" />
          <div class="order-steps">
            1. Scan &bull; 2. Choose &bull; 3. Order
          </div>
          <div class="table-url">${url}</div>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentStore.storeName} - All Table Standees</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 15mm;
            box-sizing: border-box;
          }
          .standee-card {
            border: 2px dashed #ea580c;
            border-radius: 20px;
            padding: 20px 16px;
            text-align: center;
            background: #ffffff;
            box-sizing: border-box;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .table-badge {
            background: #ea580c;
            color: #ffffff;
            font-size: 20px;
            font-weight: 900;
            padding: 6px 18px;
            border-radius: 100px;
            margin-bottom: 8px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .scan-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .scan-desc {
            font-size: 11px;
            color: #64748b;
            margin: 0 0 8px;
          }
          .qr-img {
            width: 170px;
            height: 170px;
            display: block;
            margin: 0 auto;
            border: 4px solid #f8fafc;
            border-radius: 12px;
          }
          .order-steps {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 11px;
            color: #c2410c;
            font-weight: 800;
            margin-top: 8px;
          }
          .table-url {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 6px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${cardsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  const handleTableCountChange = (val) => {
    setTableCountPreset(val);
    if (val !== 'custom') {
      const count = parseInt(val) || 10;
      setTablesList(Array.from({ length: count }, (_, i) => String(i + 1)));
    }
  };
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
  const [subdomainStatus, setSubdomainStatus] = useState('idle');
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

  const isCreatingStoreLoader = createStatus && (
    createStatus.startsWith('Creating store') || 
    createStatus.startsWith('Verifying payment') || 
    createStatus.startsWith('Initializing') || 
    createStatus.startsWith('Processing') || 
    createStatus.startsWith('Waiting')
  );

  // Update form fields if the user switches to managing a different store
  useEffect(() => {
    setStoreName(currentStore.storeName || '');
    const rawType = currentStore.storeType || '';
    if (rawType && storeTypes.length > 0) {
      const match = storeTypes.find(st => st.name.toLowerCase() === rawType.toLowerCase());
      setStoreType(match ? match.name : rawType);
    } else {
      setStoreType(rawType);
    }
    setWebsiteTitle(currentStore.websiteTitle || '');
    setLogo(currentStore.logo || '');
    setFavicon(currentStore.favicon || '');
    setBanner(Array.isArray(currentStore.banner) ? currentStore.banner : (currentStore.banner ? [currentStore.banner] : []));
    setSupportPhoneNumbers(Array.isArray(currentStore.supportPhoneNumbers) ? currentStore.supportPhoneNumbers : []);
    setSupportEmail(currentStore.supportEmail || '');
    setLocationAddress(currentStore.locationAddress || '');
    setMapLocation(currentStore.mapLocation || '');
    setStatus('');
    setIsRestaurant(Boolean(currentStore.isRestaurant || (currentStore.storeType && /restaurant|cafe|food|dine|bistro|dhaba|eatery/i.test(currentStore.storeType))));
    if (Array.isArray(currentStore.tables) && currentStore.tables.length > 0) {
      setTablesList(currentStore.tables);
      if ([5, 10, 15, 20, 25, 30, 50].includes(currentStore.tables.length)) {
        setTableCountPreset(String(currentStore.tables.length));
      } else {
        setTableCountPreset('custom');
      }
    }
  }, [storeId, currentStore.storeName, currentStore.storeType, currentStore.websiteTitle, currentStore.logo, currentStore.favicon, currentStore.banner, currentStore.supportPhoneNumbers, currentStore.supportEmail, currentStore.locationAddress, currentStore.mapLocation, storeTypes]);

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

  useEffect(() => {
    if (!newStoreSlug) {
      setSubdomainStatus('idle');
      return;
    }
    if (newStoreSlug.length < 3) {
      setSubdomainStatus('invalid');
      return;
    }
    setSubdomainStatus('checking');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/store/${newStoreSlug}`);
        if (res.status === 404) {
          setSubdomainStatus('available');
        } else if (res.status === 200) {
          setSubdomainStatus('taken');
        } else {
          setSubdomainStatus('idle');
        }
      } catch (err) {
        setSubdomainStatus('idle');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [newStoreSlug]);

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
          mapLocation,
          tables: tablesList,
          isRestaurant
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
    xhr.withCredentials = true;
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    if (token && token !== 'dummy-token') {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
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
    setCreateStatus('Processing...');

    const selectedPlanObj = plans.find(p => p._id === newStorePlan);
    const planPrice = selectedPlanObj ? selectedPlanObj.price : 0;

    // Pre-check subdomain slug availability
    try {
      const checkSlugRes = await fetch(`${API_BASE_URL}/api/store/${newStoreSlug}`);
      if (checkSlugRes.status === 200) {
        setCreateStatus('Error: Store Subdomain URL is already taken. Please choose another.');
        return;
      }
    } catch (err) {
      console.error('Slug verification failed', err);
    }

    try {
      if (planPrice === 0) {
        // Free plan: Create store immediately
        setCreateStatus('Creating store...');
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
          setCreateStatus('Store created successfully!');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setCreateStatus(`Error: ${data.message || 'Failed to create store'}`);
        }
        return;
      }

      // Paid plan: Load Razorpay, create order, check out, and then create store & verify payment
      setCreateStatus('Initializing payment...');
      const keyRes = await fetch(`${API_BASE_URL}/api/platform-payments/public-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const keyData = await keyRes.json();
      if (!keyData.razorpayEnabled) {
        return setCreateStatus('Error: Platform payments are currently disabled. Cannot purchase paid plans.');
      }

      const isLoaded = await loadRazorpay();
      if (!isLoaded) return setCreateStatus('Error: Failed to load Razorpay SDK. Check your internet connection.');

      const orderRes = await fetch(`${API_BASE_URL}/api/platform-payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: planPrice })
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
          setCreateStatus('Creating store...');
          try {
            const storeRes = await fetch(`${API_BASE_URL}/api/store`, {
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

            const storeData = await storeRes.json();
            if (!storeRes.ok) {
              setCreateStatus(`Error: ${storeData.message || 'Failed to create store after payment'}`);
              return;
            }

            const createdStore = storeData.store;

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
          } catch (createErr) {
            setCreateStatus(`Error during store creation: ${createErr.message}`);
          }
        },
        modal: {
          ondismiss: function() {
            setCreateStatus('Payment canceled.');
            setTimeout(() => setCreateStatus(''), 3000);
          }
        },
        theme: { color: "#16a34a" }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      setCreateStatus('Waiting for payment confirmation...');
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
          Store QR Code
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('table-qr')} 
          className={`px-6 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'table-qr' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <QrCode size={16} />
          <span>Table QR Codes</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'table-qr' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700'}`}>
            {tablesList.length}
          </span>
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
              {storeType && !storeTypes.some(cat => cat.name.toLowerCase() === storeType.toLowerCase()) && (
                <option value={storeType}>{storeType}</option>
              )}
              {storeTypes.length > 0 ? (
                storeTypes.map(cat => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))
              ) : (
                <option value={storeType || "Kirana Stores"}>{storeType || "Kirana Stores (Default)"}</option>
              )}
            </select>
          </div>

          {/* Restaurant & Dining Table Settings */}
          <div className="p-5 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border-2 border-orange-200/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">Restaurant & Cafe Dining Setup</h3>
                  <p className="text-xs text-slate-500 font-medium">Configure tables for QR code ordering, dine-in customers, and counter sales</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isRestaurant} 
                  onChange={(e) => setIsRestaurant(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#76b900]"></div>
              </label>
            </div>

            {/* Always visible Action Button to View/Generate Table QR Codes */}
            <div className="p-4 bg-white border-2 border-orange-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div>
                <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <QrCode size={16} className="text-orange-600" />
                  <span>Table-wise QR Codes ({tablesList.length} Tables Active)</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customers scan these table QR codes to view the menu and place dine-in orders automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRestaurant(true);
                  setActiveTab('table-qr');
                }}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-orange-600/25 transition cursor-pointer"
              >
                <QrCode size={16} />
                <span>View & Print Table QR Codes</span>
              </button>
            </div>

            {isRestaurant && (
              <div className="space-y-4 pt-2 border-t border-orange-100 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      How Many Tables in your Store / Cafe?
                    </label>
                    <select
                      value={tableCountPreset}
                      onChange={(e) => handleTableCountChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none bg-white font-extrabold text-slate-800"
                    >
                      <option value="5">5 Tables (1 - 5)</option>
                      <option value="10">10 Tables (1 - 10)</option>
                      <option value="15">15 Tables (1 - 15)</option>
                      <option value="20">20 Tables (1 - 20)</option>
                      <option value="25">25 Tables (1 - 25)</option>
                      <option value="30">30 Tables (1 - 30)</option>
                      <option value="50">50 Tables (1 - 50)</option>
                      <option value="custom">Custom Tables Count / List</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Total Active Tables Count: <span className="text-orange-600 font-extrabold">{tablesList.length}</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={tablesList.length}
                      onChange={(e) => {
                        const count = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                        const newTables = Array.from({ length: count }, (_, i) => String(i + 1));
                        setTablesList(newTables);
                        setTableCountPreset('custom');
                      }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-extrabold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Table Numbers List (Editable / Custom Names, e.g. 1, 2, 3, VIP-1, Patio-1)
                  </label>
                  <input
                    type="text"
                    value={tablesList.join(', ')}
                    onChange={(e) => {
                      const split = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setTablesList(split);
                      setTableCountPreset('custom');
                    }}
                    placeholder="1, 2, 3, 4, 5..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {tablesList.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-extrabold text-xs border border-orange-200">
                      Table {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

          <div className="mt-8 w-full pt-6 border-t border-slate-200 flex flex-col items-center">
            <h3 className="font-extrabold text-base text-slate-800 mb-1">Looking for Dining Table QR Codes?</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-md">Generate individual QR codes for Table 1 to Table {tablesList.length} so restaurant customers can scan from their table and order.</p>
            <button
              type="button"
              onClick={() => setActiveTab('table-qr')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <QrCode size={16} />
              <span>Go to Table QR Codes ({tablesList.length} Tables) &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* Table-wise QR Codes Tab View */}
      {activeTab === 'table-qr' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fadeIn space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-500/20">
                <QrCode size={26} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800">
                  Table QR Codes for Contactless Ordering
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {currentStore.storeName} &bull; {tablesList.length} Active Tables &bull; Base: <span className="font-mono text-slate-700">{getStoreBaseUrl()}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePrintAllTableCards}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-orange-600/20 transition cursor-pointer"
              >
                <Printer size={16} />
                <span>Print All Table Standees</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Configure Tables Count
              </button>
            </div>
          </div>

          {/* Search Filter Toolbar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search table number (e.g. 1, 2, VIP)..."
                value={tableFilterSearch}
                onChange={(e) => setTableFilterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-orange-500 shadow-xs"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Showing {tablesList.filter(t => !tableFilterSearch.trim() || t.toLowerCase().includes(tableFilterSearch.toLowerCase())).length} of {tablesList.length} tables
            </div>
          </div>

          {/* Table Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tablesList
              .filter(t => !tableFilterSearch.trim() || t.toLowerCase().includes(tableFilterSearch.toLowerCase()))
              .map(t => {
                const tableUrl = getTableUrl(t);
                const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
                const isCopied = copiedTable === t;

                return (
                  <div
                    key={t}
                    className="bg-white rounded-2xl border-2 border-orange-100 hover:border-orange-400 p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3.5 py-1 rounded-full bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                        TABLE {t}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTableLink(t)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Copy Direct Link"
                      >
                        <Copy size={13} />
                        <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl mb-3 flex items-center justify-center">
                      <img
                        src={qrImgUrl}
                        alt={`Table ${t} QR`}
                        className="w-36 h-36 object-contain rounded-lg border border-slate-200 bg-white p-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-slate-100/80 font-mono text-[10px] text-slate-600 truncate select-all" title={tableUrl}>
                        {tableUrl}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadTableQr(t)}
                          className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Download QR Image"
                        >
                          <Download size={12} />
                          <span>QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSingleTableStandee(t)}
                          className="py-1.5 px-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Print Single Standee"
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>
                        <a
                          href={tableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center gap-1 transition text-center"
                          title="Test Order Flow"
                        >
                          <ExternalLink size={12} />
                          <span>Test</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
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

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {isCreatingStoreLoader ? (
                <div className="flex flex-col items-center justify-center py-12 px-8 text-center animate-fadeIn">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin mb-4"></div>
                  <h4 className="font-bold text-slate-800 text-lg mb-1">{createStatus}</h4>
                  <p className="text-xs text-slate-400">Please do not close this window or refresh the page.</p>
                </div>
              ) : currentStep === 1 ? (
                /* STEP 1: Choose Your Plan (Full Width, side-by-side) */
                <div className="space-y-6 w-full">
                  <div className="text-center max-w-xl mx-auto mb-6">
                    <h4 className="text-lg font-bold text-slate-800">Select a Subscription Tier</h4>
                    <p className="text-xs text-slate-500">Choose a plan that fits your business catalog capacity. You can change your plan or cancel at any time.</p>
                  </div>
                  
                  {plans.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-bold animate-pulse">Loading plans...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                      {plans.map((plan, idx) => {
                        const isSelected = newStorePlan === plan._id;
                        const isPro = plan.popular || plan.name === 'Pro';
                        return (
                          <div 
                            key={plan._id}
                            onClick={() => setNewStorePlan(plan._id)}
                            className={`rounded-2xl border p-5 cursor-pointer flex flex-col justify-between transition-all duration-300 ${isSelected ? 'border-green-600 bg-green-50/20 ring-2 ring-green-100 shadow-xl scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg bg-white opacity-80'}`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                                  {plan.name}
                                  {isPro && <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>}
                                </div>
                                <input 
                                  type="radio" 
                                  name="planSelect" 
                                  checked={isSelected}
                                  onChange={() => setNewStorePlan(plan._id)}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                                />
                              </div>
                              {plan.description && <p className="text-[10px] text-slate-400 italic mb-2">"{plan.description}"</p>}
                              <div className="flex items-baseline mb-3">
                                <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
                                <span className="text-xs text-slate-500 font-medium ml-1">/month</span>
                              </div>
                              
                              <ul className="space-y-1.5 my-3 text-left border-t border-slate-100 pt-3">
                                <li className="text-xs text-slate-600 flex items-center gap-1.5">
                                  <CheckCircle size={12} className="text-green-600 shrink-0" />
                                  <span>Up to {plan.limits?.maxProducts || 0} Products</span>
                                </li>
                                <li className="text-xs text-slate-600 flex items-center gap-1.5">
                                  <CheckCircle size={12} className="text-green-600 shrink-0" />
                                  <span>{plan.limits?.storageLimit ? (plan.limits.storageLimit >= 1000 ? `${plan.limits.storageLimit / 1000}GB` : `${plan.limits.storageLimit}MB`) : '500MB'} Storage</span>
                                </li>
                                {(plan.features || []).map((feat, fIdx) => {
                                  const featName = typeof feat === 'object' ? feat.name || feat.feature : feat;
                                  if (!featName || typeof featName !== 'string' || featName.trim() === '') return null;
                                  return (
                                    <li key={fIdx} className="text-xs text-slate-500 flex items-center gap-1.5">
                                      <CheckCircle size={12} className="text-green-600 shrink-0" />
                                      <span>{featName}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 2: Two-Column Form and Payment checkout details */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                  {/* LEFT COLUMN: Summary & Payment (45%) */}
                  <div className="lg:col-span-5 space-y-6">
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

                  {/* RIGHT COLUMN: Store Details Form (55%) */}
                  <div className="lg:col-span-7 flex flex-col h-full">
                    <form id="createStoreForm" onSubmit={handleCreateStore} className="space-y-4 pr-1">
                      <h4 className="text-lg font-bold text-slate-800">Step 2: Store Details & Billing</h4>
                      
                      {createStatus && !isCreatingStoreLoader && (
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
                          {subdomainStatus === 'checking' && <p className="text-[10px] text-slate-400 font-bold mt-1 animate-pulse">Checking availability...</p>}
                          {subdomainStatus === 'available' && <p className="text-[10px] text-green-600 font-bold mt-1">✓ Subdomain is available!</p>}
                          {subdomainStatus === 'taken' && <p className="text-[10px] text-red-500 font-bold mt-1">✗ Subdomain is already taken.</p>}
                          {subdomainStatus === 'invalid' && <p className="text-[10px] text-amber-500 font-bold mt-1">⚠ Subdomain must be at least 3 characters.</p>}
                        </div>
                      </div>

                      {/* Business Category / Store Type */}
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

                      {/* Assisted By EmpID */}
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

                      {/* Store Description */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Store Description <span className="text-slate-400 font-normal">(Meta SEO Description)</span></label>
                        <textarea 
                          value={newStoreMeta} 
                          onChange={(e) => setNewStoreMeta(e.target.value)} 
                          placeholder="Describe your shop..." 
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-700 resize-none h-16 transition" 
                        />
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Control Panel */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl">
              {isCreatingStoreLoader ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
                  Processing your request...
                </div>
              ) : (
                <>
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
                      disabled={!newStoreName || !newStoreSlug || subdomainStatus === 'taken' || subdomainStatus === 'checking' || subdomainStatus === 'invalid'}
                      className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm animate-fadeIn"
                    >
                      {plans.find(p => p._id === newStorePlan)?.price > 0 ? (
                        <>Proceed for Payment <ArrowRight size={16}/></>
                      ) : (
                        <>Confirm & Create <CheckCircle size={16} /></>
                      )}
                    </button>
                  )}
                </>
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
