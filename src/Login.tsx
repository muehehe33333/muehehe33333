import { useState } from 'react';
import { supabase } from './lib/supabase';
import { Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      setErrorMsg('Akses ditolak. Kredensial tidak valid.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center">
            <Lock size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-center mb-2 tracking-tight">HQ Access</h2>
        <p className="text-center text-slate-500 text-sm mb-8">System is locked. Authentication required.</p>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 border border-red-100 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3 rounded-md hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Unlock System'}
          </button>
        </form>
      </div>
    </div>
  );
}