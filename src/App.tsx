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
  const [isInitializing, setIsInitializing] = useState(true); // State baru untuk Splash Screen
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    // Cek sesi saat awal muat
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false); // Matikan loading setelah selesai ngecek
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

  // UI SPLASH SCREEN (Mencegah Flashing Layar Login)
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-slate-900 text-2xl shadow-inner mb-4 rotate-12">HQ</div>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Memuat Sistem...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* TOP HEADER */}
      <header className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 w-9 h-9 rounded-full flex items-center justify-center font-black text-slate-900 text-sm shadow-inner">HQ</div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-tight">Personal HQ</h1>
            <p className="text-[10px] text-emerald-400 font-medium">Sistem Operasional Aktif</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 bg-slate-800 text-slate-300 rounded-full hover:bg-red-500 hover:text-white transition-colors">
          <LogOut size={16}/>
        </button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 md:px-8">
        <div className="max-w-xl mx-auto h-full">
          {activeView === 'dashboard' && <ExecutiveDashboard />}
          {activeView === 'finance' && <FinancialModule />}
          {activeView === 'events' && <EventRegistry />}
          {activeView === 'network' && <ContactDirectory />}
          {activeView === 'docs' && <DocumentVault />}
        </div>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 sm:h-20 z-50 px-2 shadow-[0_-10px_20px_-5px_rgb(0,0,0,0.05)] pb-safe-area">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${activeView === item.id ? 'text-emerald-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {item.icon}
            <span className={`text-[10px] ${activeView === item.id ? 'font-black' : 'font-semibold'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}