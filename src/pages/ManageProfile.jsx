import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { User, Briefcase, Mail, Phone, Calendar, MapPin, Shield, FileText, Upload, Save, CheckCircle, AlertTriangle } from 'lucide-react';

const ManageProfile = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  const [profile, setProfile] = useState({
    fullName: '',
    dob: '',
    mobile: '',
    email: '',
    businessAddress: '',
    gstNumber: '',
    panNumber: '',
    cinNumber: '',
    profilePicture: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });

  

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-store-id': currentStore._id
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Format date for the input type="date"
          if (data.dob) {
            data.dob = new Date(data.dob).toISOString().split('T')[0];
          }
          setProfile({
            fullName: data.fullName || '',
            dob: data.dob || '',
            mobile: data.mobile || '',
            email: data.email || '',
            businessAddress: data.businessAddress || '',
            gstNumber: data.gstNumber || '',
            panNumber: data.panNumber || '',
            cinNumber: data.cinNumber || '',
            profilePicture: data.profilePicture || ''
          });
        } else {
          showStatus('Failed to load profile details.', 'error');
        }
      } catch (err) {
        showStatus('Network error while loading profile.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (currentStore._id) {
      fetchProfile();
    }
  }, [currentStore._id, token]);

  const showStatus = (text, type) => {
    setStatus({ text, type });
    setTimeout(() => {
      setStatus({ text: '', type: '' });
    }, 4000);
  };

  // Profile Picture Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('storeId', currentStore._id);
    uploadData.append('type', 'logo');
    uploadData.append('images', file);

    setUploading(true);
    setStatus({ text: 'Uploading profile picture...', type: 'info' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.urls && data.urls.length > 0) {
          setProfile(prev => ({ ...prev, profilePicture: data.urls[0] }));
          showStatus('Profile picture uploaded successfully!', 'success');
        } else if (data.images && data.images.length > 0) {
          // Fallback if returned object matches the images schema
          setProfile(prev => ({ ...prev, profilePicture: data.images[0].url || data.images[0] }));
          showStatus('Profile picture uploaded successfully!', 'success');
        } else {
          showStatus('Failed to retrieve uploaded image URL.', 'error');
        }
      } else {
        const errData = await response.json();
        showStatus(errData.message || 'Failed to upload profile picture.', 'error');
      }
    } catch (err) {
      showStatus('Network error while uploading profile picture.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Submit Profile Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ text: 'Saving profile details...', type: 'info' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-store-id': currentStore._id
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        showStatus('Business & owner profile updated successfully!', 'success');
      } else {
        const errData = await response.json();
        showStatus(errData.message || 'Failed to update profile details.', 'error');
      }
    } catch (err) {
      showStatus('Network error while saving profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Manage Profile">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Status Alerts */}
        {status.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition-all duration-300 ${
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {status.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
            <span>{status.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#76b900]"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Owner Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-[#f1f8e9] text-[#76b900] rounded-lg">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Store Owner Details</h3>
                  <p className="text-xs text-slate-500">Manage owner contact information and profile photo</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Profile Picture Uploader */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                  <div className="relative h-24 w-24 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center group shadow-inner">
                    {profile.profilePicture ? (
                      <img src={profile.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User size={40} className="text-slate-300" />
                    )}
                  </div>
                  <div className="text-center sm:text-left space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition shadow-sm">
                      <Upload size={16} />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                        disabled={uploading} 
                      />
                    </label>
                    <p className="text-xs text-slate-400">JPG, PNG or WEBP. Max size 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owner Full Name</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={profile.fullName} 
                        onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        placeholder="Owner full name"
                      />
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={profile.dob} 
                        onChange={e => setProfile({ ...profile, dob: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                      />
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={profile.email} 
                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        placeholder="owner@domain.com"
                      />
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        value={profile.mobile} 
                        onChange={e => setProfile({ ...profile, mobile: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm" 
                        placeholder="Owner mobile number"
                      />
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-[#f1f8e9] text-[#76b900] rounded-lg">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Business Details</h3>
                  <p className="text-xs text-slate-500">Manage corporate registration, GST, PAN and compliance numbers</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* GST IN */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Registration Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={profile.gstNumber} 
                        onChange={e => setProfile({ ...profile, gstNumber: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono" 
                        placeholder="15-digit GSTIN"
                        maxLength="15"
                      />
                      <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* PAN Card */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business PAN Card</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={profile.panNumber} 
                        onChange={e => setProfile({ ...profile, panNumber: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono" 
                        placeholder="10-digit PAN"
                        maxLength="10"
                      />
                      <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* CIN Number */}
                  <div className="space-y-1.5 text-left sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corporate Identification Number (CIN)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={profile.cinNumber} 
                        onChange={e => setProfile({ ...profile, cinNumber: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm font-mono" 
                        placeholder="21-digit CIN (For Pvt. Ltd. or PLC)"
                        maxLength="21"
                      />
                      <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Business Address */}
                  <div className="space-y-1.5 text-left sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Business Address</label>
                    <div className="relative">
                      <textarea 
                        value={profile.businessAddress} 
                        onChange={e => setProfile({ ...profile, businessAddress: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm min-h-[90px]" 
                        placeholder="Complete billing and correspondence address for tax invoices"
                      />
                      <MapPin size={16} className="absolute left-3.5 top-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button 
                type="submit" 
                disabled={saving || uploading}
                className="px-8 py-3.5 bg-[#76b900] text-white font-bold rounded-xl transition shadow-lg hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </div>

          </form>
        )}

      </div>
    </AdminLayout>
  );
};

export default ManageProfile;
