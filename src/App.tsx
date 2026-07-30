import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Globe } from 'lucide-react';

// Impor semua modul terpisah di sini
import Sidebar from './components/Sidebar';
import Login from './Login';
import FinancialModule from './components/FinancialModule';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import EventRegistry from './components/EventRegistry';
import ContactDirectory from './components/ContactDirectory';

function App() {
  const [currentLang, setCurrentLang] = useState<'ID' | 'EN'>('ID');
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk melacak menu apa yang sedang aktif di Sidebar
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-sm text-slate-500">Initializing Secure Environment...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar Kontrol Navigasi */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Topbar Statis */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
          <div className="text-sm font-medium text-slate-500">
            {currentLang === 'ID' ? 'Area Kerja Utama' : 'Primary Workspace'}
          </div>
          <button onClick={() => setCurrentLang(currentLang === 'ID' ? 'EN' : 'ID')} className="flex items-center gap-2 text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <Globe size={14} /> {currentLang}
          </button>
        </header>

        {/* Area Konten Dinamis (Bisa di-scroll) */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 w-full">
          <div className="max-w-6xl mx-auto">
            
            {/* VIEW 1: DASBOR EKSEKUTIF */}
            {activeView === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <section>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Executive Dashboard</h1>
                  <p className="text-slate-500 text-sm">System operational overview and predictive analytics.</p>
                </section>
                
                {/* Memanggil file komponen ExecutiveDashboard.tsx */}
                <ExecutiveDashboard />
              </div>
            )}

            {/* VIEW 2: MODUL FINANSIAL */}
            {activeView === 'financial' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <section>
                  <h1 className="text-3xl font-black tracking-tight mb-2">Financial Metrics</h1>
                  <p className="text-slate-500 text-sm">Pencatatan arus kas harian dan penyesuaian saldo.</p>
                </section>
                
                {/* Memanggil file komponen FinancialModule.tsx */}
                <FinancialModule />
              </div>
            )}

            {/* VIEW 3: EVENT REGISTRY (JADWAL) */}
            {activeView === 'events' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <section>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Event Registry</h1>
                  <p className="text-slate-500 text-sm">Pusat komando manajemen tugas, praktikum, dan kalender akademik.</p>
                </section>
                <EventRegistry />
              </div>
            )}

            {/* VIEW 4: CONTACT DIRECTORY */}
            {activeView === 'network' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <section>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Contact Directory</h1>
                  <p className="text-slate-500 text-sm">Pusat manajemen relasi, kating, dosen, dan jejaring perantauan.</p>
                </section>
                <ContactDirectory />
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;