import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!pin) {
      setError('System PIN is required.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { pin });
      localStorage.setItem('emberz_admin_token', response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data || 'Authentication failed. Please verify PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans px-4">
      
      {/* Signature Liquid Glass Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emberz-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emberz-pink/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* Main App Branding: Gigat World */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">
            <ShieldCheck size={14} className="text-emberz-cyan" />
            <span className="text-[0.65rem] font-semibold text-gray-300 uppercase tracking-widest">
              Secure Access Node
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white uppercase">
            Gigat World
          </h1>
          <p className="text-gray-400 tracking-[0.2em] uppercase text-xs sm:text-sm mt-3 font-medium">
            Event Services Portal
          </p>
        </div>

        {/* The Liquid Glass Login Card */}
        <div className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-gray-500 group-focus-within:text-emberz-cyan transition-colors duration-300" size={18} />
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 font-mono tracking-widest text-lg focus:outline-none focus:border-emberz-cyan/50 focus:ring-1 focus:ring-emberz-cyan/50 transition-all shadow-inner"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="text-emberz-pink text-sm font-medium bg-emberz-pink/10 p-3 rounded-xl border border-emberz-pink/20 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 px-4 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? 'Authenticating...' : 'Authorize Access'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>

        {/* Engineered By Emberz Technology (Subtle Watermark) */}
        <div className="mt-12 flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity duration-500 cursor-default">
          <span className="text-[0.55rem] font-medium text-gray-500 uppercase tracking-[0.2em] mb-1">
            Engineered By
          </span>
          <div className="flex flex-col items-center">
            {/* Font weight reduced to font-light for that sleek, thin look */}
            <span className="text-2xl font-light tracking-tighter text-white lowercase">
              emberz
            </span>
            <span className="text-[0.5rem] font-bold tracking-[0.4em] text-emberz-cyan uppercase mt-[-2px] ml-1">
              technology
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}