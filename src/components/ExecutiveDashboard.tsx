import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Activity, AlertTriangle, Target, CheckCircle2, TrendingDown, Calendar, Receipt, Lightbulb, Wallet, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

export default function ExecutiveDashboard() {
  const [balance, setBalance] = useState(0);
  const [emergencyLock, setEmergencyLock] = useState(0);
  const [ukt, setUkt] = useState({ id: '', current: 0, target: 3500000 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [urgentEvents, setUrgentEvents] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  
  const [miniChartData, setMiniChartData] = useState<any[]>([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [net7d, setNet7d] = useState({ income: 0, expense: 0, total: 0 });

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (settings) setEmergencyLock(settings.emergency_lock);
    
    const { data: uktData } = await supabase.from('financial_targets').select('*').eq('user_id', user.id).eq('type', 'ukt').single();
    if (uktData) setUkt({ id: uktData.id, current: uktData.current_amount, target: uktData.target_amount });

    const { data: trx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
    
    if (trx) {
      let runningBalance = 0;
      for (let i = 0; i < trx.length; i++) {
        if (trx[i].type === 'adjustment') { runningBalance += Number(trx[i].amount); break; } 
        else if (trx[i].type === 'income') { runningBalance += Number(trx[i].amount); } 
        else if (trx[i].type === 'expense') { runningBalance -= Number(trx[i].amount); }
      }
      setBalance(runningBalance);

      const today = new Date().toISOString().split('T')[0];
      setTodayExpense(trx.filter(t => t.type === 'expense' && t.category !== 'System' && t.transaction_date === today).reduce((sum, t) => sum + Number(t.amount), 0));

      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
      }).reverse();
      
      let sumInc7d = 0; let sumExp7d = 0;
      const chartData = last7Days.map(date => {
        const dailyExp = trx.filter(t => t.type === 'expense' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        const dailyInc = trx.filter(t => t.type === 'income' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        sumExp7d += dailyExp; sumInc7d += dailyInc;
        return { date: date.substring(8, 10), Total: dailyExp };
      });
      setMiniChartData(chartData);
      setNet7d({ income: sumInc7d, expense: sumExp7d, total: sumInc7d - sumExp7d });
    }

    const { data: events } = await supabase.from('academic_events').select('*').eq('user_id', user.id).neq('status', 'completed').order('deadline', { ascending: true });
    if (events) setUrgentEvents(events.filter(e => Math.ceil((new Date(e.deadline).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) <= 3).slice(0, 3));

    const { data: bills } = await supabase.from('recurring_bills').select('*').eq('user_id', user.id);
    if (bills) setUnpaidBills(bills.filter(b => !b.last_paid_month || (new Date(b.last_paid_month).getMonth() !== new Date().getMonth() || new Date(b.last_paid_month).getFullYear() !== new Date().getFullYear())));

    const { data: debts } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'unpaid');
    if (debts) setUnpaidDebts(debts);

    setLoading(false);
  };

  const handleLunasUKT = async () => {
    if (!window.confirm(`Proses pelunasan UKT sebesar Rp ${Number(ukt.target).toLocaleString('id-ID')}?`)) return;
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && ukt.id) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: ukt.target, description: 'Penerimaan Dana UKT', category: 'Lainnya', transaction_date: today });
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: ukt.target, description: 'Pembayaran Lunas UKT Semester', category: 'Akademik/Tugas', transaction_date: today });
      await supabase.from('financial_targets').update({ current_amount: 0 }).eq('id', ukt.id);
      fetchDashboardData();
    }
    setProcessing(false);
  };

  const disposableIncome = balance - emergencyLock;
  const dailyLimit = disposableIncome > 0 ? disposableIncome / 30 : 0;
  const uktPercentage = Math.min(100, Math.round((ukt.current / ukt.target) * 100));
  const totalPiutang = unpaidDebts.reduce((sum, d) => sum + Number(d.amount), 0);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 19 ? 'Selamat Sore' : 'Selamat Malam';
  
  let financialTip = "Kondisi finansial stabil. Lanjutkan rutinitas dengan baik."; 
  let tipColor = "text-blue-800 bg-blue-50 border-blue-100";
  if (todayExpense > dailyLimit) { financialTip = "Awas! Pengeluaran hari ini melewati batas aman harian."; tipColor = "text-rose-800 bg-rose-50 border-rose-100"; } 
  else if (todayExpense > 0 && todayExpense <= dailyLimit) { financialTip = "Pengeluaran hari ini masih dalam batas aman."; tipColor = "text-emerald-800 bg-emerald-50 border-emerald-100"; }

  // Skeleton Loading ala Material
  if (loading) return (
    <div className="space-y-6">
      <div className="h-32 bg-slate-200/50 rounded-[2rem] animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="md:col-span-2 h-48 bg-slate-200/50 rounded-[2rem] animate-pulse"></div><div className="h-48 bg-slate-200/50 rounded-[2rem] animate-pulse"></div><div className="h-48 bg-slate-200/50 rounded-[2rem] animate-pulse"></div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER & AI TIP - Material You Style */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{greeting}.</h2>
          <p className="text-slate-500 text-sm mt-1">Ringkasan harian operasional Anda.</p>
        </div>
        <div className={`px-5 py-4 border rounded-3xl flex items-start gap-3 w-full md:w-auto max-w-md transition-all shadow-sm ${tipColor}`}>
          <Lightbulb size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold leading-relaxed">{financialTip}</p>
        </div>
      </div>

      {/* METRIK UTAMA - Kartu super rounded */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Saldo (Primary Color Card) */}
        <div className="md:col-span-2 bg-blue-600 text-white p-7 rounded-[2rem] shadow-lg shadow-blue-600/20 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Total Liquid Asset</span>
              <Activity size={20} className="text-emerald-300" />
            </div>
            <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Rp {balance.toLocaleString('id-ID')}</div>
            <div className="text-xs text-blue-200 pt-4 mt-6 border-t border-blue-500/50 flex items-center gap-2">
              <ShieldAlert size={16} /> Terkunci Darurat: <span className="font-mono font-bold text-white">Rp {emergencyLock.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <Wallet size={180} className="absolute -bottom-10 -right-10 text-blue-500 opacity-30 rotate-12" />
        </div>

        {/* Disposable & Daily Limit */}
        <div className="bg-white p-7 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dana Bebas</span></div>
            <div className="text-3xl font-black text-slate-800 tracking-tight mb-1">Rp {disposableIncome.toLocaleString('id-ID')}</div>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-4">
            <div className="flex justify-between items-start mb-1"><span className={`text-[10px] font-bold uppercase tracking-wider ${dailyLimit < 20000 ? 'text-rose-500' : 'text-slate-400'}`}>Limit Harian (30H)</span></div>
            <div className={`text-xl font-black tracking-tight ${dailyLimit < 20000 ? 'text-rose-600' : 'text-blue-600'}`}>Rp {Math.floor(dailyLimit).toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Mini Chart 7 Hari */}
        <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arus Kas 7H</span>
            {net7d.total >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
          </div>
          <div className="mb-4">
            <span className={`text-lg font-black tracking-tight ${net7d.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {net7d.total >= 0 ? '+' : ''}Rp {net7d.total.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData}>
                <Bar dataKey="Total" radius={[4, 4, 0, 0]}>
                  {miniChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.Total > dailyLimit ? '#ef4444' : '#e2e8f0'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MODUL OPERASIONAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          {/* Alokasi UKT */}
          <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-xl"><Target size={20} className="text-blue-600" /></div><h3 className="font-bold text-base text-slate-800">Alokasi UKT Semester</h3></div>
              <div className="text-2xl font-black text-slate-800">{uktPercentage}%</div>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full mb-4 overflow-hidden">
              <div className="bg-blue-500 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${uktPercentage}%` }}></div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm mt-2">
              <div className="text-slate-500 font-medium">Terkumpul: <span className="font-black text-slate-800 text-base ml-1">Rp {Number(ukt.current).toLocaleString('id-ID')}</span> / Rp {Number(ukt.target).toLocaleString('id-ID')}</div>
              <button onClick={handleLunasUKT} disabled={processing} className="text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Bayar & Reset Target
              </button>
            </div>
          </div>

          {/* Radar Agenda (Kartu Material) */}
          <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-xl"><Calendar size={20} className="text-amber-600" /></div><h3 className="font-bold text-base text-slate-800">Radar Agenda (H-3)</h3></div>
              {urgentEvents.length > 0 && <span className="flex items-center gap-1.5 text-xs bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-full animate-pulse"><AlertTriangle size={14}/> PERHATIAN</span>}
            </div>
            <div className="space-y-4">
              {urgentEvents.length === 0 ? <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-2xl">Jadwal aman. Selamat beristirahat.</p> : urgentEvents.map(event => (
                <div key={event.id} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl">
                  <div>
                    <h4 className="font-bold text-base text-slate-800">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{event.type}</span>
                      <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1"><Calendar size={12}/> {event.deadline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Tagihan */}
          <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 p-7 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4"><div className="p-2 bg-emerald-50 rounded-xl"><Receipt size={20} className="text-emerald-600" /></div><h3 className="font-bold text-base text-slate-800">Status Tagihan</h3></div>
            <div className="space-y-4">
              {unpaidBills.length === 0 ? <div className="flex flex-col items-center justify-center py-6 text-emerald-600 text-center bg-emerald-50 rounded-2xl"><CheckCircle2 size={32} className="mb-2 opacity-50" /><p className="text-sm font-bold">Semua Lunas.</p></div> : unpaidBills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-3.5 bg-rose-50 rounded-2xl">
                  <div><h4 className="font-bold text-sm text-rose-900">{bill.name}</h4><p className="text-xs font-semibold text-rose-600 mt-0.5">Tgl {bill.due_date}</p></div>
                  <span className="text-sm font-black tracking-tight text-rose-700">Rp {Number(bill.amount).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Buku Kasbon */}
          <div className={`rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-7 transition-colors ${unpaidDebts.length > 0 ? 'bg-amber-100/50 border border-amber-200' : 'bg-white border border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-xl ${unpaidDebts.length > 0 ? 'bg-amber-200/50' : 'bg-slate-50'}`}><Users size={20} className={unpaidDebts.length > 0 ? 'text-amber-700' : 'text-slate-400'} /></div><h3 className={`font-bold text-base ${unpaidDebts.length > 0 ? 'text-amber-900' : 'text-slate-800'}`}>Buku Kasbon</h3></div>
            <div className={`text-3xl font-black tracking-tight mb-5 mt-3 ${unpaidDebts.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Rp {totalPiutang.toLocaleString('id-ID')}</div>
            <div className="space-y-3">
              {unpaidDebts.length === 0 ? <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-2xl text-center">Tidak ada catatan piutang aktif.</p> : unpaidDebts.map(debt => (
                <div key={debt.id} className="flex justify-between items-center bg-white/60 backdrop-blur p-3 rounded-2xl shadow-sm"><span className="text-sm font-bold text-slate-800 truncate pr-2">{debt.borrower_name}</span><span className="text-sm font-black text-amber-700 tracking-tight">Rp {Number(debt.amount).toLocaleString('id-ID')}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}