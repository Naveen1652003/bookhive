import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { Warehouse, ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSuccess('If an account exists with this email, we have sent password reset instructions.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-navy font-sans relative items-center justify-center p-6 overflow-hidden">
      
      {/* Background Graphic */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <rect width="100%" height="100%" fill="none" stroke="#F4C400" strokeWidth="0.5" strokeDasharray="10 10" />
        </svg>
      </div>

      <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-yellow p-2.5 rounded-lg flex items-center justify-center mb-4">
            <Warehouse className="w-6 h-6 text-brand-navy" />
          </div>
          <h2 className="text-xl font-bold text-white text-center">Password Recovery</h2>
          <p className="text-slate-400 text-xs mt-1.5 text-center">
            Enter your email and we'll send you recovery details.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex gap-2.5 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3.5 rounded-lg text-xs flex gap-2.5 mb-5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-brand-yellow transition"
                  placeholder="name@bookhive.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-yellow text-brand-navy hover:bg-brand-darkYellow transition font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? 'Sending...' : 'Send Instructions'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white transition font-semibold py-2.5 rounded-lg text-sm"
          >
            Return to Login
          </button>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-brand-yellow hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
