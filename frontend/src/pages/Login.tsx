import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks';
import { setCredentials } from '../features/auth/authSlice';
import { apiClient } from '../api/apiClient';
import { LogIn, Eye, EyeOff, BookOpen, Warehouse, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      });

      dispatch(setCredentials({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }));

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-navy font-sans relative overflow-hidden">
      
      {/* BACKGROUND GRAPHIC (Warehouse Logistics Abstract Vector Pattern) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none hidden md:block">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="warehouse-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#F4C400" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#warehouse-grid)" />
          
          {/* Abstract Shelves & Rackings */}
          <g stroke="#F4C400" strokeWidth="2" fill="none" opacity="0.3">
            <rect x="150" y="100" width="300" height="20" rx="3" />
            <line x1="200" y1="120" x2="200" y2="400" />
            <line x1="400" y1="120" x2="400" y2="400" />
            <rect x="150" y="200" width="300" height="20" rx="3" />
            <rect x="150" y="300" width="300" height="20" rx="3" />
            
            {/* Box shapes on racks */}
            <rect x="220" y="150" width="40" height="50" fill="#F4C400" opacity="0.2" />
            <rect x="270" y="170" width="50" height="30" fill="#F4C400" opacity="0.4" />
            <rect x="330" y="140" width="50" height="60" fill="#F4C400" opacity="0.3" />
            
            <rect x="170" y="250" width="60" height="50" fill="#F4C400" opacity="0.5" />
            <rect x="240" y="260" width="40" height="40" fill="#F4C400" opacity="0.2" />
            <rect x="350" y="240" width="40" height="60" fill="#F4C400" opacity="0.4" />
          </g>
        </svg>
      </div>

      {/* LEFT PANEL: LOGIN CARD */}
      <div className="w-full md:w-[480px] bg-brand-navy p-8 md:p-12 flex flex-col justify-between border-r border-slate-800 z-10 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow opacity-10 rounded-full blur-3xl pointer-events-none"></div>

        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="bg-brand-yellow p-2.5 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Warehouse className="w-6 h-6 text-brand-navy font-bold" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">
              Book<span className="text-brand-yellow">Hive</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block -mt-1">
              Logistics & Sync
            </span>
          </div>
        </div>

        {/* CARD CONTAINER */}
        <div className="my-auto py-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-sm mt-1 mb-8">
            Access the inventory, manage orders, and sync shopify products.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-lg text-sm flex items-start gap-2.5 mb-6 animate-pulse">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition"
                  placeholder="name@bookhive.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-yellow hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-2.5 pl-10 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 bg-slate-900 border-slate-700 rounded text-brand-yellow focus:ring-offset-brand-navy"
              />
              <label htmlFor="remember" className="ml-2.5 block text-sm text-slate-300">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-yellow text-brand-navy hover:bg-brand-darkYellow transition font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="border-2 border-brand-navy border-t-transparent w-5 h-5 rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <div className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BookHive Logistics Platform. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: LARGE WAREHOUSE HIGHLIGHT HERO */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 relative bg-slate-950/40">
        <div className="z-10 text-white max-w-lg mt-auto">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-brand-yellow text-xs font-semibold mb-6">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Shopify Store Live Synchronization</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-white">
            Unified Book Inventory Management.
          </h1>
          <p className="text-slate-300 text-lg mt-4 font-normal">
            Effortlessly upload catalog spreadsheets, monitor order dispatches, manage warehouse stock alerts, and sync catalogs automatically with Shopify.
          </p>
        </div>
        
        {/* Decorative corner node */}
        <div className="absolute top-12 right-12 flex gap-4 text-xs font-mono text-slate-400 bg-brand-navy/95 border border-slate-800 p-4 rounded-lg shadow-xl">
          <div>
            <span className="block text-slate-500 font-semibold uppercase">API Gateway</span>
            <span className="text-brand-yellow">ONLINE: 200 OK</span>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="block text-slate-500 font-semibold uppercase">Shopify Queue</span>
            <span className="text-green-400">ACTIVE: 0 JOBS</span>
          </div>
        </div>
      </div>

    </div>
  );
}
