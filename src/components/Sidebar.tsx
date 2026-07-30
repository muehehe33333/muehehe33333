import { useState } from 'react';
import { LayoutDashboard, Wallet, CalendarDays, Users, Menu, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Tambahkan "props" agar Sidebar bisa mengontrol halaman di App.tsx
export default function Sidebar({ activeView, setActiveView }: { activeView: string, setActiveView: (v: string) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: 'dashboard', name: 'Executive Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'financial', name: 'Financial Metrics', icon: <Wallet size={18} /> },
    { id: 'events', name: 'Event Registry', icon: <CalendarDays size={18} /> },
    { id: 'network', name: 'Contact Directory', icon: <Users size={18} /> },
  ];

  return (
    <div className={`bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 flex flex-col z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black text-white text-xs font-bold flex items-center justify-center">HQ</div>
            <span className="font-bold text-sm tracking-widest uppercase">System</span>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors">
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-1 px-3">
        <div className="px-3 mb-2">
          {!isCollapsed && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modules</span>}
        </div>
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex items-center gap-3 p-2.5 rounded-md transition-colors w-full text-left group ${
              activeView === item.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title={isCollapsed ? item.name : ''}
          >
            <span className={activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-black'}>{item.icon}</span>
            {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200">
        {!isCollapsed ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-slate-400 flex flex-col gap-1">
              <span>Status: <span className="text-black font-medium">Secured</span></span>
              <span>Ver: 1.0.0-beta</span>
            </div>
            <button onClick={handleLogout} className="text-xs font-bold text-red-600 hover:text-red-700 text-left transition-colors">Sign Out</button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-4 h-4 bg-red-600 rounded-full mx-auto block hover:bg-red-700" title="Sign Out"></button>
        )}
      </div>
    </div>
  );
}