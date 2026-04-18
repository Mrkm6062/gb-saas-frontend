import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const logoUrl = "https://galibrand.cloud/public/Name.png"; // REPLACE WITH YOUR ACTUAL LOGO

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Processing...');
    
    // Change these endpoints if your authRoutes.js uses different paths
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`${isLogin ? 'Login' : 'Registration'} successful!`);
        if (data.token) {
          localStorage.setItem('token', data.token); // Save token for future requests
          
          // Call the prop function to update App.jsx's state
          onLoginSuccess(data.token, data.user?.stores || []);
        }
      } else {
        setStatus(`Error: ${data.message || 'Something went wrong'}`);
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

        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Full Name</label>
              <input 
                type="text" 
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-black"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Phone Number / Email</label>
            <input 
              type="email" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-black"
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-bold text-slate-800 mb-2">Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-black"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-[#76b900] to-[#ff8a00] text-white font-bold rounded-full hover:opacity-90 transition shadow-lg text-lg">
            {isLogin ? 'Login' : 'Create Account'}
          </button>

          {status && (
            <div className={`p-3 mt-4 text-center rounded-md text-sm font-medium ${status.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {status}
            </div>
          )}

          {isLogin && (
            <div className="text-right">
              <a href="#" className="text-sm font-semibold text-[#76b900] hover:underline">Forgot Password?</a>
            </div>
          )}

          <div className="text-center pt-4 text-slate-700">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setStatus(''); }} className="text-[#76b900] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">
              {isLogin ? 'Sign Up Now' : 'Login here'}
            </button>
          </div>
        </form>
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