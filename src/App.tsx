import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import FinancialModule from './components/FinancialModule';
import EventRegistry from './components/EventRegistry';
import ContactDirectory from './components/ContactDirectory';
import DocumentVault from './components/DocumentVault';
import { LayoutDashboard, Wallet, Calendar, Users, FolderLock, LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setIsInitializing(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => await supabase.auth.signOut();

  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard size={22} /> },
    { id: 'finance', label: 'Keuangan', icon: <Wallet size={22} /> },
    { id: 'events', label: 'Agenda', icon: <Calendar size={22} /> },
    { id: 'network', label: 'Relasi', icon: <Users size={22} /> },
    { id: 'docs', label: 'Dokumen', icon: <FolderLock size={22} /> }
  ];

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FA]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="bg-blue-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-white text-2xl shadow-lg mb-4">HQ</div>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 flex">
      
      {/* SIDEBAR UNTUK DESKTOP */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 bg-white border-r border-slate-100 z-50 py-6 px-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-10 px-4">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md">HQ</div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-tight">Personal HQ</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Sistem Aktif</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                activeView === item.id 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-colors text-sm font-bold mt-auto">
          <LogOut size={20} /> Keluar Sistem
        </button>
      </aside>

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 md:ml-72 pb-24 md:pb-8 min-h-screen w-full relative">
        
        {/* Header Mobile */}
        <header className="md:hidden bg-white/80 backdrop-blur-xl sticky top-0 px-5 py-4 flex justify-between items-center z-40 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-sm">HQ</div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">Personal HQ</h1>
          </div>
          <button onClick={handleLogout} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500">
            <LogOut size={18}/>
          </button>
        </header>

        {/* Dynamic View */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          {activeView === 'dashboard' && <ExecutiveDashboard />}
          {activeView === 'finance' && <FinancialModule />}
          {activeView === 'events' && <EventRegistry />}
          {activeView === 'network' && <ContactDirectory />}
          {activeView === 'docs' && <DocumentVault />}
        </div>
      </main>

      {/* BOTTOM NAVIGATION UNTUK MOBILE */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-100 flex justify-around items-center h-16 sm:h-20 z-50 px-2 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all relative`}
          >
            <div className={`px-4 py-1 rounded-full transition-all duration-300 ${activeView === item.id ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] ${activeView === item.id ? 'font-bold text-blue-700' : 'font-medium text-slate-500'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}