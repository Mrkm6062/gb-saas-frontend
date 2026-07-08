import React, { useState, useEffect } from 'react';
import PlatformFooter from '../components/PlatformFooter';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState({ mainLogoUrl: "https://storage.googleapis.com/galibrand/superadmin/products/galibrandfullname-logo.png", loginImageGrid: [] });
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/store-owner/auth/google/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.clientId) {
            setGoogleClientId(data.clientId);
          }
        }
      } catch (e) {
        console.error("Failed to load Google OAuth config:", e);
      }
    };
    fetchGoogleConfig();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/platform-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.mainLogoUrl || data.loginImageGrid?.length > 0) {
            setSettings(data);
            
            // Preload images so they appear instantly without grey boxes
            const gridImages = (data.loginImageGrid || []).filter(img => img !== "");
            if (gridImages.length > 0) {
              let loadedCount = 0;
              gridImages.forEach(src => {
                const img = new Image();
                img.src = src;
                img.onload = img.onerror = () => {
                  loadedCount++;
                  if (loadedCount === gridImages.length) {
                    setImagesPreloaded(true);
                  }
                };
              });
            } else {
              setImagesPreloaded(true);
            }
          } else {
            setImagesPreloaded(true);
          }
        } else {
          setImagesPreloaded(true);
        }
      } catch (e) {
        setImagesPreloaded(true);
      }
    };
    fetchSettings();
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setStatus('Sending OTP...');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, isLogin })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('OTP sent to your email!');
        setStep(2); // Move to OTP verification step
      } else {
        setStatus(`Error: ${data.message || 'Failed to send OTP'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setStatus('Verifying...');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`${isLogin ? 'Login' : 'Registration'} successful!`);
        if (data.token) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.token, data.user?.stores || []);
        }
      } else {
        setStatus(`Error: ${data.message || 'Invalid OTP'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setStatus('Verifying Google account...');
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/store-owner/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('Authentication successful!');
        if (data.token) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.token, data.user?.stores || []);
        }
      } else {
        setStatus(`Error: ${data.message || 'Google Login failed'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleGoogleError = () => {
    setStatus('Error: Google Login initialization failed.');
  };

  const loginLayout = (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f8e9] via-white to-[#fff8e1] flex flex-col font-sans overflow-hidden text-left">
      <div className="flex-1 flex flex-col md:flex-row w-full h-full">
        {/* Left Side: Logo and Text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-20 lg:px-24 pt-12 pb-4 md:py-12 bg-transparent">
          <div className="mb-6 md:mb-8">
            <img src={settings.mainLogoUrl} alt="Galibrand Logo" className="h-16 w-auto" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 md:mb-6 leading-tight tracking-tight">
            {isLogin ? 'Digital Ordering' : 'Join Us Today'} <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76b900] to-[#ff8a00]">
              {isLogin ? 'for Local Shops' : 'Grow Your Shop'}
            </span>
          </h1>
          
          <p className="text-slate-600 mb-4 md:mb-8 max-w-md leading-relaxed text-sm md:text-base">
            Launch your own online ordering system for Kirana stores, vegetable shops, 
            and local food nasta corners. Take orders and deliver locally — zero high 
            commissions. The trusted choice for grocery online ordering in India.
          </p>
        </div>

        {/* Right Side: Login & Registration Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-20 lg:px-24 pt-4 pb-12 md:py-12 bg-white/40 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-200/50">
          <div className="w-full max-w-md mx-auto space-y-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-slate-800">
                {isLogin ? 'Welcome Back' : 'Create Owner Account'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isLogin ? 'Verify your email to manage your store' : 'Enter your details to register as store owner'}
              </p>
            </div>

            {step === 1 ? (
              <>
                <form onSubmit={handleSendOtp} className="space-y-5 animate-fadeIn">
                  {!isLogin && (
                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#76b900] focus:ring-2 focus:ring-[#76b900]/20 transition bg-white text-sm text-black"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#76b900] focus:ring-2 focus:ring-[#76b900]/20 transition bg-white text-sm text-black"
                      required
                    />
                  </div>

                  <button type="submit" className="w-full py-3.5 px-4 bg-gradient-to-r from-[#76b900] to-[#ff8a00] text-white font-bold rounded-xl hover:opacity-95 transition shadow-md shadow-green-100 text-sm">
                    Send OTP Code
                  </button>
                </form>

                <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Or continue with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  <div className="flex justify-center w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text={isLogin ? "signin_with" : "signup_with"}
                      shape="pill"
                      theme="outline"
                      width="100%"
                    />
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fadeIn">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Enter 6-Digit OTP</label>
                  <p className="text-xs text-slate-500">
                    We sent a code to <span className="font-bold text-slate-800">{email}</span>. 
                    <button type="button" onClick={() => {setStep(1); setStatus('');}} className="text-[#76b900] hover:underline ml-1 font-bold">Change Email</button>
                  </p>
                  <input 
                    type="text" 
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength="6"
                    className="w-full px-4 py-3 border border-slate-200 focus:outline-none focus:border-[#76b900] rounded-xl transition bg-white text-black text-center text-2xl tracking-[0.5em] font-bold"
                    required
                  />
                </div>

                <button type="submit" className="w-full py-3.5 px-4 bg-gradient-to-r from-[#76b900] to-[#ff8a00] text-white font-bold rounded-xl hover:opacity-95 transition shadow-md shadow-green-100 text-sm">
                  Verify & {isLogin ? 'Login' : 'Create Account'}
                </button>
              </form>
            )}

            {status && (
              <div className={`p-3 text-center rounded-xl text-xs font-bold ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {status}
              </div>
            )}

            {step === 1 && (
              <div className="text-center pt-2 text-sm text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button type="button" onClick={() => { setIsLogin(!isLogin); setStatus(''); }} className="text-[#76b900] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">
                  {isLogin ? 'Sign Up Now' : 'Login here'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <PlatformFooter />
    </div>
  );

  const activeClientId = googleClientId || "445781559811-dummygoogleclientidplaceholder.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={activeClientId}>
      {loginLayout}
    </GoogleOAuthProvider>
  );
}

export default Login;