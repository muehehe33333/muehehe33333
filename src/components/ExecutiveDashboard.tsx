import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Activity, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [balance, setBalance] = useState(0);
  const [emergencyLock, setEmergencyLock] = useState(0);
  const [ukt, setUkt] = useState({ id: '', current: 0, target: 3500000 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (settings) setEmergencyLock(settings.emergency_lock);

    const { data: uktData } = await supabase.from('financial_targets').select('*').eq('user_id', user.id).eq('type', 'ukt').single();
    if (uktData) setUkt({ id: uktData.id, current: uktData.current_amount, target: uktData.target_amount });

    const { data: trx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: true });
    
    if (trx) {
      let currentBal = 0;
      const lastAdj = trx.filter(t => t.type === 'adjustment').pop();
      if (lastAdj) {
        let balAfterAdj = Number(lastAdj.amount);
        const dateAfter = new Date(lastAdj.transaction_date);
        trx.forEach(t => {
          if (new Date(t.transaction_date) > dateAfter) {
            if (t.type === 'income') balAfterAdj += Number(t.amount);
            if (t.type === 'expense') balAfterAdj -= Number(t.amount);
          }
        });
        currentBal = balAfterAdj;
      } else {
        trx.forEach(t => {
          if (t.type === 'income') currentBal += Number(t.amount);
          if (t.type === 'expense') currentBal -= Number(t.amount);
        });
      }
      setBalance(currentBal);
    }
    setLoading(false);
  };

  // FITUR: Pelunasan UKT Sekali Klik
  const handleLunasUKT = async () => {
    if (!window.confirm("Apakah Anda yakin UKT sudah dibayar lunas? Ini akan mencatat uang masuk 3,5jt dan pengeluaran 3,5jt secara otomatis.")) return;
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && ukt.id) {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Suntik Uang Masuk
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: ukt.target, description: 'Penerimaan Dana UKT', category: 'Lainnya', transaction_date: today });
      // 2. Suntik Pengeluaran (Bayar UKT)
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: ukt.target, description: 'Pembayaran Lunas UKT Semester', category: 'Akademik/Tugas', transaction_date: today });
      // 3. Reset Target UKT kembali ke 0
      await supabase.from('financial_targets').update({ current_amount: 0 }).eq('id', ukt.id);
      
      fetchDashboardData();
    }
    setProcessing(false);
  };

  // LOGIKA BARU: Asumsi Uang Masuk Tidak Stabil (Selalu bagi dengan ketahanan 30 Hari ke depan)
  const disposableIncome = balance - emergencyLock;
  const dailyLimit = disposableIncome > 0 ? disposableIncome / 30 : 0;
  const uktPercentage = Math.min(100, Math.round((ukt.current / ukt.target) * 100));

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl"></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Kartu Status Eksekutif */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Liquid Asset</span>
            <Activity size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black mb-1">Rp {balance.toLocaleString('id-ID')}</div>
          <div className="text-xs text-slate-400 border-t border-slate-700 pt-3 mt-3 flex justify-between">
            <span>Emergency Lock:</span>
            <span className="font-mono text-red-400">- Rp {emergencyLock.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disposable Income</span>
            <ShieldAlert size={18} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">Rp {disposableIncome.toLocaleString('id-ID')}</div>
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3">Dana bebas (Siap pakai / di luar darurat).</div>
        </div>

        <div className={`p-6 border rounded-xl shadow-sm ${dailyLimit < 20000 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start mb-4">
            <span className={`text-xs font-bold uppercase tracking-wider ${dailyLimit < 20000 ? 'text-red-700' : 'text-slate-500'}`}>30-Day Safe Limit</span>
            <AlertTriangle size={18} className={dailyLimit < 20000 ? 'text-red-600' : 'text-yellow-500'} />
          </div>
          <div className={`text-3xl font-black mb-1 ${dailyLimit < 20000 ? 'text-red-700' : 'text-slate-900'}`}>
            Rp {Math.floor(dailyLimit).toLocaleString('id-ID')}
          </div>
          <div className={`text-xs border-t pt-3 mt-3 ${dailyLimit < 20000 ? 'text-red-600 border-red-200' : 'text-slate-500 border-slate-100'}`}>
            Batas pengeluaran harian agar uang bertahan 1 bulan ke depan.
          </div>
        </div>
      </div>

      {/* Panel UKT */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-slate-400" />
            <h3 className="font-bold text-lg">Status Alokasi UKT Semester</h3>
          </div>
          <div className="text-2xl font-black">{uktPercentage}%</div>
        </div>
        
        <div className="w-full bg-slate-100 h-4 rounded-full mb-4 overflow-hidden">
          <div className="bg-slate-900 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${uktPercentage}%` }}></div>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="text-slate-500">
            Terkumpul: <span className="font-bold text-slate-900">Rp {Number(ukt.current).toLocaleString('id-ID')}</span> / Rp {Number(ukt.target).toLocaleString('id-ID')}
          </div>
          
          <button 
            onClick={handleLunasUKT}
            disabled={processing}
            className="text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-md transition-colors flex items-center gap-2"
          >
            <CheckCircle2 size={14} /> Tandai Lunas (Auto-Input)
          </button>
        </div>
      </div>
    </div>
  );
}