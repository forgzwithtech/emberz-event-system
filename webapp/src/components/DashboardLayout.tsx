import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('emberz_admin_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      
      {/* Global Ambient Glows (Subtle) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emberz-cyan/5 rounded-full blur-[120px] pointer-events-none fixed" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emberz-pink/5 rounded-full blur-[150px] pointer-events-none fixed" />

      {/* Top Navigation Bar (Glassmorphic) */}
      <nav className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl px-6 py-4 flex justify-between items-center shadow-lg">
        
        {/* Brand Header */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <ShieldCheck className="text-emberz-cyan group-hover:scale-110 transition-transform" size={24} />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight uppercase leading-none text-gray-100">
              Gigat World
            </h1>
            <span className="text-[0.6rem] font-medium tracking-[0.2em] text-gray-500 uppercase mt-1">
              Event Services Portal
            </span>
          </div>
        </div>

        {/* Action Right */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-white transition-colors border border-white/5 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
        >
          <LogOut size={14} />
          Disconnect
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Global Footer Watermark */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20 py-6 mt-auto">
        <div className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity duration-500">
          <span className="text-[0.5rem] font-medium text-gray-500 uppercase tracking-[0.2em] mb-1">
            Engineered By
          </span>
          <div className="flex flex-col items-center">
            <span className="text-xl font-light tracking-tighter text-white lowercase leading-none">
              emberz
            </span>
            <span className="text-[0.45rem] font-bold tracking-[0.4em] text-emberz-cyan uppercase mt-0 ml-1">
              technology
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}