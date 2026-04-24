import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  const logoUrl = "https://galibrand.cloud/public/Name.png"; // REPLACE WITH YOUR ACTUAL LOGO

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

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans overflow-hidden text-left">
      
      {/* Left Side: Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-24 py-12">
        <div className="mb-8">
          <img src={logoUrl} alt="Galibrand Logo" className="h-16 w-auto" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          {isLogin ? 'Digital Ordering' : 'Join Us Today'} <br /> {isLogin ? 'for Local Shops' : 'Grow Your Shop'}
        </h1>
        
        <p className="text-slate-600 mb-8 max-w-md leading-relaxed">
          Launch your own online ordering system for Kirana stores, vegetable shops, 
          and local food nasta corners. Take orders and deliver locally — zero high 
          commissions. The trusted choice for grocery online ordering in India.
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-5 max-w-md animate-fadeIn">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#76b900] outline-none transition text-black"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Email Address</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#76b900] outline-none transition text-black"
                required
              />
            </div>

            <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-[#76b900] to-[#ff8a00] text-white font-bold rounded-full hover:opacity-90 transition shadow-lg text-lg">
              Get OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5 max-w-md animate-fadeIn">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Enter 6-Digit OTP</label>
              <p className="text-xs text-slate-500 mb-3">We sent a code to <span className="font-bold text-slate-800">{email}</span>. <button type="button" onClick={() => {setStep(1); setStatus('');}} className="text-[#76b900] hover:underline ml-1">Change Email</button></p>
              <input 
                type="text" 
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength="6"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#76b900] outline-none transition text-black text-center text-2xl tracking-[0.5em] font-bold"
                required
              />
            </div>

            <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-[#76b900] to-[#ff8a00] text-white font-bold rounded-full hover:opacity-90 transition shadow-lg text-lg">
              Verify & {isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>
        )}

          {status && (
            <div className={`p-3 mt-4 max-w-md text-center rounded-md text-sm font-medium ${status.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {status}
            </div>
          )}

          {step === 1 && (
            <div className="text-center pt-6 text-slate-700 max-w-md">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setStatus(''); }} className="text-[#76b900] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">
                {isLogin ? 'Sign Up Now' : 'Login here'}
              </button>
            </div>
          )}
      </div>

      {/* Right Side: Image Grid Overlay */}
      <div className="hidden md:flex w-1/2 relative bg-gradient-to-r from-[#76b900] via-[#ff8a00] to-[#76b900] bg-[length:200%_200%] animate-gradient items-center justify-center shadow-inner">
        <div className="grid grid-cols-3 gap-4 lg:gap-6 transform rotate-12 scale-125 opacity-90 w-[130%] max-w-4xl">
            {/* Row 1 */}
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#ff8a00] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Shop" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#76b900] shadow-xl translate-y-[20%]">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Market" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#ff8a00] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Groceries" className="w-full h-full object-cover" />
            </div>
            
            {/* Row 2 */}
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#76b900] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Shop" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#ff8a00] shadow-xl translate-y-[20%]">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Market" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#76b900] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Groceries" className="w-full h-full object-cover" />
            </div>

            {/* Row 3 */}
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#ff8a00] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Shop" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#76b900] shadow-xl translate-y-[20%]">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Market" className="w-full h-full object-cover" />
            </div>
            <div className="w-full aspect-square bg-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden border-4 lg:border-8 border-[#ff8a00] shadow-xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300" alt="Groceries" className="w-full h-full object-cover" />
            </div>
        </div>
      </div>
    </div>
  );
}

export default Login;