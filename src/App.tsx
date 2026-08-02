import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import FinancialModule from './components/FinancialModule';
import EventRegistry from './components/EventRegistry';
import ContactDirectory from './components/ContactDirectory';
import { LayoutDashboard, Wallet, Calendar, Users, LogOut, Menu, X, Command } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'finance' | 'events' | 'network'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'finance', label: 'Financial Metrics', icon: <Wallet size={20} /> },
    { id: 'events', label: 'Event Registry', icon: <Calendar size={20} /> },
    { id: 'network', label: 'Contact Directory', icon: <Users size={20} /> }
  ];

  if (!session) return <Auth />;

  return (
    <div className="relative flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* 1. BACKDROP OVERLAY (Latar Hitam Transparan saat Sidebar Terbuka) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-900/60 z-40 transition-opacity backdrop-blur-sm lg:hidden"
        />
      )}

      {/* 2. SIDEBAR (Off-Canvas Drawer) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg text-slate-900"><Command size={20} /></div>
            <h2 className="text-xl font-black text-white tracking-tight">Personal HQ</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"><X size={20} /></button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id as any); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                activeView === item.id ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors rounded-xl text-sm font-bold">
            <LogOut size={16} /> Keluar Sistem
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        
        {/* Topbar Navigation */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shadow-sm"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-black text-lg md:text-xl text-slate-900 tracking-tight capitalize">
              {navItems.find(i => i.id === activeView)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">System Online</span>
          </div>
        </div>

        {/* Dynamic View Injection */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && <ExecutiveDashboard />}
            {activeView === 'finance' && <FinancialModule />}
            {activeView === 'events' && <EventRegistry />}
            {activeView === 'network' && <ContactDirectory />}
          </div>
        </div>
        
      </div>
    </div>
  );
}