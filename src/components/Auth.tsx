import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Command, ShieldCheck } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ 
          text: 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.', 
          type: 'success' 
        });
      }
    } catch (error: any) {
      setMessage({ 
        text: error.message === 'Invalid login credentials' 
          ? 'Email atau password salah.' 
          : error.message, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-emerald-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Login */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-emerald-500 p-3 rounded-xl shadow-lg mb-4">
              <Command size={28} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Personal HQ</h1>
            <p className="text-slate-400 text-sm mt-2">Pusat Manajemen</p>
          </div>
          {/* Ornamen Latar */}
          <ShieldCheck size={120} className="absolute -bottom-10 -right-10 text-slate-800 opacity-50 rotate-12" />
        </div>

        {/* Form Login */}
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-5">
            {message.text && (
              <div className={`p-3 rounded-lg text-xs font-bold ${
                message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isLogin ? 'Masuk ke Sistem' : 'Daftar Akun Baru'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setMessage({ text: '', type: '' }); }}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
            >
              {isLogin ? 'Belum punya akses? Daftar di sini.' : 'Sudah punya akses? Masuk di sini.'}
            </button>
          </div>
        </div>

      </div>
      
      <p className="mt-8 text-xs text-slate-400 font-medium">
        Secure Access • Internal Network Only
      </p>
    </div>
  );
}